-- Sample domain data for development and demos

-- ---------------------------------------------------------------------------
-- Tournament reference data
-- ---------------------------------------------------------------------------
INSERT INTO tournament_types(code, label)
SELECT format('type_%02s', g.idx), format('Tournament Type %s', g.idx)
FROM generate_series(1, 20) AS g(idx)
ON CONFLICT (code) DO NOTHING;

INSERT INTO tournament_reg_statuses(code, label)
SELECT format('reg_status_%02s', g.idx), format('Registration Status %s', g.idx)
FROM generate_series(1, 20) AS g(idx)
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Sample users per role
-- ---------------------------------------------------------------------------
WITH seq AS (
  SELECT generate_series(1, 5) AS idx
)
INSERT INTO users (
  mobile, mobile_verified, email,
  name, gender_id, role_id,
  password_hash, password_must_change, is_active,
  country, state, city,
  country_id, state_id, city_id,
  marketing_opt_in
)
SELECT
  9100001000 + s.idx,
  true,
  format('admin.sample%02s@example.com', s.idx)::citext,
  format('Admin%02s User', s.idx),
  (SELECT id FROM genders ORDER BY id LIMIT 1 OFFSET ((s.idx - 1) % (SELECT COUNT(*) FROM genders))),
  (SELECT id FROM roles WHERE name='admin'),
  '$2b$10$Ya/.4GHT78k6iiIHJ.UsmujQ5FoyPAIK8emjbzZHM/OOHaL25EWKO',
  false,
  true,
  CASE WHEN s.idx % 2 = 0 THEN 'United Arab Emirates' ELSE 'Iran' END,
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Tehran' END,
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Tehran' END,
  CASE WHEN s.idx % 2 = 0 THEN (SELECT id FROM countries WHERE iso2='AE') ELSE (SELECT id FROM countries WHERE iso2='IR') END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND st.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND st.name='Tehran' LIMIT 1
  ) END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND ci.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND ci.name='Tehran' LIMIT 1
  ) END,
  (s.idx % 2 = 0)
FROM seq s
ON CONFLICT DO NOTHING;

WITH seq AS (
  SELECT generate_series(1, 10) AS idx
)
INSERT INTO users (
  mobile, mobile_verified, email,
  name, gender_id, role_id,
  password_hash, password_must_change, is_active,
  country, state, city,
  country_id, state_id, city_id,
  marketing_opt_in
)
SELECT
  9200001000 + s.idx,
  true,
  format('manager.sample%02s@example.com', s.idx)::citext,
  format('Manager%02s User', s.idx),
  (SELECT id FROM genders ORDER BY id LIMIT 1 OFFSET ((s.idx - 1) % (SELECT COUNT(*) FROM genders))),
  (SELECT id FROM roles WHERE name='manager'),
  '$2b$10$Ya/.4GHT78k6iiIHJ.UsmujQ5FoyPAIK8emjbzZHM/OOHaL25EWKO',
  false,
  true,
  CASE WHEN s.idx % 2 = 0 THEN 'United Arab Emirates' ELSE 'Iran' END,
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Hormozgan' END,
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Kish' END,
  CASE WHEN s.idx % 2 = 0 THEN (SELECT id FROM countries WHERE iso2='AE') ELSE (SELECT id FROM countries WHERE iso2='IR') END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND st.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND st.name='Hormozgan' LIMIT 1
  ) END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND ci.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND ci.name='Kish' LIMIT 1
  ) END,
  (s.idx % 2 = 1)
FROM seq s
ON CONFLICT DO NOTHING;

WITH seq AS (
  SELECT generate_series(1, 20) AS idx
)
INSERT INTO users (
  mobile, mobile_verified, email,
  name, gender_id, role_id,
  password_hash, password_must_change, is_active,
  country, state, city,
  country_id, state_id, city_id,
  marketing_opt_in
)
SELECT
  9300001000 + s.idx,
  true,
  format('teacher.sample%02s@example.com', s.idx)::citext,
  format('Teacher%02s Coach', s.idx),
  (SELECT id FROM genders ORDER BY id LIMIT 1 OFFSET ((s.idx - 1) % (SELECT COUNT(*) FROM genders))),
  (SELECT id FROM roles WHERE name='teacher'),
  '$2b$10$Ya/.4GHT78k6iiIHJ.UsmujQ5FoyPAIK8emjbzZHM/OOHaL25EWKO',
  false,
  true,
  CASE WHEN s.idx % 2 = 0 THEN 'United Arab Emirates' ELSE 'Iran' END,
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Hormozgan' END,
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Kish' END,
  CASE WHEN s.idx % 2 = 0 THEN (SELECT id FROM countries WHERE iso2='AE') ELSE (SELECT id FROM countries WHERE iso2='IR') END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND st.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND st.name='Hormozgan' LIMIT 1
  ) END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND ci.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND ci.name='Kish' LIMIT 1
  ) END,
  (s.idx % 2 = 0)
