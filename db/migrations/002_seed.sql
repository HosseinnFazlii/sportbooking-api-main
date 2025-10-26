-- ============================================================================
-- Sport Booking System - Seed Data (Improved, consolidated)
-- ============================================================================

-- Base lookups

INSERT INTO genders(name, note) VALUES
  ('male','gender_id=1 means male'),
  ('female','gender_id=2 means female'),
  ('other','gender_id=3 means other')
ON CONFLICT (name) DO NOTHING;

INSERT INTO booking_statuses(code, label) VALUES
  ('hold','Hold'),
  ('confirmed','Confirmed'),
  ('cancelled','Cancelled'),
  ('expired','Expired'),
  ('refunded','Refunded'),
  ('awaiting_teacher','Awaiting Teacher Confirmation'),
  ('pending_payment','Pending Payment'),
  ('payment_failed','Payment Failed')
ON CONFLICT (code) DO NOTHING;

INSERT INTO roles(name, description) VALUES
  ('admin','Full administrative access'),
  ('manager','Facility manager'),
  ('teacher','Coach/teacher'),
  ('user','End user / student')
ON CONFLICT (name) DO NOTHING;

INSERT INTO permissions(name) VALUES
  ('booking.read'),('booking.create'),('booking.update'),('booking.delete'),
  ('course.read'),('course.create'),('course.update'),('course.delete'),
  ('facility.read'),('facility.create'),('facility.update'),('facility.delete'),
  ('log.read'),('log.create'),('log.update'),('log.delete'),
  ('menu.read'),('menu.create'),('menu.update'),('menu.delete'),
  ('role.read'),('role.create'),('role.update'),('role.delete'),
  ('sport.read'),('sport.create'),('sport.update'),('sport.delete'),
  ('tournament.read'),('tournament.create'),('tournament.update'),('tournament.delete'),
  ('users.read'),('users.create'),('users.update'),('users.delete')
ON CONFLICT (name) DO NOTHING;

-- Grant all permissions to admin
INSERT INTO role_permissions(role_id, permission_id)
SELECT r.id, p.id FROM roles r CROSS JOIN permissions p
WHERE r.name='admin'
ON CONFLICT DO NOTHING;

-- Geography (IR/Tehran minimal)
INSERT INTO countries(iso2, name) VALUES ('IR','Iran')
ON CONFLICT (iso2) DO NOTHING;

INSERT INTO states(country_id, code, name)
SELECT c.id, 'TH', 'Tehran' FROM countries c WHERE c.iso2='IR'
ON CONFLICT DO NOTHING;

INSERT INTO cities(state_id, name)
SELECT s.id, 'Tehran' FROM states s 
JOIN countries c ON c.id=s.country_id AND c.iso2='IR' AND s.name='Tehran'
ON CONFLICT DO NOTHING;

-- Geography (IR/Kish Island minimal)
INSERT INTO states(country_id, code, name)
SELECT c.id, 'HG', 'Hormozgan' FROM countries c WHERE c.iso2='IR'
ON CONFLICT DO NOTHING;

INSERT INTO cities(state_id, name)
SELECT s.id, 'Kish' FROM states s 
JOIN countries c ON c.id=s.country_id AND c.iso2='IR' AND s.name='Hormozgan'
ON CONFLICT DO NOTHING;

-- Geography (UAE/Dubai minimal)
INSERT INTO countries(iso2, name) VALUES ('AE','United Arab Emirates')
ON CONFLICT (iso2) DO NOTHING;

INSERT INTO states(country_id, code, name)
SELECT c.id, 'DU', 'Dubai' FROM countries c WHERE c.iso2='AE'
ON CONFLICT DO NOTHING;

INSERT INTO cities(state_id, name)
SELECT s.id, 'Dubai' FROM states s 
JOIN countries c ON c.id=s.country_id AND c.iso2='AE' AND s.name='Dubai'
ON CONFLICT DO NOTHING;

-- Sports (common set)
INSERT INTO sports(code, name) VALUES
  ('tennis','Tennis'),
  ('padel','Padel'),
  ('football','Football'),
  ('basketball','Basketball'),
  ('swimming','Swimming')
ON CONFLICT (code) DO NOTHING;

-- System admin user (normalized phone: +971 50 000 0001)
INSERT INTO users(
  mobile, mobile_verified, email,
  name, gender_id, role_id, password_must_change, is_active,
  country_id, state_id, city_id, password_hash
)
SELECT
  9999999999, true, 'admin@example.com'::citext,
  'System Admin',
  (SELECT id FROM genders WHERE name='other'),
  (SELECT id FROM roles WHERE name='admin'),
  true, true,
  c.id, s.id, ci.id, '$2b$10$Ya/.4GHT78k6iiIHJ.UsmujQ5FoyPAIK8emjbzZHM/OOHaL25EWKO'
