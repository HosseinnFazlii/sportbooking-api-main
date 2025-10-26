import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export const ormConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'psql_admin',
  password: process.env.DB_PASS || 'Yc5cvHKqN8Uoa7U',
  database: process.env.DB_NAME || 'SportBooking',

  // In dev with `yarn start:dev`, we are running from src/, not dist/.
  // So point to the .ts entity files.
  entities: [__dirname + '/../entities/**/*.{ts,js}'],

  // If entities change a lot and you want Nest to handle them automatically:
  // autoLoadEntities: true,

  synchronize: false, // don't auto-drop data in production
  logging: true,

  // This "options: { encrypt: false }" is mainly for MSSQL/Azure, not Postgres.
  // It's safe to remove for Postgres.
};