FROM seq s
ON CONFLICT DO NOTHING;

WITH seq AS (
  SELECT generate_series(1, 25) AS idx
)
INSERT INTO users (
  mobile, mobile_verified, email,
  name, gender_id, role_id,
  password_hash, password_must_change, is_active,
  country, state, city,
  country_id, state_id, city_id,
  marketing_opt_in
)
SELECT
  9400001000 + s.idx,
  true,
  format('user.sample%02s@example.com', s.idx)::citext,
  format('User%02s Sample', s.idx),
  (SELECT id FROM genders ORDER BY id LIMIT 1 OFFSET ((s.idx - 1) % (SELECT COUNT(*) FROM genders))),
  (SELECT id FROM roles WHERE name='user'),
  '$2b$10$Ya/.4GHT78k6iiIHJ.UsmujQ5FoyPAIK8emjbzZHM/OOHaL25EWKO',
  false,
  true,
  CASE WHEN s.idx % 2 = 0 THEN 'United Arab Emirates' ELSE 'Iran' END,
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Tehran' END,
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Tehran' END,
  CASE WHEN s.idx % 2 = 0 THEN (SELECT id FROM countries WHERE iso2='AE') ELSE (SELECT id FROM countries WHERE iso2='IR') END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND st.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND st.name='Tehran' LIMIT 1
  ) END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND ci.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND ci.name='Tehran' LIMIT 1
  ) END,
  (s.idx % 2 = 1)
FROM seq s
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Facilities and places
-- ---------------------------------------------------------------------------
WITH seq AS (
  SELECT generate_series(1, 20) AS idx
)
INSERT INTO facilities (
  code, name, slug, timezone,
  address, city, state, country,
  country_id, state_id, city_id,
  phone, email
)
SELECT
  format('FAC%03s', s.idx),
  format('Sample Facility %s', s.idx),
  format('facility-%03s', s.idx),
  CASE WHEN s.idx % 2 = 0 THEN 'Asia/Dubai' ELSE 'Asia/Tehran' END,
  format('Sample Street %s', s.idx),
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Kish' END,
  CASE WHEN s.idx % 2 = 0 THEN 'Dubai' ELSE 'Hormozgan' END,
  CASE WHEN s.idx % 2 = 0 THEN 'AE' ELSE 'IR' END,
  CASE WHEN s.idx % 2 = 0 THEN (SELECT id FROM countries WHERE iso2='AE') ELSE (SELECT id FROM countries WHERE iso2='IR') END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND st.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT st.id FROM states st JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND st.name='Hormozgan' LIMIT 1
  ) END,
  CASE WHEN s.idx % 2 = 0 THEN (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='AE' AND ci.name='Dubai' LIMIT 1
  ) ELSE (
    SELECT ci.id FROM cities ci
    JOIN states st ON st.id = ci.state_id
    JOIN countries co ON co.id = st.country_id
    WHERE co.iso2='IR' AND ci.name='Kish' LIMIT 1
  ) END,
  format('+971500%04s', s.idx),
  format('facility%03s@example.com', s.idx)::citext
FROM seq s
ON CONFLICT (code) DO NOTHING;

WITH facility_info AS (
  SELECT f.id, f.timezone,
         row_number() OVER (ORDER BY f.id) AS row_no
  FROM facilities f
  WHERE f.code LIKE 'FAC%'
)
INSERT INTO places (
  facility_id, name, sport_id,
  indoor, min_capacity, max_capacity,
  attributes
)
SELECT
  fi.id,
  format('%s Court %s', sp.code, gs.place_no),
  sp.id,
  (gs.place_no % 2 = 0),
  1,
  4 + ((fi.row_no + gs.place_no) % 4),
  jsonb_build_object(
    'lighting', (gs.place_no % 2 = 0),
    'level', CASE WHEN gs.place_no % 2 = 0 THEN 'advanced' ELSE 'beginner' END
  )
FROM facility_info fi
CROSS JOIN LATERAL generate_series(1, 3) AS gs(place_no)
CROSS JOIN LATERAL (
  SELECT s.id, s.code
  FROM sports s
  ORDER BY s.id
  OFFSET ((fi.row_no + gs.place_no - 1) % (SELECT COUNT(*) FROM sports))
  LIMIT 1
) sp
ON CONFLICT DO NOTHING;