FROM countries c
JOIN states s ON s.country_id=c.id AND c.iso2='IR' AND s.name='Hormozgan'
JOIN cities ci ON ci.state_id=s.id AND ci.name='Kish'
ON CONFLICT DO NOTHING;

-- Seed a default facility and link to Kish
INSERT INTO facilities(code, name, slug, timezone, city, country, country_id, state_id, city_id, email)
SELECT 'HQ','Headquarters Sport Center','hq','Asia/Tehran','Kish','IR', c.id, s.id, ci.id, 'contact@hq.example.com'::citext
FROM countries c
JOIN states s ON s.country_id=c.id AND c.iso2='IR' AND s.name='Hormozgan'
JOIN cities ci ON ci.state_id=s.id AND ci.name='Kish'
ON CONFLICT (code) DO NOTHING;

-- A couple of places
INSERT INTO places(facility_id, name, sport_id, indoor, min_capacity, max_capacity, attributes)
SELECT f.id, 'Padel Court 1', (SELECT id FROM sports WHERE code='padel'), true, 1, 4, '{}'::jsonb
FROM facilities f WHERE f.code='HQ'
ON CONFLICT DO NOTHING;

INSERT INTO places(facility_id, name, sport_id, indoor, min_capacity, max_capacity, attributes)
SELECT f.id, 'Tennis Court 1', (SELECT id FROM sports WHERE code='tennis'), false, 1, 2, '{}'::jsonb
FROM facilities f WHERE f.code='HQ'
ON CONFLICT DO NOTHING;

-- Default pricing profiles for seeded places
INSERT INTO place_pricing_profiles(place_id, name, base_price, currency, timezone, is_default)
SELECT p.id,
       'Default',
       CASE WHEN p.name = 'Padel Court 1' THEN 300 ELSE 200 END,
       'AED',
       f.timezone,
       true
FROM places p
JOIN facilities f ON f.id = p.facility_id
WHERE p.name IN ('Padel Court 1','Tennis Court 1')
  AND NOT EXISTS (
    SELECT 1
    FROM place_pricing_profiles pr
    WHERE pr.place_id = p.id AND pr.is_default = true AND pr.deleted_at IS NULL
  );

-- Working hours (Mon-Fri 08:00-22:00) for seeded places
INSERT INTO place_working_hours(place_id, weekday, segment_no, open_time, close_time, is_closed)
SELECT p.id, d, 1, '08:00'::time, '22:00'::time, false
FROM places p, generate_series(1,5) AS d
WHERE p.name IN ('Padel Court 1','Tennis Court 1')
ON CONFLICT DO NOTHING;

-- Weekends closed by default for seed
INSERT INTO place_working_hours(place_id, weekday, segment_no, open_time, close_time, is_closed)
SELECT p.id, d, 1, '00:00'::time, '00:00'::time, true
FROM places p, (VALUES (0),(6)) AS w(d)
WHERE p.name IN ('Padel Court 1','Tennis Court 1')
ON CONFLICT DO NOTHING;

INSERT INTO log_types (code,created_by) VALUES
  ('API_ACCESS', 1),
  ('API_ERROR', 1),
  ('AUTH_LOGIN_SUCCESS', 1),
  ('AUTH_LOGIN_FAIL', 1),
  ('AUTH_CHANGE_PASSWORD', 1),
  ('AUTH_REQUEST_OTP', 1),
  ('AUTH_VERIFY_OTP_SUCCESS', 1),
  ('AUTH_VERIFY_OTP_FAIL', 1)
ON CONFLICT (code) DO NOTHING;


-- Menus
BEGIN;

-- =========================
-- 1) Seed MENUS (idempotent)
-- =========================

-- Top-level
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Dashboard','/sportbooking/dashboard','mdi:view-dashboard',NULL,20,1
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Dashboard');

INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'New_Booking','/sportbooking/book','mdi:calendar-plus',NULL,30,1
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='New_Booking');

INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Bookings','/sportbooking/bookings','mdi:calendar-check',NULL,40,1
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Bookings');

INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Courses','/sportbooking/courses','mdi:school',NULL,50,1
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Courses');

INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Tournaments','/sportbooking/sportbooking/tournaments','mdi:trophy',NULL,60,1
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Tournaments');

INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Managements','/management','mdi:account-tie',NULL,70,1
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Managements');

INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Reports','/sportbooking/reports','mdi:chart-bar',NULL,80,1
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Reports');

INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Settings','/sportbooking/settings','mdi:cog',NULL,90,1
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Settings');


