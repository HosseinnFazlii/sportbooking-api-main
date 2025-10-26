# Support — SportBooking API

This repository is for internal Rismun development.

## How to Get Help
- **Usage / Dev questions:** internal Slack `#sportbooking-api`
- **Bugs / Features:** open an issue in this repo (use templates)
- **Security:** see `SECURITY.md`

## Quick Commands
- Start via Docker Compose (recommended):
  - `npm run compose:fresh` — wipe DB volume, rebuild, apply migrations
  - `npm run compose:update` — keep DB, rebuild API, apply new migrations
- Local dev without Docker:
  - `npm run db:migrate` then `npm run start:dev`

## Common Troubleshooting
- **DB not ready:** wait for health‑check (or run `docker compose ps`); logs: `docker logs psql-db`
- **Migrations failed:** see `dist/scripts/run-sql-migrations.js` logs; check SQL syntax; ensure idempotency
- **Port in use:** change `PORT` in `.env.docker` or stop conflicting process
- **Swagger missing:** app not started; check `docker logs api-server` or `npm run start:dev` output
