-- Premiere Cinemas
-- Seed 12: phim phổ biến, 20 thành viên, lịch chiếu, đặt vé, thanh toán,
-- vé điện tử, điểm thành viên và đánh giá.
-- Yêu cầu: MySQL 8.x; đã chạy các migration 04, 06, 09 và 10.
--
-- Tất cả tài khoản demo có mật khẩu: 123456
-- File có thể chạy lại: dữ liệu định danh dùng tiền tố DEMO và được chống trùng.

USE cinema_management;
SET NAMES utf8mb4;

SET @previous_sql_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- =====================================================
-- 1. PHIM PHỔ BIẾN
-- Poster dùng URL CDN trực tiếp; không cần tải về máy.
-- Trailer là link YouTube và có thể phát bằng modal trailer hiện tại.
-- =====================================================

DROP TEMPORARY TABLE IF EXISTS seed_movies;
CREATE TEMPORARY TABLE seed_movies (
    seed_order INT PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    description TEXT,
    duration_minutes INT NOT NULL,
    release_date DATE,
    age_rating VARCHAR(10),
    director VARCHAR(100),
    cast_text TEXT,
    language_name VARCHAR(50),
    poster_url VARCHAR(255),
    trailer_url VARCHAR(255),
    genre_1 VARCHAR(50),
    genre_2 VARCHAR(50)
);

INSERT INTO seed_movies VALUES
(1, 'A Minecraft Movie',
 'Bốn người lạc vào Overworld, một thế giới khối vuông kỳ lạ, và phải học cách làm chủ nơi này để tìm đường trở về nhà.',
 101, '2025-04-04', 'P', 'Jared Hess',
 'Jason Momoa, Jack Black, Emma Myers, Danielle Brooks, Jennifer Coolidge',
 'Tiếng Anh',
 'https://image.tmdb.org/t/p/w500/cq9z69AyIXeL2H14bqHE5ukm3M9.jpg',
 'https://www.youtube.com/watch?v=R59ZeaOcUbY',
 'Phiêu lưu', 'Hài'),
(2, 'Lilo & Stitch',
 'Cô bé Lilo kết bạn với Stitch, một sinh vật ngoài hành tinh nghịch ngợm, và cùng nhau khám phá ý nghĩa của gia đình.',
 108, '2025-05-23', 'P', 'Dean Fleischer Camp',
 'Maia Kealoha, Sydney Elizebeth Agudong, Chris Sanders, Zach Galifianakis',
 'Tiếng Anh',
 'https://image.tmdb.org/t/p/w500/7c5VBuCbjZOk7lSfj9sMpmDIaKX.jpg',
 'https://www.youtube.com/watch?v=pKmKt8mPAL4',
 'Gia đình', 'Phiêu lưu'),
(3, 'Bí Kíp Luyện Rồng',
 'Hiccup, một thiếu niên Viking, kết bạn với rồng Toothless và thay đổi cách hai giống loài nhìn nhận về nhau.',
 125, '2025-06-13', 'P', 'Dean DeBlois',
 'Mason Thames, Nico Parker, Gerard Butler, Nick Frost',
 'Tiếng Anh',
 'https://images.contentstack.io/v3/assets/blt13adb7e2033fcee5/blt1123d6b8c57cd896/693391e496d17c8b3c05af8c/HowToTrainYourDragon2025_Poster.jpg?width=2560',
 'https://www.youtube.com/watch?v=22w7z_lT6YM',
 'Phiêu lưu', 'Giả tưởng'),
(4, 'Jurassic World: Tái Sinh',
 'Một đội thám hiểm tiến vào vùng cấm để thu thập vật liệu di truyền từ những sinh vật khổng lồ nhất còn sống.',
 134, '2025-07-02', 'T13', 'Gareth Edwards',
 'Scarlett Johansson, Mahershala Ali, Jonathan Bailey, Rupert Friend',
 'Tiếng Anh',
 'https://image.tmdb.org/t/p/w500/1RICxzeoNCAO5NpcRMIgg1XT6fm.jpg',
 'https://www.youtube.com/watch?v=jan5CFWs9ic',
 'Phiêu lưu', 'Khoa học viễn tưởng'),