WITH target_places AS (
  SELECT p.id
  FROM places p
  JOIN facilities f ON f.id = p.facility_id
  WHERE f.code LIKE 'FAC%'
)
INSERT INTO place_working_hours (
  place_id, weekday, segment_no, open_time, close_time, is_closed
)
SELECT
  tp.id,
  dow,
  1,
  '08:00'::time,
  '22:00'::time,
  false
FROM target_places tp
CROSS JOIN generate_series(0, 6) AS dow
ON CONFLICT DO NOTHING;

WITH target_places AS (
  SELECT p.id, f.timezone,
         row_number() OVER (ORDER BY p.id) AS row_no
  FROM places p
  JOIN facilities f ON f.id = p.facility_id
  WHERE f.code LIKE 'FAC%'
)
INSERT INTO place_pricing_profiles (
  place_id, name, base_price, currency, timezone, is_default, metadata
)
SELECT
  tp.id,
  'Default',
  120 + tp.row_no * 5,
  'IRR',
  tp.timezone,
  true,
  jsonb_build_object('profile', 'sample', 'tier', CASE WHEN tp.row_no % 2 = 0 THEN 'standard' ELSE 'premium' END)
FROM target_places tp
ON CONFLICT DO NOTHING;

WITH profiles AS (
  SELECT pr.id, pr.place_id,
         row_number() OVER (ORDER BY pr.id) AS row_no
  FROM place_pricing_profiles pr
  JOIN places p ON p.id = pr.place_id
  JOIN facilities f ON f.id = p.facility_id
  WHERE f.code LIKE 'FAC%'
)
INSERT INTO place_price_rules (
  pricing_profile_id, name, priority,
  override_type, override_value, currency,
  effective_dates, time_window, weekdays,
  metadata
)
SELECT
  pf.id,
  format('Seasonal Adjustment %s', pf.row_no),
  100 + (pf.row_no % 5),
  CASE WHEN pf.row_no % 3 = 0 THEN 'delta_percent' ELSE 'delta_amount' END,
  CASE WHEN pf.row_no % 3 = 0 THEN 10 ELSE 40 + pf.row_no END,
  CASE WHEN pf.row_no % 3 = 0 THEN NULL ELSE 'IRR' END,
  daterange(
    DATE '2024-01-01' + (pf.row_no::int),
    DATE '2024-01-01' + ((pf.row_no::int) + 14),
    '[]'
  ),
  '[08:00,12:00]'::text,
  ARRAY[1,2,3,4,5],
  jsonb_build_object('reason', 'sample rule', 'seq', pf.row_no)
FROM profiles pf
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Facility staffing
-- ---------------------------------------------------------------------------
WITH facilities AS (
  SELECT f.id,
         row_number() OVER (ORDER BY f.id) AS row_no
  FROM facilities f
  WHERE f.code LIKE 'FAC%'
),
managers AS (
  SELECT u.id,
         row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'manager.sample%'
),
manager_count AS (
  SELECT COUNT(*) AS total FROM managers
),
manager_role AS (
  SELECT id FROM roles WHERE name='manager'
)
INSERT INTO facility_staff (user_id, facility_id, role_id)
SELECT
  m.id,
  f.id,
  mr.id
FROM facilities f
JOIN manager_count mc ON TRUE
JOIN managers m ON m.row_no = ((f.row_no - 1) % mc.total) + 1
CROSS JOIN manager_role mr
ON CONFLICT DO NOTHING;

WITH facilities AS (
  SELECT f.id,
         row_number() OVER (ORDER BY f.id) AS row_no
  FROM facilities f
  WHERE f.code LIKE 'FAC%'
),
teachers AS (
  SELECT u.id,
         row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'teacher.sample%'
),
teacher_count AS (
  SELECT COUNT(*) AS total FROM teachers
),
teacher_role AS (
  SELECT id FROM roles WHERE name='teacher'
)
INSERT INTO facility_staff (user_id, facility_id, role_id)
SELECT
  t.id,
  f.id,
  tr.id
FROM facilities f
JOIN teacher_count tc ON TRUE
JOIN teachers t ON t.row_no = ((f.row_no - 1) % tc.total) + 1
CROSS JOIN teacher_role tr
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Teacher specialisations and availability
-- ---------------------------------------------------------------------------
WITH teachers AS (
  SELECT u.id,
         row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'teacher.sample%'
)
INSERT INTO teacher_profiles (
  user_id, bio, hourly_rate, rating_avg, rating_count
)
SELECT
  t.id,
  format('Coach with %s years of experience delivering elite training.', 3 + (t.row_no % 5)),
  200 + t.row_no * 10,
  LEAST(4.8, 2.5 + ((t.row_no % 10)::numeric / 10)),
  20 + t.row_no
