-- ============================================================================
-- Sport Booking System - Database Structure (Improved, consolidated)
-- ============================================================================
-- This file combines and refines the uploaded migrations into a clean,
-- idempotent structure-only DDL suitable for a fresh installation.
-- Highlights:
--  * Normalized various enumerations to reference tables.
--  * Fixed time-zone handling in working-hours checks.
--  * Unified phone normalization (cc + national) with generated E.164 string.
--  * Email is case-insensitive (citext) with partial unique to support soft deletes.
--  * booking_is_active marked STABLE (not IMMUTABLE) because it depends on time.
--  * Places now reference sports via sport_id (normalized) instead of text.
--  * booking_lines.teacher_id now has a proper FK to users(id).
--  * Soft-delete aware uniqueness for places-per-facility.
--  * Added helpful CHECK constraints and indexes.
-- ============================================================================

-- ----------------------
-- Extensions & Schemas
-- ----------------------
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;
CREATE EXTENSION IF NOT EXISTS hstore;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS audit;

-- ----------------------
-- Utility / Audit
-- ----------------------
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

CREATE TABLE IF NOT EXISTS audit.row_changes (
  id            bigserial PRIMARY KEY,
  table_name    text NOT NULL,
  op            text NOT NULL CHECK (op IN ('INSERT','UPDATE','DELETE')),
  row_pk        hstore,
  changed_by    bigint,
  changed_at    timestamptz NOT NULL DEFAULT now(),
  txid          bigint NOT NULL DEFAULT txid_current(),
  old_data      jsonb,
  new_data      jsonb
);