(5, 'Superman',
 'Clark Kent tìm cách dung hòa nguồn gốc Krypton với cuộc sống con người và lý tưởng về lòng tốt trong một thế giới hoài nghi.',
 129, '2025-07-11', 'T13', 'James Gunn',
 'David Corenswet, Rachel Brosnahan, Nicholas Hoult, Edi Gathegi',
 'Tiếng Anh',
 'https://image.tmdb.org/t/p/w500/ombsmhYUqR4qqOLOxAyr5V8hbyv.jpg',
 'https://www.youtube.com/watch?v=Ox8ZLF6cGM0',
 'Hành động', 'Khoa học viễn tưởng'),
(6, 'F1: The Movie',
 'Một tay đua kỳ cựu trở lại đường đua Formula 1 để cứu đội đua cũ và dìu dắt một tài năng trẻ đầy tham vọng.',
 155, '2025-06-27', 'T13', 'Joseph Kosinski',
 'Brad Pitt, Damson Idris, Kerry Condon, Javier Bardem',
 'Tiếng Anh',
 'https://image.tmdb.org/t/p/w500/9PXZIUsSDh4alB80jheWX4fhZmy.jpg',
 'https://www.youtube.com/watch?v=CT2_P2DZBR0',
 'Hành động', 'Tâm lý'),
(7, 'Final Destination: Bloodlines',
 'Một nữ sinh đại học tìm cách phá vỡ vòng lặp chết chóc đang đe dọa từng thành viên trong gia đình mình.',
 110, '2025-05-16', 'T18', 'Zach Lipovsky, Adam B. Stein',
 'Kaitlyn Santa Juana, Teo Briones, Rya Kihlstedt, Tony Todd',
 'Tiếng Anh',
 'https://image.tmdb.org/t/p/w500/6WxhEvFsauuACfv8HyoVX6mZKFj.jpg',
 'https://www.youtube.com/watch?v=UWMzKXsY9A4',
 'Kinh dị', 'Giật gân'),
(8, 'Thanh Gươm Diệt Quỷ: Vô Hạn Thành',
 'Tanjiro và các Trụ Cột bị cuốn vào Vô Hạn Thành, nơi trận chiến cuối cùng chống lại Muzan và các Thượng Huyền bắt đầu.',
 155, '2025-07-18', 'T16', 'Haruo Sotozaki',
 'Natsuki Hanae, Akari Kito, Hiro Shimono, Yoshitsugu Matsuoka',
 'Tiếng Nhật - Phụ đề Việt',
 'https://image.tmdb.org/t/p/w500/aFRDH3P7TX61FVGpaLhKr6QiOC1.jpg',
 'https://www.youtube.com/watch?v=wyiZWYMilgk',
 'Hoạt hình', 'Hành động');

-- Cập nhật nếu phim đã tồn tại, sau đó chỉ thêm các phim còn thiếu.
UPDATE movies AS movie
JOIN seed_movies AS seed ON seed.title = movie.title
SET movie.description = seed.description,
    movie.duration_minutes = seed.duration_minutes,
    movie.release_date = seed.release_date,
    movie.age_rating = seed.age_rating,
    movie.director = seed.director,
    movie.cast = seed.cast_text,
    movie.language = seed.language_name,
    movie.poster_url = seed.poster_url,
    movie.trailer_url = seed.trailer_url,
    movie.status = 'SHOWING',
    movie.updated_at = NOW();

INSERT INTO movies (
    title, description, duration_minutes, release_date, age_rating,
    director, cast, language, poster_url, trailer_url, status, created_at, updated_at
)
SELECT seed.title, seed.description, seed.duration_minutes, seed.release_date,
       seed.age_rating, seed.director, seed.cast_text, seed.language_name,
       seed.poster_url, seed.trailer_url, 'SHOWING', NOW(), NOW()
FROM seed_movies AS seed
WHERE NOT EXISTS (SELECT 1 FROM movies AS movie WHERE movie.title = seed.title);

INSERT IGNORE INTO genres (name) VALUES
('Hành động'), ('Phiêu lưu'), ('Hoạt hình'), ('Tâm lý'), ('Giả tưởng'),
('Kinh dị'), ('Khoa học viễn tưởng'), ('Giật gân'), ('Hài'), ('Gia đình');