FROM teachers t
ON CONFLICT (user_id) DO NOTHING;

WITH teachers AS (
  SELECT u.id,
         row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'teacher.sample%'
)
INSERT INTO teacher_sports (teacher_id, sport_id)
SELECT
  t.id,
  sp.id
FROM teachers t
JOIN LATERAL generate_series(0, 2) AS gs(offs) ON TRUE
CROSS JOIN LATERAL (
  SELECT s.id
  FROM sports s
  ORDER BY s.id
  OFFSET ((t.row_no + gs.offs - 1) % (SELECT COUNT(*) FROM sports))
  LIMIT 1
) sp
ON CONFLICT DO NOTHING;

WITH teachers AS (
  SELECT u.id
  FROM users u
  WHERE u.email::text LIKE 'teacher.sample%'
),
operating_cities AS (
  SELECT ci.id AS city_id
  FROM cities ci
  JOIN states st ON st.id = ci.state_id
  JOIN countries co ON co.id = st.country_id
  WHERE (co.iso2='AE' AND ci.name='Dubai') OR (co.iso2='IR' AND ci.name='Kish')
)
INSERT INTO teacher_cities (teacher_id, city_id)
SELECT
  t.id,
  oc.city_id
FROM teachers t
CROSS JOIN operating_cities oc
ON CONFLICT DO NOTHING;

WITH teachers AS (
  SELECT u.id
  FROM users u
  WHERE u.email::text LIKE 'teacher.sample%'
)
INSERT INTO teacher_working_hours (
  teacher_id, weekday, segment_no, open_time, close_time, is_closed
)
SELECT
  t.id,
  dow,
  1,
  '08:00'::time,
  CASE WHEN dow IN (5,6) THEN '18:00'::time ELSE '20:00'::time END,
  false
FROM teachers t
CROSS JOIN generate_series(0, 6) AS dow
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Courses and sessions
-- ---------------------------------------------------------------------------
WITH course_seq AS (
  SELECT generate_series(1, 25) AS idx
),
managers AS (
  SELECT u.id, row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'manager.sample%'
),
manager_count AS (
  SELECT COUNT(*) AS total FROM managers
)
INSERT INTO courses (
  title, description, sport_id,
  min_capacity, max_capacity,
  booking_deadline, is_active,
  created_by
)
SELECT
  format('Sample Course %s', cs.idx),
  format('Intensive skills program %s with progressive drills.', cs.idx),
  (
    SELECT s.id FROM sports s
    ORDER BY s.id
    OFFSET ((cs.idx - 1) % (SELECT COUNT(*) FROM sports))
    LIMIT 1
  ),
  6,
  16 + ((cs.idx - 1) % 4) * 2,
  (
    now() + ((cs.idx - 1) * INTERVAL '2 days')
  ),
  true,
  (
    SELECT m.id
    FROM manager_count mc
    JOIN managers m ON m.row_no = ((cs.idx - 1) % mc.total) + 1
    LIMIT 1
  )
FROM course_seq cs
ON CONFLICT DO NOTHING;

UPDATE courses
SET booking_deadline = now() + interval '30 days'
WHERE title LIKE 'Sample Course %'
  AND booking_deadline < now();

INSERT INTO course_images (course_id, url, sort_order)
SELECT
  c.id,
  format('https://cdn.example.com/courses/%s/cover.jpg', c.id),
  1
FROM courses c
WHERE c.title LIKE 'Sample Course %'
  AND NOT EXISTS (
    SELECT 1 FROM course_images ci WHERE ci.course_id = c.id
  );