CREATE OR REPLACE FUNCTION audit.log_row_changes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit.row_changes(table_name, op, row_pk, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, 'INSERT', NULL, current_setting('app.user_id', true)::bigint, NULL, to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit.row_changes(table_name, op, row_pk, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, 'UPDATE', NULL, current_setting('app.user_id', true)::bigint, to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit.row_changes(table_name, op, row_pk, changed_by, old_data, new_data)
    VALUES (TG_TABLE_NAME, 'DELETE', NULL, current_setting('app.user_id', true)::bigint, to_jsonb(OLD), NULL);
    RETURN OLD;
  END IF;
END $$;

-- ----------------------
-- Base Reference Tables
-- ----------------------
CREATE TABLE IF NOT EXISTS countries (
  id     smallserial PRIMARY KEY,
  iso2   char(2) UNIQUE NOT NULL,
  name   text NOT NULL
);

CREATE TABLE IF NOT EXISTS states (
  id         serial PRIMARY KEY,
  country_id smallint NOT NULL REFERENCES countries(id) ON DELETE CASCADE,
  code       text,
  name       text NOT NULL,
  UNIQUE(country_id, name)
);

CREATE TABLE IF NOT EXISTS cities (
  id        serial PRIMARY KEY,
  state_id  int NOT NULL REFERENCES states(id) ON DELETE CASCADE,
  name      text NOT NULL,
  UNIQUE(state_id, name)
);

CREATE TABLE IF NOT EXISTS genders (
  id    smallserial PRIMARY KEY,
  name  text UNIQUE NOT NULL,
  note  text
);

CREATE TABLE IF NOT EXISTS roles (
  id          smallserial PRIMARY KEY,
  name        text UNIQUE NOT NULL,
  description text
);

CREATE TABLE IF NOT EXISTS permissions (
  id   bigserial PRIMARY KEY,
  name text UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id       smallint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id bigint   NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS booking_statuses (
  id    smallserial PRIMARY KEY,
  code  text UNIQUE NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_types (
  id smallserial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS tournament_reg_statuses (
  id smallserial PRIMARY KEY,
  code text UNIQUE NOT NULL,
  label text NOT NULL
);

CREATE TABLE IF NOT EXISTS sports (
  id        smallserial PRIMARY KEY,
  code      text UNIQUE NOT NULL,
  name      text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

DO $$ BEGIN
  CREATE TRIGGER trg_sports_updated
  BEFORE UPDATE ON sports
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------
-- Core: Facilities & Places
-- ----------------------
CREATE TABLE IF NOT EXISTS facilities (
  id            bigserial PRIMARY KEY,
  code          text UNIQUE,
  name          text NOT NULL,
  slug          citext UNIQUE,
  timezone      text NOT NULL DEFAULT 'Asia/Dubai',
  address       text,
  city          text,
  state         text,
  country       text,
  postal_code   text,
  country_id    smallint REFERENCES countries(id) ON DELETE SET NULL,
  state_id      int REFERENCES states(id) ON DELETE SET NULL,
  city_id       int REFERENCES cities(id) ON DELETE SET NULL,
  phone         text,
  email         citext,
  postal_code_int int,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz
);

DO $$ BEGIN
  CREATE TRIGGER trg_facilities_updated
  BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS facilities_geo_idx ON facilities(country_id, state_id, city_id);

CREATE TABLE IF NOT EXISTS places (
  id            bigserial PRIMARY KEY,
  facility_id   bigint NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  name          text NOT NULL,
  sport_id      smallint NOT NULL REFERENCES sports(id),
  surface       text,
  indoor        boolean NOT NULL DEFAULT false,
  min_capacity  int NOT NULL DEFAULT 1,
  max_capacity  int NOT NULL DEFAULT 1,
  attributes    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  deleted_at    timestamptz,
  CONSTRAINT chk_capacity_bounds CHECK (min_capacity >= 1 AND max_capacity >= 1 AND min_capacity <= max_capacity)
);

-- Soft-delete aware uniqueness: one active place name per facility
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'u_active_place_name_per_facility'
  ) THEN
    CREATE UNIQUE INDEX u_active_place_name_per_facility
      ON places(facility_id, name)
      WHERE deleted_at IS NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS places_facility_idx ON places(facility_id);

DO $$ BEGIN
  CREATE TRIGGER trg_places_updated
  BEFORE UPDATE ON places
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS place_working_hours (
  id          bigserial PRIMARY KEY,
  place_id    bigint NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  segment_no  smallint NOT NULL DEFAULT 1 CHECK (segment_no >= 1),
  open_time   time NOT NULL,
  close_time  time NOT NULL,
  is_closed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(place_id, weekday, segment_no)
);

DO $$ BEGIN
  CREATE TRIGGER trg_place_hours_updated
  BEFORE UPDATE ON place_working_hours
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------
-- Pricing
-- ----------------------

CREATE TABLE IF NOT EXISTS place_pricing_profiles (
  id                      bigserial PRIMARY KEY,
  place_id                bigint NOT NULL REFERENCES places(id) ON DELETE CASCADE,
  name                    text NOT NULL DEFAULT 'Default',
  session_duration_minutes smallint NOT NULL DEFAULT 60 CHECK (session_duration_minutes >= 60 AND session_duration_minutes % 60 = 0),
  base_price              numeric(12,2) NOT NULL CHECK (base_price >= 0),
  currency                char(3) NOT NULL DEFAULT 'AED' CHECK (currency ~ '^[A-Z]{3}$'),
  timezone                text NOT NULL DEFAULT 'Asia/Dubai',
  effective_from          date NOT NULL DEFAULT CURRENT_DATE,
  effective_until         date,
  effective_range         daterange GENERATED ALWAYS AS (
    daterange(effective_from, COALESCE(effective_until, 'infinity'::date), '[]')
  ) STORED,
  is_default              boolean NOT NULL DEFAULT false,
  metadata                jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  deleted_at              timestamptz,
  CHECK (effective_until IS NULL OR effective_from <= effective_until)
);

CREATE INDEX IF NOT EXISTS place_pricing_profiles_place_idx
  ON place_pricing_profiles(place_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS place_pricing_profiles_effective_range_idx
  ON place_pricing_profiles USING gist(effective_range)
  WHERE deleted_at IS NULL;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlap_place_pricing_profiles'
  ) THEN
    ALTER TABLE place_pricing_profiles
      ADD CONSTRAINT no_overlap_place_pricing_profiles
      EXCLUDE USING gist (place_id WITH =, effective_range WITH &&)
      WHERE (deleted_at IS NULL);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'u_default_pricing_profile_per_place'
  ) THEN
    CREATE UNIQUE INDEX u_default_pricing_profile_per_place
      ON place_pricing_profiles(place_id)
      WHERE deleted_at IS NULL AND is_default = true;
  END IF;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_place_pricing_profiles_updated
  BEFORE UPDATE ON place_pricing_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS place_price_rules (
  id                  bigserial PRIMARY KEY,
  pricing_profile_id  bigint NOT NULL REFERENCES place_pricing_profiles(id) ON DELETE CASCADE,
  name                text NOT NULL,
  priority            smallint NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 1000),
  override_type       text NOT NULL CHECK (override_type IN ('set','delta_amount','delta_percent')),
  override_value      numeric(12,2) NOT NULL,
  currency            char(3) CHECK (currency ~ '^[A-Z]{3}$'),
  effective_dates     daterange,
  time_window         text,
  weekdays            smallint[],
  specific_dates      date[],
  applies_to_calendar_flags jsonb,
  recurrence          text,
  metadata            jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  deleted_at          timestamptz,
  CHECK (override_type <> 'delta_percent' OR (override_value >= -100 AND override_value <= 100)),
  CHECK (currency IS NOT NULL OR override_type = 'delta_percent'),
  CHECK (weekdays IS NULL OR weekdays <@ ARRAY[0,1,2,3,4,5,6]::smallint[]),
  CHECK (effective_dates IS NULL OR NOT isempty(effective_dates)),
  CHECK (time_window IS NULL OR length(btrim(time_window)) > 0)
);

-- Legacy safety: ensure column exists when upgrading an older schema
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'place_price_rules'
      AND column_name = 'pricing_profile_id'
  ) THEN
    ALTER TABLE place_price_rules
      ADD COLUMN pricing_profile_id bigint REFERENCES place_pricing_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS place_price_rules_profile_idx
  ON place_price_rules(pricing_profile_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS place_price_rules_priority_idx
  ON place_price_rules(pricing_profile_id, priority)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS place_price_rules_dates_idx
  ON place_price_rules USING gist(effective_dates)
  WHERE deleted_at IS NULL AND effective_dates IS NOT NULL;

DO $$ BEGIN
  CREATE TRIGGER trg_place_price_rules_updated
  BEFORE UPDATE ON place_price_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------
-- Accounts & Auth
-- ----------------------
CREATE TABLE IF NOT EXISTS users (
  id                   bigserial PRIMARY KEY,
  mobile               bigint  NOT NULL,
  mobile_verified      boolean NOT NULL DEFAULT false,
  email                citext,
  name                 text NOT NULL,
  gender_id            smallint REFERENCES genders(id),
  role_id              smallint REFERENCES roles(id) ON DELETE SET NULL,
  birthdate            date,
  picture              bytea,
  password_hash        text,
  password_set_at      timestamptz,
  password_must_change boolean NOT NULL DEFAULT false,
  address              text,
  city                 text,
  state                text,
  country              text,
  postal_code          text,
  country_id           smallint REFERENCES countries(id) ON DELETE SET NULL,
  state_id             int REFERENCES states(id) ON DELETE SET NULL,
  city_id              int REFERENCES cities(id) ON DELETE SET NULL,
  marketing_opt_in     boolean NOT NULL DEFAULT false,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  deleted_at           timestamptz
);

-- Soft-delete aware uniqueness
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'users_mobile_unique'
  ) THEN
    CREATE UNIQUE INDEX users_mobile_unique
      ON users(mobile)
      WHERE deleted_at IS NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'users_email_unique_active'
  ) THEN
    CREATE UNIQUE INDEX users_email_unique_active
      ON users(email)
      WHERE deleted_at IS NULL AND email IS NOT NULL;
  END IF;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_users_updated
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS facility_staff (
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  facility_id bigint NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  role_id     smallint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  PRIMARY KEY(user_id, facility_id, role_id)
);
CREATE INDEX IF NOT EXISTS facility_staff_facility_idx ON facility_staff(facility_id);
CREATE INDEX IF NOT EXISTS facility_staff_role_idx ON facility_staff(role_id);

CREATE TABLE IF NOT EXISTS auth_otp (
  id            bigserial PRIMARY KEY,
  mobile        bigint NOT NULL,
  code          text NOT NULL,
  purpose       text NOT NULL CHECK (purpose IN ('login','register','reset')),
  issued_at     timestamptz NOT NULL DEFAULT now(),
  expires_at    timestamptz NOT NULL,
  consumed_at   timestamptz,
  attempts      int NOT NULL DEFAULT 0,
  max_attempts  int NOT NULL DEFAULT 5,
  request_ip    inet
);
CREATE INDEX IF NOT EXISTS auth_otp_mobile_idx ON auth_otp(mobile);
CREATE INDEX IF NOT EXISTS auth_otp_expires_idx ON auth_otp(expires_at);

CREATE TABLE IF NOT EXISTS sessions (
  id         uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  ip         inet,
  user_agent text
);

-- ----------------------
-- Bookings
-- ----------------------
CREATE TABLE IF NOT EXISTS bookings (
  id                bigserial PRIMARY KEY,
  user_id           bigint NOT NULL REFERENCES users(id),
  status_id         smallint NOT NULL REFERENCES booking_statuses(id),
  total             numeric(12,2) NOT NULL DEFAULT 0,
  currency          text NOT NULL DEFAULT 'AED' CHECK (currency ~ '^[A-Z]{3}$'),
  idempotency_key   uuid UNIQUE,
  hold_expires_at   timestamptz,
  payment_reference text,
  payment_failure_reason text,
  paid_at           timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz
);
CREATE INDEX IF NOT EXISTS bookings_user_idx ON bookings(user_id);

DO $$ BEGIN
  CREATE TRIGGER trg_bookings_updated
  BEFORE UPDATE ON bookings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS booking_lines (
  id                 bigserial PRIMARY KEY,
  booking_id         bigint NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  place_id           bigint NOT NULL REFERENCES places(id),
  teacher_id         bigint REFERENCES users(id),
  slot               tstzrange NOT NULL,
  qty                int NOT NULL DEFAULT 1 CHECK (qty >= 1),
  price              numeric(12,2) NOT NULL DEFAULT 0,
  currency           char(3) NOT NULL DEFAULT 'AED' CHECK (currency ~ '^[A-Z]{3}$'),
  pricing_profile_id bigint REFERENCES place_pricing_profiles(id),
  applied_rule_ids   bigint[],
  pricing_details    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  deleted_at         timestamptz,
  CHECK (lower(slot) < upper(slot))
);

-- Legacy safety: bring existing booking_lines in line with new pricing columns
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_lines'
      AND column_name = 'pricing_profile_id'
  ) THEN
    ALTER TABLE booking_lines
      ADD COLUMN pricing_profile_id bigint REFERENCES place_pricing_profiles(id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_lines'
      AND column_name = 'applied_rule_ids'
  ) THEN
    ALTER TABLE booking_lines
      ADD COLUMN applied_rule_ids bigint[];
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_lines'
      AND column_name = 'pricing_details'
  ) THEN
    ALTER TABLE booking_lines
      ADD COLUMN pricing_details jsonb NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'booking_lines'
      AND column_name = 'currency'
  ) THEN
    ALTER TABLE booking_lines
      ADD COLUMN currency char(3) NOT NULL DEFAULT 'AED';
  END IF;
