# Changelog — SportBooking API

All notable changes to this project will be documented here.  
This project adheres to **Semantic Versioning** and the **Keep a Changelog** format.

## [Unreleased]
- (add next changes here)

## [1.0.0] - 2025-09-06

### Added
- **NestJS 11** API server with modules:
  - Auth (password + OTP), Users
  - Facilities (places, working hours, staff), Teachers (profile/sports/cities/hours, availability)
  - Sports
  - Courses (sessions, images)
  - Tournaments (registrations, matches, standings, images)
  - Bookings (holds, lines, confirm/cancel, reprice)
  - RBAC (roles, permissions, user↔role, role↔menu) + Menu tree
  - Logs & Log Types (+ `vLog`)
  - Views (read‑only): `vBooking`, `vCourse`, `vTournament`, `vUser`, `vFacility`
  - Meta lookups (booking statuses, tournament types & reg statuses)
  - Uploads (image) + image CRUD for courses/tournaments
- **TypeORM 0.3** entities & view‑entities; DTO validation; Swagger `/docs`; JWT bearer scheme.
- **BaseService / BaseController**, scoping helpers for facility managers and admins.
- **SQL‑first migrations**: `db/migrations/*.sql` + idempotent runner `src/scripts/run-sql-migrations.ts`.
- **Dockerfile** and **docker-compose.yml** with health‑checked Postgres and migrations‑on‑start.
- **NPM scripts**: `deploy:fresh`, `deploy:update`, `compose:fresh`, `compose:update`, `db:migrate`.
- **Repo docs & templates**: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, `MAINTAINERS.md`, `docs/API_GUIDELINES.md`, `docs/TECHNICAL_BLUEPRINT.md`, `docs/USE_CASE_SPEC_LINK.md`, `.github/pull_request_template.md`, `.github/ISSUE_TEMPLATE.*`, `.github/CODEOWNERS`.

### DB
- Initial normalized schema: reference tables (countries/states/cities, sports, genders, booking_statuses, tournament_types, tournament_reg_statuses), core (facilities, places, place_working_hours), accounts/auth (users, auth_otp, sessions, user_roles, facility_staff), bookings, courses & sessions, teachers, tournaments (images/registrations/matches/standings).
- **Business rules in SQL**: `booking_is_active`, `check_within_place_hours`, `enforce_place_capacity`, `check_teacher_eligibility`, `enforce_teacher_and_course`, tournament helpers `generate_initial_matches` & `recompute_standings`, and row‑change audits under `audit.row_changes`. :contentReference[oaicite:0]{index=0}

### Notes
- API docs at **`/docs`** once the server is running.
- Default Postgres image: `postgres:15-alpine` (via Compose).
- Recommended initial tag: **`api-v0.1.0`**.