WITH course_data AS (
  SELECT c.id, c.sport_id,
         row_number() OVER (ORDER BY c.id) AS row_no
  FROM courses c
  WHERE c.title LIKE 'Sample Course %'
),
teachers AS (
  SELECT u.id, row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'teacher.sample%'
),
teacher_count AS (
  SELECT COUNT(*) AS total FROM teachers
),
places_by_sport AS (
  SELECT p.id, p.sport_id,
         row_number() OVER (PARTITION BY p.sport_id ORDER BY p.id) AS row_no
  FROM places p
  JOIN facilities f ON f.id = p.facility_id
  WHERE f.code LIKE 'FAC%'
),
place_counts AS (
  SELECT sport_id, COUNT(*) AS total
  FROM places_by_sport
  GROUP BY sport_id
)
INSERT INTO course_sessions (
  course_id, teacher_id, place_id,
  slot, price, max_capacity
)
SELECT
  cd.id,
  (
    SELECT t.id
    FROM teacher_count tc
    JOIN teachers t ON t.row_no = ((cd.row_no + session_idx - 2) % tc.total) + 1
    LIMIT 1
  ),
  (
    SELECT pb.id
    FROM place_counts pc
    JOIN places_by_sport pb ON pb.sport_id = cd.sport_id
    WHERE pc.sport_id = cd.sport_id
      AND pb.row_no = ((cd.row_no + session_idx - 2) % pc.total) + 1
    LIMIT 1
  ),
  tstzrange(
    TIMESTAMP '2024-07-01 08:00:00+00' + ((cd.row_no + session_idx - 2) * INTERVAL '1 day'),
    TIMESTAMP '2024-07-01 10:00:00+00' + ((cd.row_no + session_idx - 2) * INTERVAL '1 day'),
    '[]'
  ),
  180 + cd.row_no * 6 + session_idx * 12,
  12 + ((cd.row_no + session_idx) % 4) * 2
FROM course_data cd
CROSS JOIN generate_series(1, 2) AS session_idx
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Bookings and booking lines
-- ---------------------------------------------------------------------------
WITH user_pool AS (
  SELECT u.id, row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'user.sample%'
),
user_count AS (
  SELECT COUNT(*) AS total FROM user_pool
),
status_pool AS (
  SELECT b.id, row_number() OVER (ORDER BY b.id) AS row_no
  FROM booking_statuses b
  WHERE b.code IN ('confirmed','hold','awaiting_teacher','pending_payment')
),
status_count AS (
  SELECT COUNT(*) AS total FROM status_pool
),
booking_seed AS (
  SELECT
    gs.idx,
    (SELECT up.id FROM user_pool up CROSS JOIN user_count uc WHERE up.row_no = ((gs.idx - 1) % uc.total) + 1 LIMIT 1) AS user_id,
    (SELECT sp.id FROM status_pool sp CROSS JOIN status_count sc WHERE sp.row_no = ((gs.idx - 1) % sc.total) + 1 LIMIT 1) AS status_id,
    240 + gs.idx * 8 AS total,
    'IRR'::text AS currency,
    TIMESTAMP '2024-07-15 12:00:00+00' + (gs.idx * INTERVAL '1 hour') AS hold_expires_at,
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::uuid, format('sample-booking-%s', gs.idx)) AS idempotency_key
  FROM generate_series(1, 40) AS gs(idx)
)
INSERT INTO bookings (
  user_id, status_id, total, currency,
  hold_expires_at, idempotency_key
)
SELECT user_id, status_id, total, currency, hold_expires_at, idempotency_key
FROM booking_seed
ON CONFLICT (idempotency_key) DO NOTHING;

WITH booking_seed AS (
  SELECT
    gs.idx,
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::uuid, format('sample-booking-%s', gs.idx)) AS idempotency_key
  FROM generate_series(1, 40) AS gs(idx)
),
sample_bookings AS (
  SELECT
    b.id,
    bs.idx,
    row_number() OVER (ORDER BY bs.idx) AS row_no
  FROM booking_seed bs
  JOIN bookings b ON b.idempotency_key = bs.idempotency_key
),
course_sessions_data AS (
  SELECT cs.id, cs.place_id, cs.teacher_id, cs.slot,
         row_number() OVER (ORDER BY cs.id) AS row_no
  FROM course_sessions cs
  JOIN courses c ON c.id = cs.course_id
  WHERE c.title LIKE 'Sample Course %'
),
pricing AS (
  SELECT pr.id, pr.place_id
  FROM place_pricing_profiles pr
  WHERE pr.is_default = true
),
course_lines AS (
  SELECT sb.id AS booking_id,
         cs.id AS course_session_id,
         cs.place_id,
         cs.teacher_id,
         cs.slot,
         row_number() OVER () AS seq
  FROM sample_bookings sb
  JOIN course_sessions_data cs ON cs.row_no = sb.row_no
  WHERE sb.row_no <= 20
)
INSERT INTO booking_lines (
  booking_id, place_id, teacher_id, slot,
  qty, price, currency,
  pricing_profile_id, pricing_details,
  course_session_id
)
SELECT
  cl.booking_id,
  cl.place_id,
  cl.teacher_id,
  cl.slot,
  1,
  20000000 + cl.seq * 10000,
  'IRR',
  (SELECT pr.id FROM pricing pr WHERE pr.place_id = cl.place_id LIMIT 1),
  jsonb_build_object('source', 'course'),
  cl.course_session_id