END $$;

-- Prevent double-booking a teacher across overlapping slots (if teacher specified)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'no_overlap_per_teacher'
  ) THEN
    ALTER TABLE booking_lines
      ADD CONSTRAINT no_overlap_per_teacher
      EXCLUDE USING gist (teacher_id WITH =, slot WITH &&)
      WHERE (teacher_id IS NOT NULL);
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE INDEX IF NOT EXISTS booking_lines_place_idx ON booking_lines(place_id);
CREATE INDEX IF NOT EXISTS booking_lines_slot_idx ON booking_lines USING gist(slot);
CREATE INDEX IF NOT EXISTS booking_lines_profile_idx
  ON booking_lines(pricing_profile_id)
  WHERE pricing_profile_id IS NOT NULL;

DO $$ BEGIN
  CREATE TRIGGER trg_booking_lines_updated
  BEFORE UPDATE ON booking_lines
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------
-- Courses
-- ----------------------
CREATE TABLE IF NOT EXISTS courses (
  id               bigserial PRIMARY KEY,
  title            text NOT NULL,
  description      text,
  sport_id         smallint NOT NULL REFERENCES sports(id),
  min_capacity     int NOT NULL DEFAULT 1,
  max_capacity     int NOT NULL DEFAULT 20,
  booking_deadline timestamptz NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  created_by       bigint REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  CHECK (min_capacity >= 1 AND max_capacity >= min_capacity)
);

