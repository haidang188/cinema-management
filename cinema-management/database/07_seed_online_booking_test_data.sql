USE cinema_management;

-- =========================================================
-- TEST DATA FOR ONLINE BOOKING
-- Run database/06_online_booking.sql before this file.
--
-- Test account:
--   Email:    booking.test@premiere.local
--   Password: 123456
--
-- The script can be run repeatedly. It only inserts missing data.
-- It creates showtimes from tomorrow through the next seven days.
-- =========================================================

-- 1. Test member account
SET @member_role_id = (
    SELECT id
    FROM roles
    WHERE UPPER(name) = 'MEMBER'
    LIMIT 1
);

INSERT INTO users (username, password, role_id)
SELECT
    'booking.test@premiere.local',
    '$2a$10$oqvR.aez1uelDCrKotuHkOg4rTNnEwsosSZJpm.brvSPA487m/wkG',
    @member_role_id
WHERE NOT EXISTS (
    SELECT 1
    FROM users
    WHERE username = 'booking.test@premiere.local'
);

SET @booking_test_user_id = (
    SELECT id
    FROM users
    WHERE username = 'booking.test@premiere.local'
    LIMIT 1
);

INSERT INTO members (
    user_id,
    full_name,
    email,
    phone,
    point_balance,
    membership_level,
    status,
    created_at,
    updated_at
)
SELECT
    @booking_test_user_id,
    'Khách Hàng Test Đặt Vé',
    'booking.test@premiere.local',
    '0900000000',
    0,
    'STANDARD',
    'ACTIVE',
    NOW(),
    NOW()
WHERE NOT EXISTS (
    SELECT 1
    FROM members
    WHERE user_id = @booking_test_user_id
);

-- 2. Required ticket prices for active rooms
DROP TEMPORARY TABLE IF EXISTS booking_seed_prices;

CREATE TEMPORARY TABLE booking_seed_prices (
    room_type VARCHAR(30) NOT NULL,
    seat_type VARCHAR(30) NOT NULL,
    day_type VARCHAR(30) NOT NULL,
    price DECIMAL(10, 2) NOT NULL
);

INSERT INTO booking_seed_prices (room_type, seat_type, day_type, price)
VALUES
    ('2D',   'NORMAL', 'WEEKDAY',  70000),
    ('2D',   'VIP',    'WEEKDAY',  90000),
    ('2D',   'NORMAL', 'WEEKEND',  90000),
    ('2D',   'VIP',    'WEEKEND', 110000),
    ('IMAX', 'NORMAL', 'WEEKDAY', 120000),
    ('IMAX', 'VIP',    'WEEKDAY', 140000),
    ('IMAX', 'NORMAL', 'WEEKEND', 140000),
    ('IMAX', 'VIP',    'WEEKEND', 160000),
    ('VIP',  'NORMAL', 'WEEKDAY', 100000),
    ('VIP',  'VIP',    'WEEKDAY', 120000),
    ('VIP',  'NORMAL', 'WEEKEND', 120000),
    ('VIP',  'VIP',    'WEEKEND', 140000);

INSERT INTO ticket_prices (
    room_type,
    seat_type,
    day_type,
    price,
    status
)
SELECT
    seed.room_type,
    seed.seat_type,
    seed.day_type,
    seed.price,
    'ACTIVE'
FROM booking_seed_prices AS seed
WHERE NOT EXISTS (
    SELECT 1
    FROM ticket_prices AS existing_price
    WHERE existing_price.room_type = seed.room_type
      AND existing_price.seat_type = seed.seat_type
      AND existing_price.day_type = seed.day_type
      AND UPPER(existing_price.status) = 'ACTIVE'
);

DROP TEMPORARY TABLE booking_seed_prices;

-- 3. Showtime schedule template
-- Rooms 1-4 are ACTIVE in the current sample database.
-- Movies 1, 2, 3, 6, 7, 12 and 18 have SHOWING status.
DROP TEMPORARY TABLE IF EXISTS booking_seed_showtimes;

CREATE TEMPORARY TABLE booking_seed_showtimes (
    day_offset INT NOT NULL,
    movie_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    start_at TIME NOT NULL,
    format_name VARCHAR(50) NOT NULL
);

INSERT INTO booking_seed_showtimes (
    day_offset,
    movie_id,
    room_id,
    start_at,
    format_name
)
SELECT
    day_number.day_offset,
    schedule.movie_id,
    schedule.room_id,
    schedule.start_at,
    schedule.format_name
