# Booking System Overview

This document summarizes how bookings are represented in the database so that the UI can present consistent labels, states, and totals across languages.

## Core Entities
- **Booking (`bookings` table)**: One check-out record per user. Stores overall status, currency, financial totals, and hold information.
- **Booking Line (`booking_lines` table)**: One line item per reserved slot. Lines link a booking to a `place`, the scheduled time range (`slot`), and optional teacher or course-session context.
- **Place (`places` table)**: A reservable resource within a facility (e.g. a specific court). Holds capacity limits and working hours.
- **Facility (`facilities` table)**: Groups places and defines the timezone used when validating working hours.
- **Pricing Profile (`place_pricing_profiles` table)**: Defines how a place is priced. Each booking line stores the profile and detailed pricing breakdown that was applied at the time of reservation.

## Booking Fields to Surface
- `status_id` → display via the status code/label matrix below.
- `total` / `currency` → aggregate monetary total, maintained by `BookingService.reprice`.
- `hold_expires_at` → deadline for holds and pending payments; null when confirmed/cancelled.
- `paid_at` → timestamp of successful payment, when applicable.
- Soft-delete is modeled via `deleted_at`; ignore rows where this column is set.

The database view `v_bookings` (see `db/migrations/001_structure.sql:1244`) exposes helper fields for list screens:
- `line_count` = number of non-deleted booking lines.
- `total_qty` = sum of `qty` across those lines.
- `first_start_at` / `last_end_at` = earliest start and latest end time across all lines.

## Booking Line Fields to Surface
- `place_id` → join to place name and facility.
- `slot` → stored as a PostgreSQL `tstzrange`; UI should display start and end instants.
- `qty` → number of units reserved (e.g. participants or courts).
- `price` and `currency` → unit price applied to this line.
- `teacher_id` (optional) → linked instructor, if required by the place/course.
- `course_session_id` (optional) → enforces matching schedule and capacity when attached to a course.
- `pricing_details` (JSON) → serialized breakdown of pricing rules; suitable for expandable detail panels.

Database triggers guarantee business rules:
- `enforce_place_capacity` ensures lines stay within place capacity, only counting bookings that are currently active (`booking_is_active`).
- `enforce_teacher_and_course` checks teacher eligibility (city + working hours) and course-session constraints.
- Lines are soft-deleted via `deleted_at` so history remains available.

## Status Codes and Recommended UI Labels
The seed migration (`db/migrations/002_seed.sql`) defines the booking status dictionary. Suggested human-readable labels are shown for translation reference.

| Code | Default English Label | Meaning in UI |
| --- | --- | --- |
| `hold` | Hold | Temporary reservation; awaiting user action before `hold_expires_at`.
| `awaiting_teacher` | Awaiting Teacher Confirmation | Tentative booking pending staff approval; expires at `hold_expires_at` if not confirmed.
| `pending_payment` | Pending Payment | User needs to complete payment. Hold auto-extends to 15 minutes unless a longer hold already exists.
| `payment_failed` | Payment Failed | A payment attempt failed; user can retry while the hold is still valid.
| `confirmed` | Confirmed | Fully confirmed and paid (or manually confirmed). `hold_expires_at` cleared.
| `cancelled` | Cancelled | Manually cancelled by staff or user.
| `expired` | Expired | Hold ran out without confirmation; slot released.
| `refunded` | Refunded | Booking was reimbursed after confirmation.

Status codes determine whether a booking is considered active. The helper `booking_is_active(status_id, hold_expires_at)` returns `true` for:
- `confirmed` bookings, or
- `hold` / `awaiting_teacher` bookings whose hold expiry is in the future.

Inactive bookings free up capacity immediately and should be styled as inactive in UI lists.

## Typical Lifecycle
1. **Create Hold**: User (or staff) creates a booking in `hold` (fallback `awaiting_teacher`) status with a limited `hold_expires_at` window.
2. **Add Lines**: Each line reserves a place/time slot. Pricing is quoted per line and stored with the booking line record.
3. **Review Totals**: `BookingService.reprice` recomputes `total` and enforces a single currency per booking.
4. **Initiate Payment**: Booking moves to `pending_payment`; hold is extended if necessary.
5. **Payment Result**:
   - Success → status `confirmed`, hold cleared, `paid_at` timestamp set.
   - Failure → status `payment_failed`, hold remains so the user can retry (until expiry).
6. **Post-Payment Actions**: Users or staff can cancel (status `cancelled`) or process refunds (`refunded`). Holds that lapse automatically become `expired` via background jobs (not handled in SQL).

Use this lifecycle to drive UI steps, button states, and translation strings. Align screen terminology with the status codes so the same labels apply across languages.
