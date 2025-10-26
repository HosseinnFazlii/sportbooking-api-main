import 'dotenv/config';
import { Client } from 'pg';
import { readdirSync, readFileSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

const MIGRATIONS_DIR = resolve(process.cwd(), 'db', 'migrations'); // works in dev & Docker
const TABLE = 'app_sql_migrations';

function checksum(sql: string) {
  return createHash('sha256').update(sql).digest('hex');
}

async function ensureTable(client: Client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${TABLE} (
      id serial PRIMARY KEY,
      filename text UNIQUE NOT NULL,
      applied_at timestamptz NOT NULL DEFAULT now(),
      checksum text NOT NULL
    );
  `);
}

async function run() {
  const config = {
    host: process.env.DB_HOST || process.env.PGHOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || process.env.PGPORT || 5432),
    user: process.env.DB_USER || process.env.PGUSER || 'psql_admin',
    password: process.env.DB_PASS || process.env.PGPASSWORD || 'SOME_PASSWORD',
    database: process.env.DB_NAME || process.env.PGDATABASE || 'SportBooking',
    ssl: /^(1|true|require)$/i.test(String(process.env.DB_SSL || 'false'))
      ? { rejectUnauthorized: false }
      : undefined,
  };

  const client = new Client(config as any);
  await client.connect();

  try {
    await ensureTable(client);

    const files = readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.toLowerCase().endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

    for (const file of files) {
      const { rows } = await client.query('SELECT 1 FROM ' + TABLE + ' WHERE filename = $1', [file]);
      if (rows.length) {
        // Already applied; optionally verify checksum
        continue;
      }

      const fullPath = join(MIGRATIONS_DIR, file);
      const sql = readFileSync(fullPath, 'utf8');
      const sum = checksum(sql);

      console.log(`\n>> Applying migration: ${file}`);
      await client.query('BEGIN');
      try {
        // one query call can contain multiple statements
        await client.query(sql);
        await client.query('INSERT INTO ' + TABLE + ' (filename, checksum) VALUES ($1, $2)', [file, sum]);
        await client.query('COMMIT');
        console.log(`✅ Applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Failed: ${file}`, err);
        process.exitCode = 1;
        break;
      }
    }
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
