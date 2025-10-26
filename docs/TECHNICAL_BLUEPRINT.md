# Technical Blueprint — SportBooking (API Server)

This blueprint documents the **API server** (NestJS) and how it integrates with the Web client and Meta docs. The API provides reliable booking, courses, tournaments, and RBAC, enforced by **PostgreSQL** invariants (range types, exclusion constraints, triggers/functions).

- API Server: https://github.com/rismun-com/sportbooking-api
- Web Client: https://github.com/rismun-com/sportbooking-web
- Project Meta: https://github.com/rismun-com/sportbooking-meta

---

## 1) Objectives & Scope

- **Core**: Expose secure, well‑documented REST endpoints for facilities/places, teachers, booking, courses, tournaments, and RBAC.
- **Integrity**: Enforce “no overlap” and capacity/eligibility at the **database** layer, not the app layer.
- **Operability**: SQL‑first migrations, Docker/Compose workflows, Swagger, health & audit.

Out of scope here: marketing pages, client UX, and SEO (handled by the Web repo).

---

## 2) High‑Level Architecture

- **NestJS 11** modules by bounded context:
  - `auth`, `user`, `facility` (places, hours, staff), `teacher` (profile, sports, cities, hours, availability),
  - `sport`, `course` (sessions, images), `tournament` (registration, matches, standings, images),
  - `booking` (holds, lines, confirm/cancel, reprice),
  - `role/permission/menu` (RBAC + menu tree), `log` (log types + vLog),
  - `views` (read‑only: vBooking/vCourse/vTournament/vUser/vFacility),
  - `meta` (reference enums), `upload` (image uploads).
- **TypeORM 0.3** entities and view‑entities (no migration generation).
- **PostgreSQL 15** with:
  - `tstzrange` for time windows,
  - **GiST** exclusion constraints (no overlaps),
  - triggers/functions for capacity, teacher/course eligibility, booking status checks,
  - soft‑delete aware uniqueness where relevant,
  - row‑change audit in `audit.row_changes`.

---

## 3) Data Model — Core Concepts

### Facilities & Places
- `facilities` → `places` (bookable units).
- Working hours per place: `place_working_hours(weekday, segment_no, open_time, close_time, is_closed)`.
- Soft‑delete‑aware uniqueness: one active place name per facility.

### Users & Roles
- `users` with mobile (E.164), email, profile; soft‑delete aware unique indexes.
- `roles`, `permissions`, `role_permissions`, `user_roles`.
- `facility_staff(user_id, facility_id, role_id)` for facility scoping.

### Booking
- `bookings` (status, currency, idempotency key, hold expiration).
- `booking_lines(place_id, teacher_id?, slot tstzrange, qty, price, course_session_id?)`.
- **Invariants**:
  - No overlap per **place** and per **teacher** (GiST exclusion).
  - **Capacity**: `enforce_place_capacity` (sums active lines across overlapping ranges).
  - **Working hours**: `check_within_place_hours` per facility TZ.
  - “Active” booking defined by `booking_is_active(status_id, hold_expires_at)`.

### Teachers
- `teacher_profiles` (bio, hourly rate, rating).
- `teacher_sports`, `teacher_cities`, `teacher_working_hours`.
- Eligibility: `check_teacher_eligibility(teacher_id, place_id, slot)` (city + hours).

### Courses
- `courses` (sport, min/max capacity, booking_deadline).
- `course_sessions` (teacher, place, slot, price, max_capacity).
- Booking linkage via `booking_lines.course_session_id` and checks inside `enforce_teacher_and_course`.

### Tournaments
- `tournaments` (type, capacity bounds, booking_deadline, start/end).
- `tournament_registrations`, `tournament_matches`, `tournament_standings`.
- Helpers: `generate_initial_matches`, `recompute_standings`.

### Logs & Views
- `log`, `log_type`, `vLog`.
- Read‑only view entities: `vBooking`, `vCourse`, `vTournament`, `vUser`, `vFacility`.

---

## 4) API Surface (Selected)

