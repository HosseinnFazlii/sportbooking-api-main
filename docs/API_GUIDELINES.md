# API Guidelines — SportBooking API

## Authentication
- Bearer JWT: `Authorization: Bearer <token>`
- Public endpoints are annotated with `@Public()`. Everything else requires auth.

## Response Shape
- For CRUD via BaseController: `{ data: T, error?: string }` (`IApiResponse<T>`)
- Views and list endpoints may return arrays or `{ data, count }` depending on route.

## Pagination & Sorting
- Pagination: `?offset=0&limit=20` (cap `limit` at 100)
- Sorting: `?sort=+field,-otherField` (multi‑column)

## Filtering (BaseService syntax)
Provide query keys as `field:operator=value`. Operators:
- `eq` (=), `lt` (<), `gt` (>), `lte` (<=), `gte` (>=)
- `inc` (LIKE `%value%`), `sw` (LIKE `value%`), `ew` (LIKE `%value`)
- `ie` (IS NULL), `ine` (IS NOT NULL)
- `iao` (IN array of CSV values)
Set logic with `lo=and|or` (default `and`).

**Examples**
```
/user?firstName:sw=Al&createdAt:gte=2024-01-01&sort=+lastName,-createdAt
/booking?statusId:eq=2&lo=or
```

## Idempotency
- All write endpoints that create/confirm resources must accept `Idempotency-Key` (UUID).
- On retries with the same key, return the original result (do not duplicate).

## Errors & Status Codes
- 400 validation errors (DTO/class-validator). Include clear field messages.
- 401 when token missing/invalid; 403 when role/permission insufficient.
- 409 for capacity/overlap/eligibility conflicts (include a machine‑readable code).
- 500 only for unexpected conditions; log with request id.

## RBAC & Scoping
- Controllers declare required permissions (where configured).
- Services enforce facility scoping (Facility Manager) and admin bypass where allowed.

## Migrations & DB Rules
- Invariants (overlap prevention, capacity, eligibility) are enforced in **SQL** via constraints and triggers.
- Migration files are raw SQL in `db/migrations` and run on container start (idempotent, recorded in `app_sql_migrations`).

## Swagger
- Every route must be documented with `@ApiTags`, DTOs annotated with `@ApiProperty`.
- Auth scheme registered as `Authorization` (bearer).
