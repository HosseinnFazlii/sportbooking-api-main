# Contributing — SportBooking (API Server)

Thanks for helping build SportBooking! This document describes how we work on the **API server** and how it fits the multi‑repo setup.

- API server (NestJS): https://github.com/rismun-com/sportbooking-api
- Web client (Next.js): https://github.com/rismun-com/sportbooking-web
- Meta (docs/blueprints/specs): https://github.com/rismun-com/sportbooking-meta

> **License note:** This project is proprietary (Rismun Internal Use). See `LICENSE`.
> Contributors must be Rismun employees or authorized contractors.

---

## 1) Ground Rules

- Be kind and pragmatic. Prefer clarity over cleverness.
- Default to **SQL‑first** schema changes and **DB‑level invariants**.
- Maintain **backward compatibility** on APIs whenever possible.
- Keep secrets out of the repo; use `.env`/secrets managers.
- Follow **Conventional Commits** and our **PR checklist** below.

---

## 2) Branching & Commits

- **Default branch:** `main`
- Use short‑lived feature branches from `main`:
  - `feat/<short-topic>`, `fix/<short-topic>`, `chore/<short-topic>`
- **Conventional Commits**:
  - `feat: add teacher availability endpoint`
  - `fix: prevent negative qty in booking line`
  - `chore: bump typeorm to 0.3.26`
  - `docs: add API examples for /booking`
  - `test: cover enforce_place_capacity trigger`

---

## 3) PR Checklist

Before opening a PR:

- [ ] Feature or fix has **unit/E2E tests** when meaningful.
- [ ] **SQL migration** (if schema or function/trigger changed).
- [ ] **Swagger** docs for new endpoints (DTOs annotated).
- [ ] **Validation** in DTOs + **authorization** (RBAC/scoping).
- [ ] No plaintext secrets; `.env` sample updated if needed.
- [ ] **Idempotency** & error handling for write endpoints.
- [ ] Ran `npm run lint` & `npm run format`.

PR template (summary):

- Context / Problem
- Approach (incl. DB invariants)
- Impact (migrations, breaking changes)
- Testing (unit/E2E, manual)
- Screenshots (if relevant to docs)

---

## 4) Local Development

```bash
# Install deps
npm install

# Start via Docker Compose (recommended)
npm run compose:fresh     # wipe DB volume, rebuild, run all migrations
# or
npm run compose:update    # keep DB, rebuild API, run only new migrations

# Start in watch mode (no Docker)
npm run db:migrate        # apply SQL migrations using local .env
npm run start:dev

# Swagger docs
open http://localhost:3030/docs
```

**Environment files**

* `.env` (local dev without Docker)
* `.env.docker` (used by API container)

---

## 5) Project Structure (API)

```
db/
  migrations/             # *.sql (ordered, idempotent)
src/
  api/                    # modules by bounded context (auth/user/facility/…)
  common/                 # BaseService/BaseController, helpers
  config/                 # ormconfig, optional SSL
  entities/               # TypeORM entities and view-entities
  scripts/                # run-sql-migrations.ts
  app/app.module.ts
Dockerfile
docker-compose.yml
```

---

## 6) Database & Migrations

* **SQL‑first**: create a new file under `db/migrations` with a numeric prefix:

  * `004_add_facility_closures.sql`
* Migrations must be **idempotent** (use `CREATE IF NOT EXISTS`, check existence of triggers/constraints).
* The migration runner (`src/scripts/run-sql-migrations.ts`) records applied files in `app_sql_migrations` and skips them on subsequent runs.
* Put **business rules** in SQL (range types, exclusion constraints, triggers/functions). Application code should **assume** the DB enforces critical invariants.

**Workflow**

1. Author SQL file.
2. Create/adjust TypeORM entities (read models only; not used for migrations).
3. Add/adjust services/controllers, DTO validations, Swagger annotations.
4. Run migrations locally / via Compose.

---

## 7) Coding Standards

* **TypeScript**: keep types explicit; avoid `any`.
* **Validation**: DTOs with `class-validator`; always validate inputs.
* **Auth**: JWT via `Authorization: Bearer`; mark public routes with `@Public()`.
* **RBAC**: use `BaseService` helpers (`isAdmin()`, facility/teacher scoping) and per‑controller permission arrays (if configured).
* **Transactions**: For multi‑write flows, use a transaction and set `SET LOCAL app.user_id = :id` to attribute audit triggers.
* **Logging**: Use the Log service/types for system events; avoid console noise in production.

---

## 8) Testing

* **Unit** (`jest`): pure logic, service methods with mocked repos.
* **E2E** (`@nestjs/testing` + `supertest`): critical endpoints (auth, booking create/confirm/cancel).
* Seed test data with SQL fixtures only when necessary.
* Verify **DB invariants** (overlap prevention, capacity, eligibility) with failing/success paths.

---

## 9) Security

* Validate every input. Sanitize user‑visible strings where relevant.
* Rate limit auth/OTP/booking routes at the API gateway (if present).
* Enforce **idempotency** on write endpoints.
* Keep DB users least‑privileged per environment.
* Never log secrets or full card numbers; mask PII where possible.

---

## 10) Releases

* Tag releases on `main` (e.g., `api-v0.1.0`).
* Provide a short CHANGELOG in the PR/Release notes.
* Deployment uses Docker image `rismun/sportbooking/api-server:latest` by default; pin tags for staging/prod as needed.

---

## 11) Cross‑Repo Notes

* **Web client** consumes this API; coordinate breaking changes.
* **Meta repo** hosts blueprints & specs. Keep it updated when you change data flow or invariants.
* Shared types (if any) should be duplicated explicitly or moved to a small `shared` package later—avoid deep coupling.

---

## 12) License

This project is proprietary. See `LICENSE` (Rismun Internal Use License).