# SportBooking — API Server (NestJS + PostgreSQL)

> **Repos**
>
> * **API** (this repo): [https://github.com/rismun-com/sportbooking-api](https://github.com/rismun-com/sportbooking-api)
> * **Web Client** (Next.js): [https://github.com/rismun-com/sportbooking-web](https://github.com/rismun-com/sportbooking-web)
> * **Project Meta** (blueprints/specs): [https://github.com/rismun-com/sportbooking-meta](https://github.com/rismun-com/sportbooking-meta)

This service powers facilities, places, teachers, courses, tournaments, and booking flows. **Critical invariants** (like “no double booking”, capacity limits, and teacher/course eligibility) are enforced in **PostgreSQL** via range types, exclusion constraints, and triggers/functions for reliability under concurrency.&#x20;

---

## Table of Contents

* [Highlights](#highlights)
* [Architecture](#architecture)
* [Tech Stack](#tech-stack)
* [Directory Structure](#directory-structure)
* [Environment](#environment)
* [Quick Start (Docker Compose)](#quick-start-docker-compose)
* [Alternative: Docker CLI](#alternative-docker-cli)
* [Local Development (no Docker)](#local-development-no-docker)
* [Database & Migrations](#database--migrations)
* [API Surface (high-level)](#api-surface-high-level)
* [Operational Notes](#operational-notes)
* [Contributing](#contributing)
* [License (Rismun Internal Use)](#license-rismun-internal-use)

---

## Highlights

* **NestJS 11 + TypeORM 0.3** with **Swagger** (`/docs`) and DTO validation.
* **SQL‑first migrations** (`db/migrations/*.sql`) applied on startup; tracked in `app_sql_migrations`.
* **Hard DB guarantees**:

  * **Overlap prevention** using `tstzrange` and GiST exclusion constraints (teacher & place).&#x20;
  * **Capacity limits** enforced by `enforce_place_capacity()` trigger.&#x20;
  * **Teacher/course eligibility** checks (city match, working hours, course linking & deadlines).&#x20;
  * Booking “activeness” via `booking_is_active(...)`.&#x20;
  * Tournament helpers: `generate_initial_matches()`, `recompute_standings()`.&#x20;
* **RBAC** (roles, permissions, role↔menu, user↔role).
* **Uploads**: simple image upload (Multer, local disk) + image CRUD for Courses/Tournaments.
* **Views & lookups**: read‑only views endpoints (vBooking/vCourse/vTournament/vUser/vFacility) and metadata lists (booking statuses, tournament types, registration statuses).

---

## Architecture

* **API**: NestJS modules by bounded context (auth, user, facility, teacher, sport, course, tournament, booking, role/permission/menu, log, views, meta, upload).
* **DB**: normalized schema (countries/states/cities, sports, booking statuses/types, etc.), business logic placed in **SQL functions & triggers**.&#x20;
* **Migrations**: plain SQL files executed exactly once in order on startup; all DDL stays close to Postgres features.

---

## Tech Stack

* **Runtime**: Node 20, NestJS 11, TypeScript 5
* **Storage**: PostgreSQL 15 (extensions: `btree_gist`, `citext`, etc.)&#x20;
* **ORM**: TypeORM 0.3 (entities/views only; migrations are SQL-first)
* **Auth**: JWT (password + OTP flows)
* **Docs**: Swagger at `/docs`
* **Container**: Docker / Docker Compose

---

## Directory Structure

```
sportbooking-api/
├─ db/
│  └─ migrations/                 # 001_structure.sql, 002_seed.sql, 003_*.sql ...
├─ src/
│  ├─ api/
│  │  ├─ auth/                    # login/register/otp, JWT, guards
│  │  ├─ user/                    # users
│  │  ├─ facility/                # facilities, places, working-hours, staff
│  │  ├─ teacher/                 # profiles, sports, cities, working-hours, availability
│  │  ├─ sport/                   # sports
│  │  ├─ course/                  # courses, sessions, images
│  │  ├─ tournament/              # registrations, matches, standings, images
│  │  ├─ booking/                 # holds, lines, confirm/cancel, reprice
│  │  ├─ role/ permission/ menu/  # RBAC + menu tree
│  │  ├─ log/                     # log + log types + vLog
│  │  ├─ views/                   # vBooking, vCourse, vTournament, vUser, vFacility (read-only)
│  │  └─ upload/                  # image upload (local disk)
│  ├─ common/                     # BaseService / BaseController, global connection
│  ├─ config/                     # ormconfig, SSL (optional)
│  ├─ entities/                   # TypeORM entities + view entities
│  ├─ scripts/                    # run-sql-migrations.ts (SQL runner)
│  └─ app/app.module.ts
├─ Dockerfile
├─ docker-compose.yml
├─ package.json
└─ README.md
```

---

## Environment

Create **`.env.docker`** for containers:

```env
PORT=3030
UPLOAD_DIR=/home/node/uploads

DB_HOST=db
DB_PORT=5432
DB_USER=psql_admin
DB_PASS=SOME_PASSWORD
DB_NAME=SportBooking
DB_SSL=false

JWT_SECRET=dev_secret_change_me
JWT_EXPIRES_IN=86400s
```

For local development (no Docker), create `.env` with `DB_HOST=127.0.0.1`.

---

## Quick Start (Docker Compose)

> Requires Docker 24+ and Compose V2.

```bash
# fresh (wipes DB volume, rebuilds API, applies all SQL migrations)
npm run compose:fresh

# update code only (keeps DB; applies only new migrations on start)
npm run compose:update

# open API docs
open http://localhost:3030/docs
```

The Compose file creates:

* **db** (Postgres 15‑alpine) with health‑check
* **api** (builds your Dockerfile; runs migrations on container start, then boots Nest)
* **adminer** (optional SQL UI at [http://localhost:8080](http://localhost:8080))

---

## Alternative: Docker CLI

Pinned Postgres, named volume, health‑check, and an idempotent flow:

```bash
docker pull postgres:15-alpine
docker network create localnet || true
docker rm -f psql-db 2>/dev/null || true
docker volume create sportbooking_pgdata >/dev/null
docker run -d --name psql-db --network localnet \
  -e POSTGRES_USER=psql_admin -e POSTGRES_PASSWORD=SOME_PASSWORD -e POSTGRES_DB=SportBooking \
  -p 5432:5432 --restart unless-stopped \
  --health-cmd="pg_isready -U psql_admin -d SportBooking || exit 1" \
  --health-interval=5s --health-timeout=5s --health-retries=20 \
  -v sportbooking_pgdata:/var/lib/postgresql/data postgres:15-alpine

# wait for DB then build & run API (applies migrations on start)
until [ "$(docker inspect -f '{{json .State.Health.Status}}' psql-db)" = "\"healthy\"" ]; do echo "Waiting for DB..."; sleep 2; done
npm run docker:build-image
docker rm -f api-server 2>/dev/null || true
docker run -d --name api-server --network localnet -p 3030:3030 --env-file .env.docker --restart unless-stopped rismun/sportbooking/api-server:latest
```

---

## Local Development (no Docker)

```bash
# 1) Install deps
npm install

# 2) Start Postgres (local) and create .env with DB_* values
# 3) Run SQL migrations (dev mode)
npm run db:migrate

# 4) Start Nest (watch mode)
npm run start:dev

# 5) Open Swagger
open http://localhost:3030/docs
```

> The **SQL migration runner** is at `src/scripts/run-sql-migrations.ts` and records each file in `app_sql_migrations`. New `.sql` files under `db/migrations/` are applied once, then skipped on future runs.&#x20;

---

## Database & Migrations

* Schema includes **facilities, places, working hours, sports**, **users/roles/permissions**, **bookings & lines**, **courses/sessions**, **tournaments/matches/standings**, and auth OTP/sessions.&#x20;
* **Business rules** live in SQL:

  * `enforce_place_capacity()` checks capacity against **active** bookings and validates place working hours `check_within_place_hours(...)`.&#x20;
  * `enforce_teacher_and_course()` verifies teacher city/hours and course session linkage/deadline.&#x20;
  * `booking_is_active(status_id, hold_expires_at)` defines “active” across holds vs confirmed.&#x20;
  * `generate_initial_matches()` & `recompute_standings()` for tournaments.&#x20;

> **Why SQL‑first?** It keeps the invariants close to Postgres’s strengths (range types, exclusion constraints, STABLE functions) which is essential for race‑free booking in multi‑node deployments.&#x20;

---

## API Surface (high‑level)

* **Auth**: login (password/OTP), register, change password; JWT via `Authorization: Bearer <token>`.
* **Users**: list/detail (secure), search, safe payloads (no password).
* **Facilities**: CRUD, **places** & **working hours**, staff management; scoping via `facility_staff`.
* **Teachers**: profile, sports, cities, working hours, **availability** search (eligibility + non‑overlap with active bookings).&#x20;
* **Sports**: CRUD, active list.
* **Courses**: CRUD, sessions, **images**, session creation adheres to DB checks (hours/capacity/teacher).
* **Tournaments**: CRUD, register, generate matches, submit scores, standings, **images**; facility‑scoped.
* **Bookings**: create **hold**, add/remove lines, confirm/cancel, reprice; user/facility scoping as appropriate; idempotency key support.
* **RBAC / Menu**: roles, permissions, role↔menu, user↔role; **menu tree** and `GET /menu/me`.
* **Logs**: log/logType, plus `vLog` read‑only.
* **Views (read‑only)**: `vBooking`, `vCourse`, `vTournament`, `vUser`, `vFacility` for dashboards.
* **Uploads**: `POST /upload/image` returns a URL; used by course/tournament image endpoints.

All endpoints documented in **Swagger** at `/docs`.

---

## Operational Notes

* **Migrations-on-start**: Docker entrypoint runs migrations before Nest starts. Safe to re‑run; only new files apply.
* **Uploads**: by default served from `/home/node/uploads` inside container. You can bind a host path/volume or switch to S3 later without changing the API contract.
* **Auditing**: schema includes generic row‑change audit triggers under `audit.row_changes`; consider adding a simple `/audit` read‑only API when needed.&#x20;

---

## Contributing

* TypeScript everywhere; keep DB rules in SQL.
* Conventional commits (`feat:`, `fix:`, `chore:`…).
* No direct writes that bypass booking constraints.
* PRs must pass lint/typecheck/tests (where present).

---

## License (Rismun Internal Use)

Copyright © Rismun. All rights reserved.

This repository and its contents are **proprietary** and intended solely for internal use by **Rismun** and its authorized contractors. **No copying, distribution, modification, sublicensing, or use** is permitted outside of Rismun without prior **written permission**. Access to this code does **not** grant any license or rights, express or implied. All trademarks are the property of their respective owners.

---

### Appendix — Useful Links

* **Swagger**: [http://localhost:3030/docs](http://localhost:3030/docs)
* **Adminer** (if enabled): [http://localhost:8080](http://localhost:8080)
* **Web Client repo**: [https://github.com/rismun-com/sportbooking-web](https://github.com/rismun-com/sportbooking-web)
* **Meta repo**: [https://github.com/rismun-com/sportbooking-meta](https://github.com/rismun-com/sportbooking-meta)