INSERT IGNORE INTO movie_genres (movie_id, genre_id)
SELECT movie.id, genre.id
FROM seed_movies AS seed
JOIN movies AS movie ON movie.title = seed.title
JOIN genres AS genre ON genre.name IN (seed.genre_1, seed.genre_2);

-- =====================================================
-- 2. HAI MƯƠI TÀI KHOẢN THÀNH VIÊN
-- Đăng nhập: demo.member01@premiere.local ... demo.member20@premiere.local
-- Mật khẩu chung: 123456
-- =====================================================

SET @member_role_id := (
    SELECT id FROM roles WHERE UPPER(name) = 'MEMBER' ORDER BY id LIMIT 1
);

DROP TEMPORARY TABLE IF EXISTS seed_members;
CREATE TEMPORARY TABLE seed_members (
    seq INT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    gender VARCHAR(20)
);

INSERT INTO seed_members VALUES
(1,  'Nguyễn Minh Anh',   'demo.member01@premiere.local', '0910000001', '1998-02-14', 'FEMALE'),
(2,  'Trần Quốc Bảo',     'demo.member02@premiere.local', '0910000002', '1995-07-21', 'MALE'),
(3,  'Lê Hoàng Chi',      'demo.member03@premiere.local', '0910000003', '2001-11-03', 'FEMALE'),
(4,  'Phạm Gia Duy',      'demo.member04@premiere.local', '0910000004', '1999-05-16', 'MALE'),
(5,  'Võ Thùy Dương',     'demo.member05@premiere.local', '0910000005', '2000-08-28', 'FEMALE'),
(6,  'Đặng Tuấn Hải',     'demo.member06@premiere.local', '0910000006', '1997-12-09', 'MALE'),
(7,  'Bùi Ngọc Hân',      'demo.member07@premiere.local', '0910000007', '2002-04-25', 'FEMALE'),
(8,  'Đỗ Đức Huy',        'demo.member08@premiere.local', '0910000008', '1996-09-17', 'MALE'),
(9,  'Hồ Khánh Linh',     'demo.member09@premiere.local', '0910000009', '2001-01-30', 'FEMALE'),
(10, 'Ngô Nhật Minh',     'demo.member10@premiere.local', '0910000010', '1998-06-11', 'MALE'),
(11, 'Dương Bảo Ngọc',    'demo.member11@premiere.local', '0910000011', '2000-10-19', 'FEMALE'),
(12, 'Lý Thành Phát',     'demo.member12@premiere.local', '0910000012', '1994-03-07', 'MALE'),
(13, 'Mai Quỳnh Anh',     'demo.member13@premiere.local', '0910000013', '2003-07-13', 'FEMALE'),
(14, 'Đinh Trọng Quân',   'demo.member14@premiere.local', '0910000014', '1997-11-22', 'MALE'),
(15, 'Tạ Phương Thảo',    'demo.member15@premiere.local', '0910000015', '1999-09-04', 'FEMALE'),
(16, 'Cao Minh Trí',      'demo.member16@premiere.local', '0910000016', '1996-01-18', 'MALE'),
(17, 'Quách Mỹ Uyên',     'demo.member17@premiere.local', '0910000017', '2002-05-29', 'FEMALE'),
(18, 'Lâm Thành Vinh',    'demo.member18@premiere.local', '0910000018', '1995-08-12', 'MALE'),
(19, 'Trương Nhã Vy',     'demo.member19@premiere.local', '0910000019', '2000-12-01', 'FEMALE'),
(20, 'Phan Quốc Khánh',   'demo.member20@premiere.local', '0910000020', '1998-04-08', 'MALE');

INSERT INTO users (username, password, role_id)
SELECT seed.email,
       '$2a$10$oqvR.aez1uelDCrKotuHkOg4rTNnEwsosSZJpm.brvSPA487m/wkG',
       @member_role_id
FROM seed_members AS seed
WHERE @member_role_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM users AS user_row WHERE user_row.username = seed.email);

INSERT INTO members (
    user_id, full_name, email, phone, date_of_birth, gender, avatar,
    point_balance, membership_level, status, created_at, updated_at
)
SELECT user_row.id, seed.full_name, seed.email, seed.phone,
       seed.date_of_birth, seed.gender, NULL,
       CASE WHEN seed.seq <= 8 THEN 28 ELSE 14 END,
       'BASIC', 'ACTIVE', NOW(), NOW()