FROM course_lines cl
ON CONFLICT DO NOTHING;

WITH booking_seed AS (
  SELECT
    gs.idx,
    uuid_generate_v5('00000000-0000-0000-0000-000000000000'::uuid, format('sample-booking-%s', gs.idx)) AS idempotency_key
  FROM generate_series(1, 40) AS gs(idx)
),
sample_bookings AS (
  SELECT
    b.id,
    bs.idx,
    row_number() OVER (ORDER BY bs.idx) AS row_no
  FROM booking_seed bs
  JOIN bookings b ON b.idempotency_key = bs.idempotency_key
  WHERE b.id NOT IN (SELECT booking_id FROM booking_lines)
),
places_data AS (
  SELECT p.id, row_number() OVER (ORDER BY p.id) AS row_no
  FROM places p
  JOIN facilities f ON f.id = p.facility_id
  WHERE f.code LIKE 'FAC%'
),
place_count AS (
  SELECT COUNT(*) AS total FROM places_data
),
pricing AS (
  SELECT pr.id, pr.place_id
  FROM place_pricing_profiles pr
  WHERE pr.is_default = true
)
INSERT INTO booking_lines (
  booking_id, place_id, teacher_id, slot,
  qty, price, currency,
  pricing_profile_id, pricing_details
)
SELECT
  sb.id,
  (
    SELECT pd.id
    FROM place_count pc
    JOIN places_data pd ON pd.row_no = ((sb.row_no - 1) % pc.total) + 1
    LIMIT 1
  ),
  NULL,
  tstzrange(
    TIMESTAMP '2024-08-01 04:30:00+00' + (((sb.row_no - 1) % 6) * INTERVAL '2 hours'),
    TIMESTAMP '2024-08-01 04:30:00+00' + (((sb.row_no - 1) % 6) * INTERVAL '2 hours') + INTERVAL '90 minutes',
    '[]'
  ),
  1,
  260 + sb.row_no * 6,
  'IRR',
  (
    SELECT pr.id
    FROM pricing pr
    WHERE pr.place_id = (
      SELECT pd2.id
      FROM place_count pc
      JOIN places_data pd2 ON pd2.row_no = ((sb.row_no - 1) % pc.total) + 1
      LIMIT 1
    )
    LIMIT 1
  ),
  jsonb_build_object('source', 'direct')
FROM sample_bookings sb
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Tournaments and related data
-- ---------------------------------------------------------------------------
WITH tournament_seq AS (
  SELECT generate_series(1, 20) AS idx
),
managers AS (
  SELECT u.id, row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'manager.sample%'
),
manager_count AS (
  SELECT COUNT(*) AS total FROM managers
)
INSERT INTO tournaments (
  title, description, sport_id, type_id,
  min_capacity, max_capacity,
  booking_deadline, start_at, end_at,
  facility_id, event_place_id, event_slot,
  is_active, created_by
)
SELECT
  format('Sample Tournament %s', ts.idx),
  format('Tournament event number %s with mixed skill levels.', ts.idx),
  (
    SELECT s.id FROM sports s
    ORDER BY s.id
    OFFSET ((ts.idx - 1) % (SELECT COUNT(*) FROM sports))
    LIMIT 1
  ),
  (
    SELECT tt.id FROM tournament_types tt
    ORDER BY tt.id
    OFFSET ((ts.idx - 1) % (SELECT COUNT(*) FROM tournament_types))
    LIMIT 1
  ),
  8,
  48,
  (TIMESTAMP '2024-09-01 00:00:00+00' + ((ts.idx - 1) * INTERVAL '1 day')),
  (TIMESTAMP '2024-09-08 09:00:00+00' + ((ts.idx - 1) * INTERVAL '1 day')),
  (TIMESTAMP '2024-09-08 15:00:00+00' + ((ts.idx - 1) * INTERVAL '1 day')),
  (
    SELECT f.id
    FROM facilities f
    WHERE f.code LIKE 'FAC%'
    ORDER BY f.id
    OFFSET ((ts.idx - 1) % (SELECT COUNT(*) FROM facilities WHERE code LIKE 'FAC%'))
    LIMIT 1
  ),
  (
    SELECT p.id
    FROM places p
    JOIN facilities f ON f.id = p.facility_id
    WHERE f.code LIKE 'FAC%'
      AND p.sport_id = (
        SELECT s.id FROM sports s
        ORDER BY s.id
        OFFSET ((ts.idx - 1) % (SELECT COUNT(*) FROM sports))
        LIMIT 1
      )
    ORDER BY p.id
    LIMIT 1
  ),
  tstzrange(
    (TIMESTAMP '2024-09-08 09:00:00+00' + ((ts.idx - 1) * INTERVAL '1 day')),
    (TIMESTAMP '2024-09-08 15:00:00+00' + ((ts.idx - 1) * INTERVAL '1 day')),
    '[]'
  ),
  true,
  (
    SELECT m.id
    FROM manager_count mc
    JOIN managers m ON m.row_no = ((ts.idx - 1) % mc.total) + 1
    LIMIT 1
  )