-- Children under Bookings
WITH parent AS (SELECT id FROM "menus" WHERE "name"='Bookings' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'All_Bookings','/sportbooking/bookings','mdi:format-list-bulleted',p.id,41,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='All_Bookings' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Bookings' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Current_Bookings','/sportbooking/bookings/current','mdi:calendar-clock',p.id,42,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Current_Bookings' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Bookings' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Upcoming_Bookings','/sportbooking/bookings/upcoming','mdi:refresh',p.id,43,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Upcoming_Bookings' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Bookings' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Past_Bookings','/sportbooking/bookings/past','mdi:history',p.id,44,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Past_Bookings' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Bookings' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Canceled_Bookings','/sportbooking/bookings/canceled','mdi:calendar-remove',p.id,45,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Canceled_Bookings' AND "parent_id"=p.id);

-- Children under Courses
WITH parent AS (SELECT id FROM "menus" WHERE "name"='Courses' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'All_Courses','/sportbooking/courses','mdi:format-list-bulleted',p.id,51,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='All_Courses' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Courses' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Current_Courses','/sportbooking/courses/current','mdi:calendar-clock',p.id,52,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Current_Courses' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Courses' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Upcoming_Courses','/sportbooking/courses/upcoming','mdi:refresh',p.id,53,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Upcoming_Courses' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Courses' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Past_Courses','/sportbooking/courses/past','mdi:history',p.id,54,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Past_Courses' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Courses' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Canceled_Courses','/sportbooking/courses/canceled','mdi:cancel',p.id,55,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Canceled_Courses' AND "parent_id"=p.id);

-- Children under Tournaments
WITH parent AS (SELECT id FROM "menus" WHERE "name"='Tournaments' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'All_Tournaments','/sportbooking/tournaments','mdi:format-list-bulleted',p.id,61,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='All_Tournaments' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Tournaments' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Current_Tournaments','/sportbooking/tournaments/current','mdi:calendar-clock',p.id,62,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Current_Tournaments' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Tournaments' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Upcoming_Tournaments','/sportbooking/tournaments/upcoming','mdi:refresh',p.id,63,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Upcoming_Tournaments' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Tournaments' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Past_Tournaments','/sportbooking/tournaments/past','mdi:history',p.id,64,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Past_Tournaments' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Tournaments' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Canceled_Tournaments','/sportbooking/tournaments/canceled','mdi:calendar-remove',p.id,65,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Canceled_Tournaments' AND "parent_id"=p.id);