FROM seed_members AS seed
JOIN users AS user_row ON user_row.username = seed.email
WHERE NOT EXISTS (SELECT 1 FROM members AS member WHERE member.user_id = user_row.id);

-- Chuẩn hóa lại thông tin nếu file được chạy lần nữa.
UPDATE members AS member
JOIN users AS user_row ON user_row.id = member.user_id
JOIN seed_members AS seed ON seed.email = user_row.username
SET member.full_name = seed.full_name,
    member.email = seed.email,
    member.phone = seed.phone,
    member.date_of_birth = seed.date_of_birth,
    member.gender = seed.gender,
    member.status = 'ACTIVE';

-- =====================================================
-- 3. SUẤT CHIẾU: 14 NGÀY TỚI, 4 KHUNG GIỜ/PHÒNG/NGÀY
-- =====================================================

DROP TEMPORARY TABLE IF EXISTS seed_movie_ids;
CREATE TEMPORARY TABLE seed_movie_ids (
    seq INT AUTO_INCREMENT PRIMARY KEY,
    movie_id BIGINT NOT NULL
);

INSERT INTO seed_movie_ids (movie_id)
SELECT movie.id
FROM seed_movies AS seed
JOIN movies AS movie ON movie.title = seed.title
ORDER BY seed.seed_order;

SET @seed_movie_count := (SELECT COUNT(*) FROM seed_movie_ids);

DROP TEMPORARY TABLE IF EXISTS seed_future_schedule;
CREATE TEMPORARY TABLE seed_future_schedule (
    movie_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    start_time DATETIME NOT NULL,
    format_name VARCHAR(50) NOT NULL,
    PRIMARY KEY (room_id, start_time)
);

INSERT INTO seed_future_schedule (movie_id, room_id, start_time, format_name)
WITH RECURSIVE days AS (
    SELECT 1 AS day_offset
    UNION ALL SELECT day_offset + 1 FROM days WHERE day_offset < 14
), slots AS (
    SELECT 1 AS slot_no, CAST('09:00:00' AS TIME) AS start_at
    UNION ALL SELECT 2, CAST('12:30:00' AS TIME)
    UNION ALL SELECT 3, CAST('16:00:00' AS TIME)
    UNION ALL SELECT 4, CAST('19:30:00' AS TIME)
)
SELECT movie_map.movie_id,
       room.id,
       TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL days.day_offset DAY), slots.start_at),
       CASE
           WHEN UPPER(COALESCE(room.room_type, '')) LIKE '%IMAX%' THEN 'IMAX Phụ đề Việt'
           WHEN UPPER(COALESCE(room.room_type, '')) LIKE '%VIP%' THEN '2D Phụ đề Việt'
           WHEN MOD(days.day_offset + slots.slot_no, 3) = 0 THEN '2D Lồng tiếng'
           ELSE '2D Phụ đề Việt'
       END
FROM days
CROSS JOIN slots
JOIN cinema_rooms AS room ON UPPER(COALESCE(room.status, 'ACTIVE')) = 'ACTIVE'
JOIN seed_movie_ids AS movie_map
  ON movie_map.seq = MOD(days.day_offset + slots.slot_no + room.id - 3, @seed_movie_count) + 1;

INSERT INTO showtimes (movie_id, room_id, format, start_time, end_time, status, created_at)
SELECT schedule.movie_id,
       schedule.room_id,
       schedule.format_name,
       schedule.start_time,
       DATE_ADD(schedule.start_time, INTERVAL movie.duration_minutes MINUTE),
       'OPEN', NOW()
FROM seed_future_schedule AS schedule
JOIN movies AS movie ON movie.id = schedule.movie_id
WHERE NOT EXISTS (
    SELECT 1
    FROM showtimes AS existing
    WHERE existing.room_id = schedule.room_id
      AND UPPER(COALESCE(existing.status, 'OPEN')) <> 'CANCELLED'
      AND existing.start_time < DATE_ADD(schedule.start_time, INTERVAL movie.duration_minutes + 15 MINUTE)
      AND existing.end_time > DATE_SUB(schedule.start_time, INTERVAL 15 MINUTE)
);