FROM tournament_seq ts
ON CONFLICT DO NOTHING;

WITH tournaments AS (
  SELECT t.id
  FROM tournaments t
  WHERE t.title LIKE 'Sample Tournament %'
)
INSERT INTO tournament_images (
  tournament_id, url, sort_order
)
SELECT
  t.id,
  format('https://cdn.example.com/tournaments/%s/image-%s.jpg', t.id, img.seq),
  img.seq
FROM tournaments t
CROSS JOIN LATERAL generate_series(1, 2) AS img(seq)
ON CONFLICT DO NOTHING;

WITH tournaments AS (
  SELECT t.id, t.booking_deadline,
         row_number() OVER (ORDER BY t.id) AS row_no
  FROM tournaments t
  WHERE t.title LIKE 'Sample Tournament %'
),
participants AS (
  SELECT u.id, row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'teacher.sample%' OR u.email::text LIKE 'user.sample%'
),
participant_count AS (
  SELECT COUNT(*) AS total FROM participants
),
statuses AS (
  SELECT trs.id, row_number() OVER (ORDER BY trs.id) AS row_no
  FROM tournament_reg_statuses trs
)
INSERT INTO tournament_registrations (
  tournament_id, user_id, status_id, hold_expires_at
)
SELECT
  trn.id,
  (
    SELECT p.id
    FROM participant_count pc
    JOIN participants p ON p.row_no = ((trn.row_no + reg_idx - 2) % pc.total) + 1
    LIMIT 1
  ),
  (
    SELECT st.id
    FROM statuses st
    ORDER BY st.row_no
    OFFSET ((trn.row_no + reg_idx - 2) % (SELECT COUNT(*) FROM statuses))
    LIMIT 1
  ),
  CASE WHEN reg_idx % 3 = 0 THEN trn.booking_deadline - INTERVAL '1 day' ELSE NULL END
FROM tournaments trn
CROSS JOIN generate_series(1, 4) AS reg_idx
ON CONFLICT DO NOTHING;

WITH match_data AS (
  SELECT
    r.tournament_id,
    r.user_id,
    row_number() OVER (PARTITION BY r.tournament_id ORDER BY r.id) AS pos
  FROM tournament_registrations r
  JOIN tournaments t ON t.id = r.tournament_id
  WHERE t.title LIKE 'Sample Tournament %'
),
slots AS (
  SELECT
    t.id AS tournament_id,
    row_number() OVER (ORDER BY t.id) AS row_no,
    t.event_slot
  FROM tournaments t
  WHERE t.title LIKE 'Sample Tournament %'
)
INSERT INTO tournament_matches (
  tournament_id, round_no, match_no,
  a_user_id, b_user_id,
  place_id, slot, status
)
SELECT
  s.tournament_id,
  1,
  (m1.pos + 1) / 2,
  m1.user_id,
  m2.user_id,
  (
    SELECT event_place_id FROM tournaments t WHERE t.id = s.tournament_id
  ),
  tstzrange(
    lower(s.event_slot) + ((m1.pos - 1) / 2) * INTERVAL '2 hours',
    lower(s.event_slot) + ((m1.pos - 1) / 2) * INTERVAL '2 hours' + INTERVAL '2 hours',
    '[]'
  ),
  CASE WHEN (((m1.pos + 1) / 2) % 3) = 0 THEN 'completed' ELSE 'scheduled' END
FROM slots s
JOIN match_data m1 ON m1.tournament_id = s.tournament_id AND m1.pos % 2 = 1
JOIN match_data m2 ON m2.tournament_id = s.tournament_id AND m2.pos = m1.pos + 1
ON CONFLICT DO NOTHING;