-- Children under Managements
WITH parent AS (SELECT id FROM "menus" WHERE "name"='Managements' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Users','/management/users','mdi:account-group',p.id,71,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Users' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Managements' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Sports','/management/sports','mdi:whistle',p.id,72,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Sports' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Managements' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Facilities','/management/facilities','mdi:office-building',p.id,73,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Facilities' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Managements' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Places','/management/places','mdi:map-marker',p.id,74,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Places' AND "parent_id"=p.id);

-- Children under Reports
WITH parent AS (SELECT id FROM "menus" WHERE "name"='Reports' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Bills','/sportbooking/reports/bills','mdi:receipt-text',p.id,81,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Bills' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Reports' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Financial_Income','/sportbooking/reports/finance','mdi:cash-multiple',p.id,82,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Financial_Income' AND "parent_id"=p.id);

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Reports' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'Bookings_Report','/sportbooking/reports/bookings','mdi:chart-bar',p.id,83,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='Bookings_Report' AND "parent_id"=p.id);

-- Children under Settings

WITH parent AS (SELECT id FROM "menus" WHERE "name"='Settings' LIMIT 1)
INSERT INTO "menus" ("name","url","icon","parent_id","sort_order","created_by")
SELECT 'SMS_Panel','/sportbooking/settings/sms_panel','mdi:chart-bar',p.id,91,1 FROM parent p
WHERE NOT EXISTS (SELECT 1 FROM "menus" WHERE "name"='SMS_Panel' AND "parent_id"=p.id);

-- ==============================
-- 2) Seed ROLE -> MENU mappings
-- ==============================

-- Map roles display names to their ids (case-insensitive)
WITH roles AS (
  SELECT LOWER(r."name") AS role_name, r."id" AS role_id
  FROM "roles" r
  WHERE LOWER(r."name") IN ('admin','facility manager','facility admin','teacher','user','end user')
),
-- Map menu names to ids (we reference by unique names defined above)
menus AS (
  SELECT "name" AS menu_name, "id" AS menu_id FROM "menus"
),
-- Desired associations (role_name, menu_name)
desired(role_name, menu_name) AS (
  VALUES
    -- Admin
    ('admin','Dashboard'),
    ('admin','Bookings'),
    ('admin','All_Bookings'),
    ('admin','Current_Bookings'),
    ('admin','Upcoming_Bookings'),
    ('admin','Past_Bookings'),
    ('admin','Canceled_Bookings'),
    ('admin','Courses'),
    ('admin','All_Courses'),
    ('admin','Current_Courses'),
    ('admin','Upcoming_Courses'),
    ('admin','Past_Courses'),
    ('admin','Canceled_Courses'),
    ('admin','Tournaments'),
    ('admin','All_Tournaments'),
    ('admin','Current_Tournaments'),
    ('admin','Upcoming_Tournaments'),
    ('admin','Past_Tournaments'),
    ('admin','Canceled_Tournaments'),
    ('admin','Places'),
    ('admin','Managements'),
    ('admin','Users'),
    ('admin','Sports'),
    ('admin','Facilities'),
    ('admin','Reports'),
    ('admin','Financial_Income'),
    ('admin','Bookings_Report'),
    ('admin','Settings'),
    ('admin','SMS_Panel'),

    -- Facility Manager (aka facility admin)
    ('facility manager','Dashboard'),
    ('facility manager','Bookings'),
    ('facility manager','All_Bookings'),
    ('facility manager','Current_Bookings'),
    ('facility manager','Upcoming_Bookings'),
    ('facility manager','Past_Bookings'),
    ('facility manager','Canceled_Bookings'),
    ('facility manager','Courses'),
    ('facility manager','All_Courses'),
    ('facility manager','Current_Courses'),
    ('facility manager','Upcoming_Courses'),
    ('facility manager','Past_Courses'),
    ('facility manager','Canceled_Courses'),
    ('facility manager','Tournaments'),
    ('facility manager','All_Tournaments'),
    ('facility manager','Current_Tournaments'),
    ('facility manager','Upcoming_Tournaments'),
    ('facility manager','Past_Tournaments'),
    ('facility manager','Canceled_Tournaments'),
    ('facility manager','Places'),
    ('facility manager','Reports'),
    ('facility manager','Financial_Income'),
    ('facility manager','Bookings_Report'),

    -- Teacher
    ('teacher','Dashboard'),
    ('teacher','Bookings'),
    ('teacher','All_Bookings'),
    ('teacher','Current_Bookings'),
    ('teacher','Upcoming_Bookings'),
    ('teacher','Past_Bookings'),
    ('teacher','Courses'),
    ('teacher','Current_Courses'),
    ('teacher','Upcoming_Courses'),

    -- End User
    ('user','Dashboard'),
    ('end user','Dashboard'),
    ('user','New_Booking'),
    ('end user','New_Booking'),
    ('user','Bookings'),
    ('end user','Bookings'),
    ('user','All_Bookings'),
    ('end user','All_Bookings'),
    ('user','Current_Bookings'),
    ('end user','Current_Bookings'),
    ('user','Upcoming_Bookings'),
    ('end user','Upcoming_Bookings'),
    ('user','Past Bookings'),
    ('end user','Past_Bookings'),
    ('user','Canceled_Bookings'),
    ('end user','Canceled_Bookings'),
    ('user','Courses'),
    ('end user','Courses'),
    ('user','All Courses'),
    ('end user','All_Courses'),
    ('user','Current_Courses'),
    ('end user','Current_Courses'),
    ('user','Upcoming_Courses'),
    ('end user','Upcoming_Courses'),
    ('user','Past Courses'),
    ('end user','Past_Courses'),
    ('user','Canceled_Courses'),
    ('end user','Canceled_Courses'),
    ('user','Tournaments'),
    ('end user','Tournaments'),
    ('user','All_Tournaments'),
    ('end user','All_Tournaments'),
    ('user','Current_Tournaments'),
    ('end user','Current_Tournaments'),
    ('user','Upcoming_Tournaments'),
    ('end user','Upcoming_Tournaments'),
    ('user','Past_Tournaments'),
    ('end user','Past_Tournaments'),
    ('user','Canceled_Tournaments'),
    ('end user','Canceled_Tournaments'),
    ('user','Reports'),
    ('end user','Reports'),
    ('user','Bills'),
    ('end user','Bills')
)
-- Insert missing links
INSERT INTO "role_menus" ("role_id","menu_id")
SELECT DISTINCT r.role_id, m.menu_id
FROM desired d
JOIN roles r ON r.role_name = d.role_name
JOIN menus m ON m.menu_name = d.menu_name
WHERE NOT EXISTS (
  SELECT 1 FROM "role_menus" rm
  WHERE rm."role_id" = r.role_id AND rm."menu_id" = m.menu_id
);

COMMIT;