FROM (
    SELECT 1 AS day_offset
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
    UNION ALL SELECT 5
    UNION ALL SELECT 6
    UNION ALL SELECT 7
) AS day_number
CROSS JOIN (
    SELECT 2 AS movie_id, 1 AS room_id, CAST('09:00:00' AS TIME) AS start_at, '2D Phụ đề Việt' AS format_name
    UNION ALL SELECT 7,  1, CAST('13:00:00' AS TIME), '2D Phụ đề Việt'
    UNION ALL SELECT 18, 1, CAST('18:00:00' AS TIME), '2D Phụ đề Việt'

    UNION ALL SELECT 3,  2, CAST('09:30:00' AS TIME), '2D Phụ đề Anh'
    UNION ALL SELECT 6,  2, CAST('13:00:00' AS TIME), '2D Lồng tiếng'
    UNION ALL SELECT 12, 2, CAST('18:00:00' AS TIME), '2D Phụ đề Việt'

    UNION ALL SELECT 1,  3, CAST('08:30:00' AS TIME), 'IMAX Phụ đề Việt'
    UNION ALL SELECT 3,  3, CAST('15:00:00' AS TIME), 'IMAX Phụ đề Việt'
    UNION ALL SELECT 1,  3, CAST('19:30:00' AS TIME), 'IMAX Phụ đề Việt'

    UNION ALL SELECT 7,  4, CAST('09:00:00' AS TIME), '2D Phụ đề Việt'
    UNION ALL SELECT 2,  4, CAST('13:00:00' AS TIME), '2D Lồng tiếng'
    UNION ALL SELECT 18, 4, CAST('17:00:00' AS TIME), '2D Phụ đề Việt'
) AS schedule;

INSERT INTO showtimes (
    movie_id,
    room_id,
    format,
    start_time,
    end_time,
    status,
    created_at
)
SELECT
    seed.movie_id,
    seed.room_id,
    seed.format_name,
    TIMESTAMP(
        DATE_ADD(CURDATE(), INTERVAL seed.day_offset DAY),
        seed.start_at
    ) AS start_time,
    DATE_ADD(
        TIMESTAMP(
            DATE_ADD(CURDATE(), INTERVAL seed.day_offset DAY),
            seed.start_at
        ),
        INTERVAL movie.duration_minutes MINUTE
    ) AS end_time,
    'OPEN',
    NOW()
FROM booking_seed_showtimes AS seed
JOIN movies AS movie
    ON movie.id = seed.movie_id
JOIN cinema_rooms AS room
    ON room.id = seed.room_id
WHERE UPPER(movie.status) = 'SHOWING'
  AND UPPER(room.status) = 'ACTIVE'
  AND NOT EXISTS (
      SELECT 1
      FROM showtimes AS existing_showtime
      WHERE existing_showtime.room_id = seed.room_id
        AND existing_showtime.start_time = TIMESTAMP(
            DATE_ADD(CURDATE(), INTERVAL seed.day_offset DAY),
            seed.start_at
        )
  );

DROP TEMPORARY TABLE booking_seed_showtimes;

-- 4. Normalize format for legacy showtimes that were inserted without it.
UPDATE showtimes
SET format = CASE
    WHEN room_id = 1 THEN '2D Phụ đề Việt'
    WHEN room_id = 2 THEN '2D Phụ đề Anh'
    WHEN room_id = 3 THEN 'IMAX Phụ đề Việt'
    WHEN room_id = 4 THEN '2D Phụ đề Việt'
    WHEN room_id = 5 THEN '4DX Phụ đề Việt'
    ELSE '2D Phụ đề Việt'
END
WHERE format IS NULL OR TRIM(format) = '';

-- 5. Add seat inventory for every showtime.
-- Only ACTIVE physical seats can be sold online.
INSERT IGNORE INTO showtime_seats (
    showtime_id,
    seat_id,
    status,
    held_until
)
SELECT
    showtime.id,
    seat.id,
    'AVAILABLE',
    NULL
FROM showtimes AS showtime
JOIN cinema_rooms AS room
    ON room.id = showtime.room_id
JOIN seats AS seat
    ON seat.room_id = room.id
WHERE UPPER(COALESCE(room.status, 'ACTIVE')) = 'ACTIVE'
  AND UPPER(COALESCE(seat.status, 'ACTIVE')) = 'ACTIVE';

-- 6. Verification result
SELECT
    DATE(showtime.start_time) AS show_date,
    COUNT(DISTINCT showtime.id) AS showtime_count,
    COUNT(showtime_seat.id) AS showtime_seat_count
FROM showtimes AS showtime
LEFT JOIN showtime_seats AS showtime_seat
    ON showtime_seat.showtime_id = showtime.id
WHERE showtime.start_time >= CURDATE()
  AND showtime.start_time < DATE_ADD(CURDATE(), INTERVAL 8 DAY)
GROUP BY DATE(showtime.start_time)
ORDER BY show_date;