WITH tournament_matches_completed AS (
  SELECT tm.tournament_id, tm.a_user_id, tm.b_user_id,
         tm.match_no,
         row_number() OVER (PARTITION BY tm.tournament_id ORDER BY tm.match_no) AS row_no
  FROM tournament_matches tm
  WHERE tm.status='completed'
)
UPDATE tournament_matches tm
SET a_score = 3 + (tm.match_no % 4),
    b_score = 1 + (tm.match_no % 3),
    winner_user_id = CASE WHEN (tm.match_no % 2) = 0 THEN tm.a_user_id ELSE tm.b_user_id END,
    status = 'completed'
WHERE tm.id IN (
  SELECT tm2.id FROM tournament_matches tm2
  JOIN tournament_matches_completed tmc ON tmc.tournament_id = tm2.tournament_id AND tmc.match_no = tm2.match_no
);

WITH standings AS (
  SELECT DISTINCT tm.tournament_id
  FROM tournament_matches tm
  JOIN tournaments t ON t.id = tm.tournament_id
  WHERE t.title LIKE 'Sample Tournament %'
)
INSERT INTO tournament_standings (
  tournament_id, user_id, points,
  wins, losses, draws,
  score_for, score_against
)
SELECT
  r.tournament_id,
  r.user_id,
  (row_number() OVER (PARTITION BY r.tournament_id ORDER BY r.user_id) % 10) + 5,
  (row_number() OVER (PARTITION BY r.tournament_id ORDER BY r.user_id) % 4),
  (row_number() OVER (PARTITION BY r.tournament_id ORDER BY r.user_id) % 3),
  (row_number() OVER (PARTITION BY r.tournament_id ORDER BY r.user_id) % 2),
  10 + (row_number() OVER (PARTITION BY r.tournament_id ORDER BY r.user_id) * 2),
  6 + (row_number() OVER (PARTITION BY r.tournament_id ORDER BY r.user_id))
FROM standings st
JOIN tournament_registrations r ON r.tournament_id = st.tournament_id
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- Logs and sessions
-- ---------------------------------------------------------------------------
WITH log_types_cte AS (
  SELECT lt.id,
         row_number() OVER (ORDER BY lt.id) AS row_no
  FROM log_types lt
),
actors AS (
  SELECT u.id, row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'admin.sample%' OR u.email::text LIKE 'manager.sample%'
),
actor_count AS (
  SELECT COUNT(*) AS total FROM actors
)
INSERT INTO logs (
  type_id, text1, text2, text3, text4,
  created_by, created_at
)
SELECT
  lt.id,
  format('Log event %s triggered', seq.idx),
  format('Detail line %s', seq.idx),
  format('Aux info %s', seq.idx),
  NULL,
  (
    SELECT a.id
    FROM actor_count ac
    JOIN actors a ON a.row_no = ((seq.idx - 1) % ac.total) + 1
    LIMIT 1
  ),
  TIMESTAMP '2024-07-01 10:00:00+00' + (seq.idx * INTERVAL '30 minutes')
FROM generate_series(1, 40) AS seq(idx)
JOIN log_types_cte lt ON lt.row_no = ((seq.idx - 1) % (SELECT COUNT(*) FROM log_types_cte)) + 1
ON CONFLICT DO NOTHING;

WITH session_users AS (
  SELECT u.id, row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'user.sample%'
)
INSERT INTO sessions (
  id, user_id, created_at, expires_at, ip, user_agent
)
SELECT
  uuid_generate_v4(),
  su.id,
  TIMESTAMP '2024-07-01 08:00:00+00' + (su.row_no * INTERVAL '1 hour'),
  TIMESTAMP '2024-07-01 18:00:00+00' + (su.row_no * INTERVAL '1 hour'),
  format('192.168.1.%s', ((su.row_no % 200) + 1))::inet,
  format('SampleAgent/%s', su.row_no)
FROM session_users su
LIMIT 20;

WITH otp_users AS (
  SELECT u.mobile, row_number() OVER (ORDER BY u.id) AS row_no
  FROM users u
  WHERE u.email::text LIKE 'user.sample%'
)
INSERT INTO auth_otp (
  mobile, code, purpose,
  issued_at, expires_at, attempts
)
SELECT
  ou.mobile,
  format('OTP%04s', ou.row_no),
  CASE WHEN ou.row_no % 2 = 0 THEN 'login' ELSE 'register' END,
  TIMESTAMP '2024-07-01 09:00:00+00' + (ou.row_no * INTERVAL '10 minutes'),
  TIMESTAMP '2024-07-01 10:00:00+00' + (ou.row_no * INTERVAL '10 minutes'),
  ou.row_no % 3
FROM otp_users ou
LIMIT 20;