-- =====================================================
-- 4. SUẤT CHIẾU QUÁ KHỨ CHO LỊCH SỬ VÀ ĐÁNH GIÁ
-- Mỗi thành viên có một suất riêng trong 20 ngày gần nhất.
-- =====================================================

SET @history_room_id := (
    SELECT id FROM cinema_rooms
    WHERE UPPER(COALESCE(status, 'ACTIVE')) = 'ACTIVE'
    ORDER BY id LIMIT 1
);

DROP TEMPORARY TABLE IF EXISTS seed_past_schedule;
CREATE TEMPORARY TABLE seed_past_schedule (
    member_seq INT PRIMARY KEY,
    movie_id BIGINT NOT NULL,
    room_id BIGINT NOT NULL,
    start_time DATETIME NOT NULL
);

INSERT INTO seed_past_schedule (member_seq, movie_id, room_id, start_time)
SELECT seed.seq,
       movie_map.movie_id,
       @history_room_id,
       TIMESTAMP(DATE_SUB(CURDATE(), INTERVAL seed.seq DAY), '19:00:00')
FROM seed_members AS seed
JOIN seed_movie_ids AS movie_map
  ON movie_map.seq = MOD(seed.seq - 1, @seed_movie_count) + 1
WHERE @history_room_id IS NOT NULL;

INSERT INTO showtimes (movie_id, room_id, format, start_time, end_time, status, created_at)
SELECT plan.movie_id, plan.room_id, '2D Phụ đề Việt', plan.start_time,
       DATE_ADD(plan.start_time, INTERVAL movie.duration_minutes MINUTE),
       'CLOSED', DATE_SUB(plan.start_time, INTERVAL 7 DAY)
FROM seed_past_schedule AS plan
JOIN movies AS movie ON movie.id = plan.movie_id
WHERE NOT EXISTS (
    SELECT 1 FROM showtimes AS existing
    WHERE existing.room_id = plan.room_id
      AND existing.start_time = plan.start_time
);

-- Tạo kho ghế cho toàn bộ suất DEMO vừa thêm.
INSERT IGNORE INTO showtime_seats (showtime_id, seat_id, status, held_until)
SELECT showtime.id, seat.id, 'AVAILABLE', NULL
FROM showtimes AS showtime
JOIN seats AS seat ON seat.room_id = showtime.room_id
WHERE showtime.start_time BETWEEN DATE_SUB(CURDATE(), INTERVAL 21 DAY)
                              AND DATE_ADD(CURDATE(), INTERVAL 15 DAY)
  AND UPPER(COALESCE(seat.status, 'ACTIVE')) = 'ACTIVE';

-- =====================================================
-- 5. HAI MƯƠI ĐƠN ĐÃ HOÀN THÀNH
-- =====================================================

INSERT INTO bookings (
    booking_code, hold_token, member_id, employee_id, showtime_id,
    promotion_id, total_amount, discount_amount, booking_type, status,
    payment_deadline, qr_token, created_at, updated_at
)
SELECT CONCAT('DEMO-PAST-', LPAD(seed.seq, 2, '0')),
       CONCAT('demo-past-hold-', LPAD(seed.seq, 2, '0')),
       member.id, NULL, showtime.id, NULL,
       140000, 0, 'ONLINE', 'CONFIRMED',
       DATE_SUB(showtime.start_time, INTERVAL 6 DAY),
       CONCAT('demo-past-qr-', LPAD(seed.seq, 2, '0')),
       DATE_SUB(showtime.start_time, INTERVAL 7 DAY),
       DATE_SUB(showtime.start_time, INTERVAL 7 DAY)
FROM seed_members AS seed
JOIN users AS user_row ON user_row.username = seed.email
JOIN members AS member ON member.user_id = user_row.id
JOIN seed_past_schedule AS plan ON plan.member_seq = seed.seq
JOIN showtimes AS showtime
  ON showtime.room_id = plan.room_id AND showtime.start_time = plan.start_time
WHERE NOT EXISTS (
    SELECT 1 FROM bookings AS booking
    WHERE booking.booking_code = CONCAT('DEMO-PAST-', LPAD(seed.seq, 2, '0'))
);