- **Auth**: `POST /auth/login`, OTP flows (`/auth/request-otp`, `/auth/verify-otp`), `PUT /auth/changePassword`.
- **Users**: list/search; safe detail (no password); `GET /user/:id`.
- **Facilities**: CRUD + places + place hours + staff; scoping by `facility_staff`.
- **Teachers**: profile, sports, cities, hours; `GET /teacher/available?placeId&startAt&endAt[&sportId]`.
- **Bookings**: create hold/lines, confirm/cancel; idempotency key support.
- **Courses**: CRUD, sessions, images `/course/:id/images`.
- **Tournaments**: CRUD, register, matches, standings, images.
- **Sports**: CRUD, toggle active, list active.
- **RBAC/Menu**: roles, permissions, role↔menu, user↔role; `GET /menu/tree`, `GET /menu/me`.
- **Logs**: list logs/log types; `GET /log/v` (aggregated).
- **Views**: `/views/bookings|courses|tournaments|users|facilities` (paginated, read‑only).
- **Uploads**: `POST /upload/image` ⇒ `{ url }`.

All endpoints documented in Swagger at `/docs`.

---

## 5) Auth & RBAC

- **JWT** bearer tokens; `@Public()` for open routes.
- Roles: Admin, Facility Manager (scoped), Teacher, End User.
- Controllers use permission hints; services apply scoping (`isAdmin`, `getUserFacilityIds`) before returning/altering data.

---

## 6) Booking & Integrity Flows

1. **Hold**: optional short‑lived reservation (status `hold`, with `hold_expires_at`).
2. **Confirm**: insert/update `booking_lines` in a transaction; Postgres blocks overlaps and capacity breaches; update booking status to `confirmed`.
3. **Cancel**: update booking status; lines stop counting as **active** immediately.
4. **Idempotency**: POSTs accept an idempotency key; repeats don’t create duplicates.

**Key guarantees are enforced in SQL** (constraints + triggers/functions). Application code treats the DB as the source of truth.

---

## 7) Migrations & Versioning

- Migrations are **raw SQL** in `db/migrations` (ordered by filename).
- The runner applies any **new** `.sql` once on container start (table `app_sql_migrations` tracks state).
- Author migrations to be **idempotent** and staging‑safe (use `IF NOT EXISTS`, guard triggers/constraints).
- Version tags for releases (e.g., `api-v0.2.0`) with brief release notes.

---

## 8) Build & Deployment

### Docker/Compose
- `docker-compose.yml` runs:
  - Postgres 15‑alpine (healthchecked),
  - API container (builds Dockerfile, runs migrations on start),
  - Adminer (optional, port 8080).
- NPM shortcuts:
  - `npm run compose:fresh` (wipe DB volume, rebuild API)
  - `npm run compose:update` (keep DB, rebuild API)

### Environment
- `.env.docker` (API container): `DB_HOST=db`, `DB_*`, `PORT`, `JWT_*`.
- Local dev (`.env`): `DB_HOST=127.0.0.1`.

---

## 9) Observability & Audit

- **Swagger** at `/docs`.
- **Audit**: row‑change triggers write to `audit.row_changes` for key tables.
- Consider adding `/health` and structured logging (`request_id`, `user_id`, `facility_id`).
- Alerts: overlap constraint violations (should be zero), migration failures, auth anomalies.

---

## 10) Security

- Validate all DTOs.
- Rate‑limit OTP/login/booking endpoints at the edge.
- Idempotency key on writes.
- Least‑privileged DB roles per environment.
- Sensitive logs redacted; passwords hashed (bcrypt).

---

## 11) Testing

- **Unit**: services, helpers, pricing/time math.
- **E2E**: auth/login, teacher availability, booking create/confirm/cancel (including negative tests for overlaps/eligibility/capacity).
- Seed fixtures via SQL; clean teardown between runs.

---

## 12) Cross‑Repo Integration

- Web client uses this API (JWT bearer). Keep route changes documented.
- Meta repo stores **Use‑Case_Specification.md** and this blueprint—update both when flows/invariants change.
- Optional “shared types” package can be introduced later; for now, keep contracts documented in Swagger.

---

## 13) Roadmap (API)

- `/health` + liveness/readiness probes; Docker `HEALTHCHECK`.
- Optional S3/MinIO storage for uploads (swap Multer storage).
- Audit read API with filters by table, actor, time.
- Price engine rules (peak/off‑peak, promo, membership).
- Closures/blackout windows model (admin UI + enforcement).
- Payment integration (idempotent capture/refund, ledger).

---

## 14) Acceptance Criteria (API‑focused)

- Overlap prevention is DB‑enforced for place & teacher resources.
- Capacity checks reject over‑subscription with precise error.
- Eligibility (teacher, course session) fails fast and clearly.
- Cancelling a booking makes its range immediately available.
- `db/migrations/*.sql` is safely re‑runnable; runner applies new files only.
- Swagger describes every route; DTO validations match runtime behavior.