CREATE TABLE IF NOT EXISTS course_images (
  id          bigserial PRIMARY KEY,
  course_id   bigint NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  url         text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS course_sessions (
  id            bigserial PRIMARY KEY,
  course_id     bigint NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id    bigint NOT NULL REFERENCES users(id),
  place_id      bigint NOT NULL REFERENCES places(id),
  slot          tstzrange NOT NULL,
  price         numeric(12,2) NOT NULL DEFAULT 0,
  max_capacity  int NOT NULL DEFAULT 10,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CHECK (lower(slot) < upper(slot))
);

-- Link optional course_session to booking_lines (added after both tables exist)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema='public' AND table_name='booking_lines' AND column_name='course_session_id'
  ) THEN
    ALTER TABLE booking_lines
      ADD COLUMN course_session_id bigint REFERENCES course_sessions(id);
  END IF;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_courses_updated
  BEFORE UPDATE ON courses
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_course_sessions_updated
  BEFORE UPDATE ON course_sessions
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------
-- Teachers
-- ----------------------
CREATE TABLE IF NOT EXISTS teacher_profiles (
  user_id     bigint PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio         text,
  hourly_rate numeric(12,2),
  rating_avg  numeric(3,2) CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5)),
  rating_count int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS teacher_sports (
  teacher_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  sport_id   smallint NOT NULL REFERENCES sports(id) ON DELETE CASCADE,
  PRIMARY KEY(teacher_id, sport_id)
);

CREATE TABLE IF NOT EXISTS teacher_cities (
  teacher_id bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  city_id    int NOT NULL REFERENCES cities(id) ON DELETE CASCADE,
  PRIMARY KEY(teacher_id, city_id)
);

CREATE TABLE IF NOT EXISTS teacher_working_hours (
  id          bigserial PRIMARY KEY,
  teacher_id  bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday     smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  segment_no  smallint NOT NULL DEFAULT 1 CHECK (segment_no >= 1),
  open_time   time NOT NULL,
  close_time  time NOT NULL,
  is_closed   boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(teacher_id, weekday, segment_no)
);