INSERT IGNORE INTO booking_seats (booking_id, seat_id, price, status)
WITH ranked_seats AS (
    SELECT booking.id AS booking_id,
           booking.showtime_id,
           seat.id AS seat_id,
           ROW_NUMBER() OVER (PARTITION BY booking.id ORDER BY seat.row_label, seat.seat_number) AS seat_rank
    FROM bookings AS booking
    JOIN showtimes AS showtime ON showtime.id = booking.showtime_id
    JOIN seats AS seat ON seat.room_id = showtime.room_id
    WHERE booking.booking_code LIKE 'DEMO-PAST-%'
      AND UPPER(COALESCE(seat.status, 'ACTIVE')) = 'ACTIVE'
)
SELECT booking_id, seat_id, 70000, 'ACTIVE'
FROM ranked_seats
WHERE seat_rank <= 2;

UPDATE showtime_seats AS inventory
JOIN booking_seats AS booked_seat ON booked_seat.seat_id = inventory.seat_id
JOIN bookings AS booking
  ON booking.id = booked_seat.booking_id
 AND booking.showtime_id = inventory.showtime_id
SET inventory.status = 'SOLD', inventory.held_until = NULL
WHERE booking.booking_code LIKE 'DEMO-PAST-%';

INSERT IGNORE INTO payments (
    booking_id, payment_method, amount, status, paid_at, transaction_code
)
SELECT booking.id, 'VIETQR', booking.total_amount, 'PAID',
       booking.created_at,
       CONCAT('DEMO-TXN-PAST-', LPAD(seed.seq, 2, '0'))
FROM seed_members AS seed
JOIN bookings AS booking
  ON booking.booking_code = CONCAT('DEMO-PAST-', LPAD(seed.seq, 2, '0'));

INSERT IGNORE INTO tickets (ticket_code, booking_seat_id, status, qr_token, issued_at)
SELECT CONCAT('DEMO-TICKET-', booking.id, '-', booking_seat.id),
       booking_seat.id, 'USED',
       CONCAT('demo-ticket-qr-', booking.id, '-', booking_seat.id),
       booking.created_at
FROM bookings AS booking
JOIN booking_seats AS booking_seat ON booking_seat.booking_id = booking.id
WHERE booking.booking_code LIKE 'DEMO-PAST-%';

-- =====================================================
-- 6. TÁM ĐƠN SẮP DIỄN RA
-- =====================================================

DROP TEMPORARY TABLE IF EXISTS seed_upcoming_showtimes;
CREATE TEMPORARY TABLE seed_upcoming_showtimes AS
SELECT id, ROW_NUMBER() OVER (ORDER BY start_time, room_id, id) AS seq
FROM showtimes
WHERE start_time > NOW()
  AND start_time < DATE_ADD(CURDATE(), INTERVAL 15 DAY)
  AND UPPER(status) = 'OPEN'
ORDER BY start_time, room_id, id
LIMIT 8;

INSERT INTO bookings (
    booking_code, hold_token, member_id, employee_id, showtime_id,
    promotion_id, total_amount, discount_amount, booking_type, status,
    payment_deadline, qr_token, created_at, updated_at
)
SELECT CONCAT('DEMO-UP-', LPAD(seed.seq, 2, '0')),
       CONCAT('demo-up-hold-', LPAD(seed.seq, 2, '0')),
       member.id, NULL, upcoming.id, NULL,
       140000, 0, 'ONLINE', 'CONFIRMED',
       DATE_ADD(NOW(), INTERVAL 15 MINUTE),
       CONCAT('demo-up-qr-', LPAD(seed.seq, 2, '0')),
       NOW(), NOW()
FROM seed_members AS seed
JOIN users AS user_row ON user_row.username = seed.email
JOIN members AS member ON member.user_id = user_row.id
JOIN seed_upcoming_showtimes AS upcoming ON upcoming.seq = seed.seq
WHERE seed.seq <= 8
  AND NOT EXISTS (
      SELECT 1 FROM bookings AS booking
      WHERE booking.booking_code = CONCAT('DEMO-UP-', LPAD(seed.seq, 2, '0'))
  );

INSERT IGNORE INTO booking_seats (booking_id, seat_id, price, status)
WITH ranked_seats AS (
    SELECT booking.id AS booking_id,
           booking.showtime_id,
           seat.id AS seat_id,
           ROW_NUMBER() OVER (PARTITION BY booking.id ORDER BY seat.row_label, seat.seat_number) AS seat_rank
    FROM bookings AS booking
    JOIN showtimes AS showtime ON showtime.id = booking.showtime_id
    JOIN seats AS seat ON seat.room_id = showtime.room_id
    WHERE booking.booking_code LIKE 'DEMO-UP-%'
      AND UPPER(COALESCE(seat.status, 'ACTIVE')) = 'ACTIVE'
)
SELECT booking_id, seat_id, 70000, 'ACTIVE'
FROM ranked_seats
WHERE seat_rank BETWEEN 3 AND 4;

UPDATE showtime_seats AS inventory
JOIN booking_seats AS booked_seat ON booked_seat.seat_id = inventory.seat_id
JOIN bookings AS booking
  ON booking.id = booked_seat.booking_id
 AND booking.showtime_id = inventory.showtime_id
SET inventory.status = 'SOLD', inventory.held_until = NULL
WHERE booking.booking_code LIKE 'DEMO-UP-%';

INSERT IGNORE INTO payments (
    booking_id, payment_method, amount, status, paid_at, transaction_code
)
SELECT booking.id, 'VIETQR', booking.total_amount, 'PAID', NOW(),
       CONCAT('DEMO-TXN-UP-', LPAD(seed.seq, 2, '0'))
FROM seed_members AS seed
JOIN bookings AS booking
  ON booking.booking_code = CONCAT('DEMO-UP-', LPAD(seed.seq, 2, '0'))
WHERE seed.seq <= 8;

INSERT IGNORE INTO tickets (ticket_code, booking_seat_id, status, qr_token, issued_at)
SELECT CONCAT('DEMO-UP-TICKET-', booking.id, '-', booking_seat.id),
       booking_seat.id, 'ACTIVE',
       CONCAT('demo-up-ticket-qr-', booking.id, '-', booking_seat.id),
       booking.created_at
FROM bookings AS booking
JOIN booking_seats AS booking_seat ON booking_seat.booking_id = booking.id
WHERE booking.booking_code LIKE 'DEMO-UP-%';

-- =====================================================
-- 7. ĐIỂM VÀ ĐÁNH GIÁ
-- 140.000đ thực trả = 14 điểm theo quy tắc 10.000đ/điểm.
-- =====================================================

INSERT IGNORE INTO point_histories (
    member_id, booking_id, points, balance_before, balance_after,
    type, description, idempotency_key, created_at
)
SELECT booking.member_id, booking.id, 14, 0, 14,
       'EARN', CONCAT('Tích điểm từ đơn ', booking.booking_code),
       CONCAT('demo-point-', booking.booking_code), booking.created_at
FROM bookings AS booking
WHERE booking.booking_code LIKE 'DEMO-PAST-%';

INSERT IGNORE INTO point_histories (
    member_id, booking_id, points, balance_before, balance_after,
    type, description, idempotency_key, created_at
)
SELECT booking.member_id, booking.id, 14, 14, 28,
       'EARN', CONCAT('Tích điểm từ đơn ', booking.booking_code),
       CONCAT('demo-point-', booking.booking_code), booking.created_at
FROM bookings AS booking
WHERE booking.booking_code LIKE 'DEMO-UP-%';

DROP TEMPORARY TABLE IF EXISTS seed_review_texts;
CREATE TEMPORARY TABLE seed_review_texts (
    seq INT PRIMARY KEY,
    rating TINYINT NOT NULL,
    content_text VARCHAR(500) NOT NULL
);