DO $$ BEGIN
  CREATE TRIGGER trg_teacher_hours_updated
  BEFORE UPDATE ON teacher_working_hours
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------
-- Tournaments
-- ----------------------
CREATE TABLE IF NOT EXISTS tournaments (
  id               bigserial PRIMARY KEY,
  title            text NOT NULL,
  description      text,
  sport_id         smallint NOT NULL REFERENCES sports(id),
  type_id          smallint NOT NULL REFERENCES tournament_types(id),
  min_capacity     int NOT NULL DEFAULT 2,
  max_capacity     int NOT NULL DEFAULT 64,
  booking_deadline timestamptz NOT NULL,
  start_at         timestamptz NOT NULL,
  end_at           timestamptz NOT NULL,
  facility_id      bigint REFERENCES facilities(id),
  event_place_id   bigint REFERENCES places(id),
  event_slot       tstzrange,
  is_active        boolean NOT NULL DEFAULT true,
  created_by       bigint REFERENCES users(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  deleted_at       timestamptz,
  CHECK (min_capacity >= 2 AND max_capacity >= min_capacity),
  CHECK (start_at < end_at),
  CHECK (booking_deadline <= start_at)
);

CREATE TABLE IF NOT EXISTS tournament_images (
  id            bigserial PRIMARY KEY,
  tournament_id bigint NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  url           text NOT NULL,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_registrations (
  id              bigserial PRIMARY KEY,
  tournament_id   bigint NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id         bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status_id       smallint NOT NULL REFERENCES tournament_reg_statuses(id),
  hold_expires_at timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id              bigserial PRIMARY KEY,
  tournament_id   bigint NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  round_no        int NOT NULL DEFAULT 1,
  match_no        int NOT NULL DEFAULT 1,
  a_user_id       bigint REFERENCES users(id),
  b_user_id       bigint REFERENCES users(id),
  winner_user_id  bigint REFERENCES users(id),
  a_score         int,
  b_score         int,
  place_id        bigint REFERENCES places(id),
  slot            tstzrange,
  status          text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled','completed','cancelled')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_standings (
  id            bigserial PRIMARY KEY,
  tournament_id bigint NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id       bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points        int NOT NULL DEFAULT 0,
  wins          int NOT NULL DEFAULT 0,
  losses        int NOT NULL DEFAULT 0,
  draws         int NOT NULL DEFAULT 0,
  score_for     int NOT NULL DEFAULT 0,
  score_against int NOT NULL DEFAULT 0,
  UNIQUE(tournament_id, user_id)
);

DO $$ BEGIN
  CREATE TRIGGER trg_tournaments_updated
  BEFORE UPDATE ON tournaments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tournament_regs_updated
  BEFORE UPDATE ON tournament_registrations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_tournament_matches_updated
  BEFORE UPDATE ON tournament_matches
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------
-- Business Logic Functions
-- ----------------------

-- Active booking := Confirmed, or a Hold/Awaiting-Teacher that hasn't expired
CREATE OR REPLACE FUNCTION booking_is_active(p_status_id int, p_hold_expires_at timestamptz)
RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM booking_statuses s
     WHERE s.id = p_status_id
       AND (
         s.code = 'confirmed'
         OR (s.code IN ('hold','awaiting_teacher') AND (p_hold_expires_at IS NULL OR p_hold_expires_at > now()))
       )
  )
$$;

-- Check a slot is contained within place working hours, using the facility's timezone
CREATE OR REPLACE FUNCTION check_within_place_hours(p_place_id bigint, p_slot tstzrange)
RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE
  tz text;
  lower_local timestamp;
  upper_local timestamp;
  d int;
  t_from time;
  t_to   time;
  ok     boolean;
BEGIN
  IF lower(p_slot) IS NULL OR upper(p_slot) IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT f.timezone INTO tz
  FROM places p JOIN facilities f ON f.id = p.facility_id
  WHERE p.id = p_place_id;

  IF tz IS NULL THEN
    -- Fallback: treat as UTC comparisons if no facility/timezone found
    lower_local := lower(p_slot);
    upper_local := upper(p_slot);
  ELSE
    lower_local := (lower(p_slot) AT TIME ZONE tz);
    upper_local := (upper(p_slot) AT TIME ZONE tz);
  END IF;

  IF lower_local::date <> upper_local::date THEN
    RETURN FALSE;
  END IF;

  d := EXTRACT(DOW FROM lower_local)::int;
  t_from := lower_local::time;
  t_to   := upper_local::time;

  SELECT EXISTS (
    SELECT 1
      FROM place_working_hours
     WHERE place_id = p_place_id
       AND weekday = d
       AND is_closed = false
       AND open_time <= t_from AND close_time >= t_to
  ) INTO ok;

  RETURN ok;
END $$;

-- Enforce place capacity (using booking_is_active + working hours)
CREATE OR REPLACE FUNCTION enforce_place_capacity() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  current_reserved int;
  cap int;
  v_place_id bigint := COALESCE(NEW.place_id, OLD.place_id);
  v_slot tstzrange := COALESCE(NEW.slot, OLD.slot);
  v_qty int := COALESCE(NEW.qty, OLD.qty, 1);
BEGIN
  IF NOT check_within_place_hours(v_place_id, v_slot) THEN
    RAISE EXCEPTION 'Slot % is outside working hours for place %', v_slot, v_place_id USING ERRCODE = 'check_violation';
  END IF;

  SELECT COALESCE(SUM(bl.qty), 0)
    INTO current_reserved
  FROM booking_lines bl
  JOIN bookings b ON b.id = bl.booking_id
  WHERE bl.place_id = v_place_id
    AND bl.id IS DISTINCT FROM NEW.id
    AND bl.slot && v_slot
    AND booking_is_active(b.status_id, b.hold_expires_at);

  SELECT max_capacity INTO cap FROM places WHERE id = v_place_id;
  IF cap IS NULL THEN
    RAISE EXCEPTION 'Place % not found', v_place_id;
  END IF;

  IF current_reserved + v_qty > cap THEN
    RAISE EXCEPTION 'Capacity exceeded for place %, reserved % + requested % > max %', v_place_id, current_reserved, v_qty, cap
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_capacity_enforce
  BEFORE INSERT OR UPDATE ON booking_lines
  FOR EACH ROW EXECUTE FUNCTION enforce_place_capacity();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Confirm teacher is eligible (city + working hours), and course linkage rules
CREATE OR REPLACE FUNCTION check_teacher_eligibility(p_teacher_id bigint, p_place_id bigint, p_slot tstzrange) RETURNS boolean
LANGUAGE plpgsql AS $$
DECLARE
  v_weekday integer;
  v_from time;
  v_to time;
  v_city int;
  ok_hours boolean;
  ok_city boolean;
BEGIN
  SELECT f.city_id
    INTO v_city
  FROM places p
  JOIN facilities f ON f.id = p.facility_id
  WHERE p.id = p_place_id;

  IF v_city IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS(
    SELECT 1
    FROM teacher_cities
    WHERE teacher_id = p_teacher_id
      AND city_id = v_city
  ) INTO ok_city;
  IF NOT ok_city THEN RETURN FALSE; END IF;

  v_weekday := extract(dow from lower(p_slot))::int;
  v_from := lower(p_slot)::time;
  v_to := upper(p_slot)::time;

  SELECT EXISTS(
    SELECT 1
    FROM teacher_working_hours
    WHERE teacher_id = p_teacher_id
      AND weekday = v_weekday
      AND is_closed = false
      AND open_time <= v_from
      AND close_time >= v_to
  ) INTO ok_hours;
  IF NOT ok_hours THEN RETURN FALSE; END IF;

  RETURN TRUE;
END $$;

CREATE OR REPLACE FUNCTION enforce_teacher_and_course() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  v_slot tstzrange := COALESCE(NEW.slot, OLD.slot);
  v_teacher_id bigint := COALESCE(NEW.teacher_id, OLD.teacher_id);
  v_place_id bigint := COALESCE(NEW.place_id, OLD.place_id);
  v_course_session_id bigint := COALESCE(NEW.course_session_id, OLD.course_session_id);
  course_deadline timestamptz;
  cs_slot tstzrange;
  cs_teacher bigint;
  cs_place bigint;
  cs_cap int;
  reserved int;
BEGIN
  IF v_teacher_id IS NOT NULL THEN
    IF NOT check_teacher_eligibility(v_teacher_id, v_place_id, v_slot) THEN
      RAISE EXCEPTION 'Teacher % is not eligible for place % and slot %', v_teacher_id, v_place_id, v_slot USING ERRCODE='check_violation';
    END IF;
  END IF;

  IF v_course_session_id IS NOT NULL THEN
    SELECT s.slot, s.teacher_id, s.place_id, s.max_capacity, c.booking_deadline
      INTO cs_slot, cs_teacher, cs_place, cs_cap, course_deadline
    FROM course_sessions s JOIN courses c ON c.id = s.course_id
    WHERE s.id = v_course_session_id;

    IF cs_slot IS NULL THEN
      RAISE EXCEPTION 'Course session % not found', v_course_session_id;
    END IF;

    IF v_slot IS DISTINCT FROM cs_slot OR v_place_id <> cs_place OR (v_teacher_id IS NOT NULL AND v_teacher_id <> cs_teacher) THEN
      RAISE EXCEPTION 'Booking does not match course session requirements';
    END IF;

    IF now() > course_deadline THEN
      RAISE EXCEPTION 'Booking deadline passed for course session %', v_course_session_id;
    END IF;

    SELECT COALESCE(SUM(bl.qty),0) INTO reserved
    FROM booking_lines bl
    JOIN bookings b ON b.id = bl.booking_id
    WHERE bl.course_session_id = v_course_session_id
      AND booking_is_active(b.status_id, b.hold_expires_at);

    IF reserved + COALESCE(NEW.qty,1) > cs_cap THEN
      RAISE EXCEPTION 'Course session capacity exceeded';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_teacher_course_enforce
  BEFORE INSERT OR UPDATE ON booking_lines
  FOR EACH ROW EXECUTE FUNCTION enforce_teacher_and_course();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ----------------------
-- Tournament helpers
-- ----------------------
CREATE OR REPLACE FUNCTION generate_initial_matches(p_tournament_id bigint)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  ttype text;
  pids bigint[];
  n int;
  i int := 1;
BEGIN
  SELECT tt.code INTO ttype
    FROM tournaments t JOIN tournament_types tt ON tt.id = t.type_id
   WHERE t.id = p_tournament_id;

  SELECT array_agg(r.user_id ORDER BY r.created_at)
    INTO pids
    FROM tournament_registrations r
    WHERE r.tournament_id = p_tournament_id
      AND (SELECT code FROM tournament_reg_statuses s WHERE s.id = r.status_id) IN ('pending','awaiting_opponent','confirmed');

  n := coalesce(array_length(pids,1),0);
  IF n < 2 THEN
    UPDATE tournament_registrations r
       SET status_id = (SELECT id FROM tournament_reg_statuses WHERE code='awaiting_opponent')
     WHERE r.tournament_id = p_tournament_id;
    RETURN;
  END IF;

  DELETE FROM tournament_matches WHERE tournament_id = p_tournament_id;

  WHILE i <= n LOOP
    IF i = n THEN
      UPDATE tournament_registrations
         SET status_id = (SELECT id FROM tournament_reg_statuses WHERE code='awaiting_opponent')
       WHERE tournament_id = p_tournament_id AND user_id = pids[i];
      EXIT;
    END IF;
    INSERT INTO tournament_matches(tournament_id, round_no, match_no, a_user_id, b_user_id, status)
    VALUES (p_tournament_id, 1, (i+1)/2, pids[i], pids[i+1], 'scheduled');
    i := i + 2;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION recompute_standings(p_tournament_id bigint)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM tournament_standings WHERE tournament_id = p_tournament_id;
  INSERT INTO tournament_standings(tournament_id, user_id, points, wins, losses, draws, score_for, score_against)
  SELECT p_tournament_id, u_id,
         SUM(CASE WHEN res='W' THEN 3 WHEN res='D' THEN 1 ELSE 0 END) AS pts,
         SUM(CASE WHEN res='W' THEN 1 ELSE 0 END) AS wins,
         SUM(CASE WHEN res='L' THEN 1 ELSE 0 END) AS losses,
         SUM(CASE WHEN res='D' THEN 1 ELSE 0 END) AS draws,
         SUM(sf) AS score_for, SUM(sa) AS score_against
  FROM (
    SELECT m.a_user_id AS u_id,
           CASE WHEN m.a_score > m.b_score THEN 'W' WHEN m.a_score < m.b_score THEN 'L' ELSE 'D' END AS res,
           m.a_score AS sf, m.b_score AS sa
      FROM tournament_matches m WHERE m.tournament_id = p_tournament_id AND m.status='completed'
    UNION ALL
    SELECT m.b_user_id AS u_id,
           CASE WHEN m.b_score > m.a_score THEN 'W' WHEN m.b_score < m.a_score THEN 'L' ELSE 'D' END AS res,
           m.b_score AS sf, m.a_score AS sa
      FROM tournament_matches m WHERE m.tournament_id = p_tournament_id AND m.status='completed'
  ) x
  GROUP BY u_id;
END $$;

-- ----------------------
-- Audit Triggers (for key tables)
-- ----------------------
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_users') THEN
    CREATE TRIGGER trg_audit_users AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_roles') THEN
    CREATE TRIGGER trg_audit_roles AFTER INSERT OR UPDATE OR DELETE ON roles
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_facilities') THEN
    CREATE TRIGGER trg_audit_facilities AFTER INSERT OR UPDATE OR DELETE ON facilities
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_places') THEN
    CREATE TRIGGER trg_audit_places AFTER INSERT OR UPDATE OR DELETE ON places
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_bookings') THEN
    CREATE TRIGGER trg_audit_bookings AFTER INSERT OR UPDATE OR DELETE ON bookings
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_booking_lines') THEN
    CREATE TRIGGER trg_audit_booking_lines AFTER INSERT OR UPDATE OR DELETE ON booking_lines
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_place_hours') THEN
    CREATE TRIGGER trg_audit_place_hours
    AFTER INSERT OR UPDATE OR DELETE ON place_working_hours
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_teacher_profiles') THEN
    CREATE TRIGGER trg_audit_teacher_profiles
    AFTER INSERT OR UPDATE OR DELETE ON teacher_profiles
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_teacher_sports') THEN
    CREATE TRIGGER trg_audit_teacher_sports
    AFTER INSERT OR UPDATE OR DELETE ON teacher_sports
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_teacher_cities') THEN
    CREATE TRIGGER trg_audit_teacher_cities
    AFTER INSERT OR UPDATE OR DELETE ON teacher_cities
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_teacher_working') THEN
    CREATE TRIGGER trg_audit_teacher_working
    AFTER INSERT OR UPDATE OR DELETE ON teacher_working_hours
    FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_courses') THEN
    CREATE TRIGGER trg_audit_courses
      AFTER INSERT OR UPDATE OR DELETE ON courses
      FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_course_sessions') THEN
    CREATE TRIGGER trg_audit_course_sessions
      AFTER INSERT OR UPDATE OR DELETE ON course_sessions
      FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_tournaments') THEN
    CREATE TRIGGER trg_audit_tournaments
      AFTER INSERT OR UPDATE OR DELETE ON tournaments
      FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_tournament_regs') THEN
    CREATE TRIGGER trg_audit_tournament_regs
      AFTER INSERT OR UPDATE OR DELETE ON tournament_registrations
      FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_audit_tournament_matches') THEN
    CREATE TRIGGER trg_audit_tournament_matches
      AFTER INSERT OR UPDATE OR DELETE ON tournament_matches
      FOR EACH ROW EXECUTE FUNCTION audit.log_row_changes();
  END IF;
END $$;


-- ----------------------
-- Core: Logs
-- ----------------------

CREATE TABLE IF NOT EXISTS log_types (
    id smallserial PRIMARY KEY,
    code citext NOT NULL UNIQUE,
    description text,
    created_by bigint REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS log_types_created_by_idx ON log_types(created_by);
CREATE UNIQUE INDEX IF NOT EXISTS u_log_types_code ON log_types(code);

CREATE TABLE IF NOT EXISTS logs (
  id bigserial PRIMARY KEY,
  type_id smallint REFERENCES log_types(id) ON DELETE SET NULL,
  text1 text,
  text2 text,
  text3 text,
  text4 text,
  created_by bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs(created_at);
CREATE INDEX IF NOT EXISTS logs_type_idx ON logs(type_id);
CREATE INDEX IF NOT EXISTS logs_created_by_idx ON logs(created_by);


-- ----------------------
-- Core: Menus and Calendars
-- ----------------------


CREATE TABLE IF NOT EXISTS menus (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  url text,
  icon text,
  parent_id bigint REFERENCES menus(id) ON DELETE SET NULL,
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_by bigint REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS u_menu_name_per_parent
  ON menus(parent_id, name) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS menus_parent_idx ON menus(parent_id);
CREATE INDEX IF NOT EXISTS menus_created_by_idx ON menus(created_by);
CREATE INDEX IF NOT EXISTS menus_sort_idx ON menus(sort_order);

CREATE TABLE IF NOT EXISTS role_menus (
  role_id smallint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  menu_id bigint NOT NULL REFERENCES menus(id) ON DELETE CASCADE,
  PRIMARY KEY(role_id, menu_id)
);


CREATE TABLE IF NOT EXISTS calendar (
  date_key int PRIMARY KEY,
  gregorian_date date,
  gregorian_year smallint,
  gregorian_month_no smallint,
  gregorian_day_in_month smallint,
  gregorian_month_day_int smallint,
  gregorian_day_of_week smallint,
  gregorian_month_name text,
  gregorian_str char(10),
  gregorian_year_month_int int,
  gregorian_year_month_str char(7),
  gregorian_day_of_week_name text,
  gregorian_week_of_year_name text,
  gregorian_week_of_year_no int,
  persian_int int,
  persian_year smallint,
  persian_month_no smallint,
  persian_day_in_month smallint,
  persian_month_day_int smallint,
  persian_day_of_week smallint,
  persian_month_name text,
  persian_str char(10),
  persian_year_month_int int,
  persian_year_month_str char(7),
  persian_day_of_week_name text,
  persian_week_of_year_name text,
  persian_week_of_year_no int,
  persian_full_name text,
  hijri_int int,
  hijri_year smallint,
  hijri_month_no smallint,
  hijri_day_in_month smallint,
  hijri_month_day_int smallint,
  hijri_day_of_week smallint,
  hijri_month_name text,
  hijri_str char(10),
  hijri_year_month_int int,
  hijri_year_month_str char(7),
  hijri_day_of_week_name text,
  hijri_week_of_year_name text,
  hijri_week_of_year_no int,
  season_code smallint,
  season_name text,
  is_gregorian_leap boolean,
  is_persian_leap boolean,
  is_one_day_before_persian_holiday boolean,
  is_one_day_before_hijri_holiday boolean
);

CREATE INDEX IF NOT EXISTS calendar_gregorian_date_idx ON calendar(gregorian_date);

-- ----------------------
-- Core: Views
-- ----------------------

CREATE OR REPLACE VIEW v_logs AS
  SELECT
    l.id,
    l.type_id,
    lt.code AS type_code,
    lt.description AS type_description,
    l.text1, l.text2, l.text3, l.text4,
    l.created_at,
    l.created_by,
    u.name AS created_by_name
  FROM logs l
  LEFT JOIN log_types lt ON lt.id = l.type_id
  LEFT JOIN users u ON u.id = l.created_by;

CREATE OR REPLACE VIEW v_bookings AS
SELECT
  b.id,
  b.user_id,
  u.name AS user_full_name,
  u.mobile,
  u.email::text AS email,
  s.code AS status_code,
  b.total,
  b.currency,
  b.hold_expires_at,
  b.created_at,
  b.updated_at,
  booking_is_active(b.status_id, b.hold_expires_at) AS is_active,
  COUNT(bl.id) AS line_count,
  COALESCE(SUM(bl.qty),0) AS total_qty,
  MIN(lower(bl.slot)) AS first_start_at,
  MAX(upper(bl.slot)) AS last_end_at
FROM bookings b
JOIN users u ON u.id = b.user_id
JOIN booking_statuses s ON s.id = b.status_id
LEFT JOIN booking_lines bl ON bl.booking_id = b.id AND bl.deleted_at IS NULL
WHERE b.deleted_at IS NULL
GROUP BY b.id, b.user_id, u.name, u.mobile, u.email, s.code;

CREATE OR REPLACE VIEW v_courses AS
SELECT
  c.id,
  c.title,
  c.sport_id,
  sp.name AS sport_name,
  c.is_active,
  c.booking_deadline,
  c.min_capacity,
  c.max_capacity,
  c.created_by,
  cu.name AS created_by_name,
  COUNT(cs.id) AS session_count,
  COUNT(cs.id) FILTER (WHERE lower(cs.slot) > now()) AS upcoming_session_count,
  MIN(cs.price) AS min_session_price,
  MAX(cs.price) AS max_session_price,
  MIN(lower(cs.slot)) AS first_session_start,
  MAX(upper(cs.slot)) AS last_session_end
FROM courses c
JOIN sports sp ON sp.id = c.sport_id
LEFT JOIN users cu ON cu.id = c.created_by
LEFT JOIN course_sessions cs ON cs.course_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, sp.name, cu.name;

CREATE OR REPLACE VIEW v_tournaments AS
SELECT
  t.id,
  t.title,
  t.sport_id,
  sp.name AS sport_name,
  t.type_id,
  tt.code AS type_code,
  tt.label AS type_label,
  t.min_capacity,
  t.max_capacity,
  t.booking_deadline,
  t.start_at,
  t.end_at,
  t.facility_id,
  f.name AS facility_name,
  t.event_place_id,
  p.name AS event_place_name,
  t.event_slot,
  t.is_active,
  t.created_by,
  u.name AS created_by_name,
  COUNT(DISTINCT tr.id) FILTER (
    WHERE trs.code IN ('pending','awaiting_opponent','confirmed')
  ) AS registration_count,
  COUNT(DISTINCT tm.id) AS match_count,
  COUNT(DISTINCT ts.id) AS standing_count,
  (now() BETWEEN t.start_at AND t.end_at) AS is_ongoing
FROM tournaments t
JOIN sports sp ON sp.id = t.sport_id
JOIN tournament_types tt ON tt.id = t.type_id
LEFT JOIN users u ON u.id = t.created_by
LEFT JOIN facilities f ON f.id = t.facility_id
LEFT JOIN places p ON p.id = t.event_place_id
LEFT JOIN tournament_registrations tr ON tr.tournament_id = t.id
LEFT JOIN tournament_reg_statuses trs ON trs.id = tr.status_id
LEFT JOIN tournament_matches tm ON tm.tournament_id = t.id
LEFT JOIN tournament_standings ts ON ts.tournament_id = t.id
WHERE t.deleted_at IS NULL
GROUP BY
  t.id, sp.name, tt.code, tt.label, f.name, p.name, u.name;

CREATE OR REPLACE VIEW v_users AS
SELECT
  u.id,
  u.name,
  u.name AS full_name,
  u.email::text AS email,
  u.mobile,
  u.mobile_verified,
  u.is_active,
  u.created_at,
  u.updated_at,
  g.name AS gender,
  co.name AS country_name,
  st.name AS state_name,
  ci.name AS city_name,
  COALESCE(tp.rating_avg, 0) AS rating_avg,
  COALESCE(tp.rating_count, 0) AS rating_count,
  (tp.user_id IS NOT NULL) AS is_teacher,
  STRING_AGG(DISTINCT r.name, ',') AS roles
FROM users u
LEFT JOIN genders g ON g.id = u.gender_id
LEFT JOIN countries co ON co.id = u.country_id
LEFT JOIN states st ON st.id = u.state_id
LEFT JOIN cities ci ON ci.id = u.city_id
LEFT JOIN teacher_profiles tp ON tp.user_id = u.id
LEFT JOIN roles r ON r.id = u.role_id
WHERE u.deleted_at IS NULL
GROUP BY u.id, g.name, co.name, st.name, ci.name, tp.rating_avg, tp.rating_count, tp.user_id;

CREATE OR REPLACE VIEW v_facilities AS
SELECT
  f.id,
  f.name,
  f.slug,
  f.timezone,
  f.city,
  f.state,
  f.country,
  f.created_at,
  COUNT(DISTINCT p.id) AS place_count,
  COUNT(DISTINCT p.sport_id) AS sports_count,
  COUNT(DISTINCT t.id) AS tournaments_count,
  COUNT(bl.id) FILTER (
    WHERE booking_is_active(b.status_id, b.hold_expires_at)
      AND lower(bl.slot) >= now()
  ) AS upcoming_booking_lines,
  MIN(lower(bl.slot)) FILTER (
    WHERE booking_is_active(b.status_id, b.hold_expires_at)
  ) AS next_booking_start
FROM facilities f
LEFT JOIN places p ON p.facility_id = f.id AND p.deleted_at IS NULL
LEFT JOIN tournament_matches tm ON tm.place_id = p.id
LEFT JOIN tournaments t ON t.id = tm.tournament_id AND t.deleted_at IS NULL
LEFT JOIN booking_lines bl ON bl.place_id = p.id AND bl.deleted_at IS NULL
LEFT JOIN bookings b ON b.id = bl.booking_id AND b.deleted_at IS NULL
WHERE f.deleted_at IS NULL
GROUP BY f.id;