INSERT INTO seed_review_texts VALUES
(1,5,'Phim cuốn hút, hình ảnh đẹp và âm thanh ở rạp rất đã.'),
(2,4,'Nội dung dễ xem, diễn viên hợp vai và có nhiều cảnh đáng nhớ.'),
(3,5,'Một trải nghiệm điện ảnh rất tốt, mình sẽ giới thiệu cho bạn bè.'),
(4,4,'Nhịp phim ổn, phần hình ảnh và âm nhạc được đầu tư.'),
(5,5,'Xem tại rạp rất xứng đáng, đặc biệt là các cảnh hành động.'),
(6,3,'Phim khá ổn nhưng một vài đoạn giữa hơi chậm.'),
(7,4,'Câu chuyện thú vị, chất lượng phòng chiếu tốt.'),
(8,5,'Rất thích bộ phim này, chắc chắn sẽ xem lại.'),
(9,4,'Phim giải trí tốt, màu sắc đẹp và âm thanh sống động.'),
(10,5,'Nội dung hấp dẫn từ đầu đến cuối.'),
(11,4,'Diễn xuất tự nhiên, phần kết làm mình khá bất ngờ.'),
(12,3,'Ý tưởng hay, nếu tiết tấu nhanh hơn sẽ tuyệt hơn.'),
(13,5,'Một trong những phim mình thích nhất gần đây.'),
(14,4,'Phim hay, rạp sạch và trải nghiệm đặt vé thuận tiện.'),
(15,5,'Hình ảnh mãn nhãn, âm nhạc rất hợp với từng phân cảnh.'),
(16,4,'Đáng xem cùng bạn bè vào cuối tuần.'),
(17,5,'Cốt truyện cảm xúc và có nhiều khoảnh khắc ấn tượng.'),
(18,4,'Chất lượng tốt, phụ đề dễ đọc và âm thanh rõ.'),
(19,5,'Phim rất hay, mình chấm trọn năm sao.'),
(20,4,'Tổng thể hài lòng, sẽ tiếp tục đặt vé tại Premiere Cinemas.');

INSERT IGNORE INTO movie_reviews (movie_id, user_id, rating, content, created_at, updated_at)
SELECT showtime.movie_id, member.user_id, review.rating, review.content_text,
       DATE_ADD(showtime.end_time, INTERVAL 2 HOUR),
       DATE_ADD(showtime.end_time, INTERVAL 2 HOUR)
FROM seed_members AS seed
JOIN seed_review_texts AS review ON review.seq = seed.seq
JOIN users AS user_row ON user_row.username = seed.email
JOIN members AS member ON member.user_id = user_row.id
JOIN bookings AS booking
  ON booking.member_id = member.id
 AND booking.booking_code = CONCAT('DEMO-PAST-', LPAD(seed.seq, 2, '0'))
JOIN showtimes AS showtime ON showtime.id = booking.showtime_id;

SET SQL_SAFE_UPDATES = @previous_sql_safe_updates;

-- =====================================================
-- 8. KẾT QUẢ KIỂM TRA
-- =====================================================

SELECT 'Phim seed' AS data_group, COUNT(*) AS total
FROM movies WHERE title IN (SELECT title FROM seed_movies)
UNION ALL
SELECT 'Tài khoản demo', COUNT(*)
FROM users WHERE username LIKE 'demo.member%@premiere.local'
UNION ALL
SELECT 'Đơn demo', COUNT(*)
FROM bookings WHERE booking_code LIKE 'DEMO-%'
UNION ALL
SELECT 'Đánh giá demo', COUNT(*)
FROM movie_reviews AS review
JOIN users AS user_row ON user_row.id = review.user_id
WHERE user_row.username LIKE 'demo.member%@premiere.local'
UNION ALL
SELECT 'Suất chiếu 14 ngày tới', COUNT(*)
FROM showtimes
WHERE start_time >= CURDATE()
  AND start_time < DATE_ADD(CURDATE(), INTERVAL 15 DAY);

SELECT username, '123456' AS demo_password
FROM users
WHERE username LIKE 'demo.member%@premiere.local'
ORDER BY username;

SELECT title, poster_url, trailer_url
FROM movies
WHERE title IN (SELECT title FROM seed_movies)
ORDER BY title;

DROP TEMPORARY TABLE IF EXISTS seed_review_texts;
DROP TEMPORARY TABLE IF EXISTS seed_upcoming_showtimes;
DROP TEMPORARY TABLE IF EXISTS seed_past_schedule;
DROP TEMPORARY TABLE IF EXISTS seed_future_schedule;
DROP TEMPORARY TABLE IF EXISTS seed_movie_ids;
DROP TEMPORARY TABLE IF EXISTS seed_members;
DROP TEMPORARY TABLE IF EXISTS seed_movies;
