USE cinema_management;
SET NAMES utf8mb4;

-- =========================================================
-- COMPLETE ONLINE BOOKING SETUP
-- Consolidates today's database work:
--   1. Showtime seat inventory and five-minute seat holds
--   2. Booking/payment indexes and one e-ticket per booked seat
--   3. Test member, ticket prices, future showtimes and seat inventory
--   4. Expanded movie descriptions
--
-- Prerequisite: run the project's base schema and sample data first.
-- Promotion data and payment-provider credentials are intentionally excluded.
-- The script is repeatable. Future showtime seed data is generated relative
-- to CURDATE(), so running it on another date can create that date's schedule.
-- =========================================================

-- =========================================================
-- SECTION 1: ONLINE BOOKING STRUCTURE
-- =========================================================

CREATE TABLE IF NOT EXISTS showtime_seats (
    id BIGINT NOT NULL AUTO_INCREMENT,
    showtime_id BIGINT NOT NULL,
    seat_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    held_until DATETIME NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_showtime_seats_showtime_seat UNIQUE (showtime_id, seat_id),
    CONSTRAINT fk_showtime_seats_showtime
        FOREIGN KEY (showtime_id) REFERENCES showtimes(id) ON DELETE CASCADE,
    CONSTRAINT fk_showtime_seats_seat
        FOREIGN KEY (seat_id) REFERENCES seats(id) ON DELETE RESTRICT,
    INDEX idx_showtime_seats_showtime_status (showtime_id, status),
    INDEX idx_showtime_seats_held_until (held_until)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS seat_holds (
    id BIGINT NOT NULL AUTO_INCREMENT,
    hold_token VARCHAR(100) NOT NULL,
    showtime_seat_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    held_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    PRIMARY KEY (id),
    CONSTRAINT fk_seat_holds_showtime_seat
        FOREIGN KEY (showtime_seat_id) REFERENCES showtime_seats(id) ON DELETE CASCADE,
    CONSTRAINT fk_seat_holds_user
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_seat_holds_hold_token (hold_token),
    INDEX idx_seat_holds_expiry_status (expires_at, status),
    INDEX idx_seat_holds_user_showtime_seat_status (user_id, showtime_seat_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tickets (
    id BIGINT NOT NULL AUTO_INCREMENT,
    ticket_code VARCHAR(50) NOT NULL,
    booking_seat_id BIGINT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    qr_token VARCHAR(100) NULL,
    issued_at DATETIME NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uq_tickets_ticket_code UNIQUE (ticket_code),
    CONSTRAINT uq_tickets_booking_seat UNIQUE (booking_seat_id),
    CONSTRAINT uq_tickets_qr_token UNIQUE (qr_token),
    CONSTRAINT fk_tickets_booking_seat
        FOREIGN KEY (booking_seat_id) REFERENCES booking_seats(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DELIMITER $$

DROP PROCEDURE IF EXISTS add_column_if_missing$$
CREATE PROCEDURE add_column_if_missing(
    IN target_table VARCHAR(64),
    IN target_column VARCHAR(64),
    IN column_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = target_table
          AND column_name = target_column
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', target_table,
            '` ADD COLUMN `', target_column, '` ', column_definition
        );
        PREPARE statement_to_run FROM @ddl;
        EXECUTE statement_to_run;
        DEALLOCATE PREPARE statement_to_run;
    END IF;
END$$

DROP PROCEDURE IF EXISTS add_index_if_missing$$
CREATE PROCEDURE add_index_if_missing(
    IN target_table VARCHAR(64),
    IN target_index VARCHAR(64),
    IN index_definition TEXT
)
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.statistics
        WHERE table_schema = DATABASE()
          AND table_name = target_table
          AND index_name = target_index
    ) THEN
        SET @ddl = CONCAT(
            'ALTER TABLE `', target_table, '` ADD ', index_definition
        );
        PREPARE statement_to_run FROM @ddl;
        EXECUTE statement_to_run;
        DEALLOCATE PREPARE statement_to_run;
    END IF;
END$$

DELIMITER ;

CALL add_column_if_missing(
    'bookings',
    'hold_token',
    'VARCHAR(100) NULL AFTER booking_code'
);

CALL add_column_if_missing(
    'seat_holds',
    'hold_token',
    'VARCHAR(100) NULL AFTER id'
);

UPDATE seat_holds
SET hold_token = UUID()
WHERE hold_token IS NULL OR hold_token = '';

ALTER TABLE seat_holds
    MODIFY COLUMN hold_token VARCHAR(100) NOT NULL;

CALL add_index_if_missing(
    'bookings',
    'uq_bookings_hold_token',
    'UNIQUE INDEX `uq_bookings_hold_token` (`hold_token`)'
);

CALL add_index_if_missing(
    'bookings',
    'idx_bookings_status_deadline',
    'INDEX `idx_bookings_status_deadline` (`status`, `payment_deadline`)'
);

CALL add_index_if_missing(
    'seat_holds',
    'idx_seat_holds_hold_token',
    'INDEX `idx_seat_holds_hold_token` (`hold_token`)'
);

CALL add_index_if_missing(
    'seat_holds',
    'idx_seat_holds_expiry_status',
    'INDEX `idx_seat_holds_expiry_status` (`expires_at`, `status`)'
);

CALL add_index_if_missing(
    'showtime_seats',
    'uq_showtime_seats_showtime_seat',
    'UNIQUE INDEX `uq_showtime_seats_showtime_seat` (`showtime_id`, `seat_id`)'
);

CALL add_index_if_missing(
    'showtime_seats',
    'idx_showtime_seats_showtime_status',
    'INDEX `idx_showtime_seats_showtime_status` (`showtime_id`, `status`)'
);

CALL add_index_if_missing(
    'showtime_seats',
    'idx_showtime_seats_held_until',
    'INDEX `idx_showtime_seats_held_until` (`held_until`)'
);

CALL add_index_if_missing(
    'booking_seats',
    'uq_booking_seats_booking_seat',
    'UNIQUE INDEX `uq_booking_seats_booking_seat` (`booking_id`, `seat_id`)'
);

CALL add_index_if_missing(
    'payments',
    'uq_payments_transaction_code',
    'UNIQUE INDEX `uq_payments_transaction_code` (`transaction_code`)'
);

DROP PROCEDURE IF EXISTS add_column_if_missing;
DROP PROCEDURE IF EXISTS add_index_if_missing;

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
JOIN seats AS seat
    ON seat.room_id = showtime.room_id
WHERE UPPER(COALESCE(seat.status, 'ACTIVE')) = 'ACTIVE';

UPDATE booking_seats
SET status = 'ACTIVE'
WHERE status IS NULL;

UPDATE showtime_seats
SET status = 'AVAILABLE'
WHERE status IS NULL OR status = '';

-- =========================================================
-- SECTION 2: TEST DATA FOR ONLINE BOOKING
-- Test login: booking.test@premiere.local / 123456
-- =========================================================

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
WHERE @member_role_id IS NOT NULL
  AND NOT EXISTS (
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
WHERE @booking_test_user_id IS NOT NULL
  AND NOT EXISTS (
      SELECT 1
      FROM members
      WHERE user_id = @booking_test_user_id
  );

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
    TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL seed.day_offset DAY), seed.start_at),
    DATE_ADD(
        TIMESTAMP(DATE_ADD(CURDATE(), INTERVAL seed.day_offset DAY), seed.start_at),
        INTERVAL movie.duration_minutes MINUTE
    ),
    'OPEN',
    NOW()
FROM booking_seed_showtimes AS seed
JOIN movies AS movie ON movie.id = seed.movie_id
JOIN cinema_rooms AS room ON room.id = seed.room_id
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
JOIN cinema_rooms AS room ON room.id = showtime.room_id
JOIN seats AS seat ON seat.room_id = room.id
WHERE UPPER(COALESCE(room.status, 'ACTIVE')) = 'ACTIVE'
  AND UPPER(COALESCE(seat.status, 'ACTIVE')) = 'ACTIVE';

-- =========================================================
-- SECTION 3: EXPANDED MOVIE DESCRIPTIONS
-- =========================================================

START TRANSACTION;

UPDATE movies SET description = 'Sau biến cố khiến gia tộc Atreides sụp đổ, Paul cùng mẹ tìm nơi nương náu giữa cộng đồng Fremen trên hành tinh sa mạc Arrakis. Sát cánh với Chani, anh học cách sinh tồn trong môi trường khắc nghiệt và tham gia cuộc chiến chống lại những thế lực đang kiểm soát nguồn hương dược quý giá. Khi ảnh hưởng của Paul ngày càng lớn, những lời tiên tri cũng đặt lên vai anh một trách nhiệm khó lường. Giữa tình yêu, khát vọng trả thù và nỗi sợ về tương lai, Paul phải lựa chọn con đường có thể thay đổi số phận của cả hành tinh.' WHERE id = 1 AND title = 'Dune: Hành Tinh Cát - Phần Hai';
UPDATE movies SET description = 'Riley bước vào tuổi thiếu niên với nhiều thay đổi trong suy nghĩ, tình bạn và cách nhìn nhận bản thân. Bên trong tổng hành dinh, Vui Vẻ cùng những cảm xúc quen thuộc bất ngờ phải đón tiếp các thành viên mới, khiến mọi hoạt động trở nên rối loạn. Mong muốn hòa nhập và nỗi lo bị đánh giá dần khiến những quyết định của Riley khác trước. Trong hành trình tìm lại sự cân bằng, các cảm xúc học cách lắng nghe nhau và nhận ra rằng trưởng thành không có nghĩa là lúc nào cũng phải vui vẻ. Câu chuyện mở ra một góc nhìn ấm áp về việc chấp nhận những phần chưa hoàn hảo của chính mình.' WHERE id = 2 AND title = 'Những Mảnh Ghép Cảm Xúc 2';
UPDATE movies SET description = 'Sau những cuộc đối đầu dữ dội, Godzilla và Kong tiếp tục hành trình riêng trong một thế giới nơi con người phải chung sống cùng các Titan. Những dấu hiệu bất thường từ Trái Đất Rỗng dẫn tới một hiểm họa mới, đe dọa cả thế giới bên dưới lẫn sự sống trên bề mặt. Trong khi các nhà nghiên cứu tìm hiểu nguồn gốc của mối nguy, Kong khám phá những bí mật liên quan đến giống loài mình. Trước sức mạnh vượt ngoài dự đoán, hai sinh vật khổng lồ phải tìm cách hợp tác. Những trận chiến quy mô lớn đi cùng hành trình khám phá về sự tồn tại và cân bằng của tự nhiên.' WHERE id = 3 AND title = 'Godzilla x Kong: Đế Chế Mới';
UPDATE movies SET description = 'Bị đưa khỏi quê hương khi còn nhỏ, Furiosa phải học cách tồn tại giữa một vùng đất hoang nơi nguồn nước, nhiên liệu và quyền lực quyết định số phận con người. Cuộc sống giữa những phe nhóm đối địch buộc cô phải quan sát, thích nghi và che giấu mong muốn trở về. Mỗi thử thách đều để lại dấu vết, đồng thời rèn nên ý chí kiên cường và khả năng tự bảo vệ. Trên hành trình dài qua mất mát và bạo lực, Furiosa không ngừng tìm kiếm cơ hội giành lại quyền lựa chọn cuộc đời mình.' WHERE id = 4 AND title = 'Furiosa: Câu Chuyện Từ Max Điên';
UPDATE movies SET description = 'Một ngày bình thường bất ngờ biến thành cuộc chạy trốn khi những sinh vật bí ẩn xuất hiện và tấn công bất cứ nơi nào phát ra tiếng động. Giữa thành phố hỗn loạn, một người phụ nữ phải học cách di chuyển, tìm nơi trú ẩn và liên lạc trong im lặng. Những người xa lạ gặp nhau giữa hiểm nguy dần trở thành chỗ dựa quý giá. Mỗi bước chân và mỗi quyết định đều có thể dẫn đến hậu quả không thể sửa chữa. Bên cạnh cuộc chiến sinh tồn căng thẳng, câu chuyện còn hướng đến lòng trắc ẩn và những điều nhỏ bé khiến con người tiếp tục hy vọng.' WHERE id = 5 AND title = 'Vùng Đất Câm Lặng: Ngày Một';
UPDATE movies SET description = 'Mai đã quen với việc tự mình gánh vác cuộc sống và cất giữ những tổn thương phía sau vẻ ngoài bình thản. Một mối quan hệ mới mang đến cho cô cảm giác được quan tâm, nhưng cũng khơi dậy những lo lắng mà cô tưởng đã chôn sâu. Khi tình cảm lớn dần, áp lực từ hoàn cảnh, gia đình và định kiến khiến cả hai phải nhìn thẳng vào những khác biệt. Câu chuyện theo chân một người phụ nữ học cách đối diện quá khứ và đặt câu hỏi về hạnh phúc mà mình xứng đáng có được. Giữa những khoảnh khắc đời thường, tình yêu hiện lên vừa dịu dàng vừa nhiều thử thách.' WHERE id = 6 AND title = 'Mai';
UPDATE movies SET description = 'Một biến cố trong gia đình khiến những người con phải sắp xếp lại cuộc sống riêng để chăm sóc mẹ. Những cuộc gặp gỡ tưởng như đơn giản dần bộc lộ khoảng cách, áp lực mưu sinh và những điều chưa từng được nói thành lời. Mỗi người đều có khó khăn của mình, nhưng tình thân đòi hỏi nhiều hơn những lời hứa. Qua những tình huống vừa gần gũi vừa xúc động, bộ phim đặt ra câu hỏi về sự quan tâm dành cho cha mẹ khi con cái đã trưởng thành. Điều ước của người mẹ trở thành sợi dây kết nối các thành viên, giúp họ nhìn lại ý nghĩa của một mái nhà.' WHERE id = 7 AND title = 'Lật Mặt 7: Một Điều Ước';
UPDATE movies SET description = 'Po đứng trước một nhiệm vụ mới khi phải chuẩn bị đảm nhận vai trò thủ lĩnh tinh thần của Thung lũng Bình Yên. Việc tìm kiếm và hướng dẫn người kế nhiệm không hề dễ dàng với một chiến binh vẫn yêu thích những cuộc phiêu lưu. Sự xuất hiện của một đối thủ nguy hiểm khiến Po phải rời vùng an toàn và hợp tác cùng một người bạn khó đoán. Trên đường đi, những thử thách buộc anh nhận ra rằng sức mạnh còn nằm ở khả năng tin tưởng và truyền lại điều mình đã học. Hành trình kết hợp các màn võ thuật sôi động với câu chuyện hài hước về sự thay đổi.' WHERE id = 8 AND title = 'Kung Fu Panda 4';
UPDATE movies SET description = 'Một diễn viên đóng thế trở lại phim trường sau khoảng thời gian đầy biến động, hy vọng tìm lại nhịp sống và hàn gắn mối quan hệ cũ. Nhưng khi ngôi sao của bộ phim mất tích, anh bị cuốn vào một chuỗi sự kiện vượt xa những cảnh hành động đã được dàn dựng. Những kỹ năng nghề nghiệp trở thành công cụ giúp anh vượt qua hiểm nguy ngoài đời thực. Giữa các bí mật, hiểu lầm và những pha truy đuổi, anh phải tìm ra sự thật trước khi mọi chuyện vượt khỏi tầm kiểm soát. Bộ phim mang đến một cuộc phiêu lưu vừa kịch tính vừa hài hước, đồng thời gợi nhắc công sức của những người làm việc phía sau màn ảnh.' WHERE id = 9 AND title = 'Kẻ Thế Thân';
UPDATE movies SET description = 'Cuộc sống của Gru và gia đình bước sang một giai đoạn mới khi họ đón thêm thành viên nhỏ tuổi. Những rắc rối trong việc chăm sóc con và thích nghi với thay đổi chưa kịp lắng xuống thì một kẻ thù nguy hiểm xuất hiện. Cả nhà phải tìm cách bảo vệ nhau trong những tình huống bất ngờ, với sự góp mặt của đội Minion luôn tạo ra nhiều hỗn loạn. Các kế hoạch nghiêm túc nhanh chóng biến thành những cuộc phiêu lưu khó đoán. Đằng sau tiếng cười và các màn hành động là câu chuyện về sự gắn bó, trách nhiệm và sức mạnh của một gia đình.' WHERE id = 10 AND title = 'Kẻ Trộm Mặt Trăng 4';
UPDATE movies SET description = 'Deadpool bị kéo vào một nhiệm vụ liên quan đến những biến động của dòng thời gian, nơi các lựa chọn có thể ảnh hưởng tới thế giới mà anh muốn bảo vệ. Để tìm cơ hội xoay chuyển tình thế, anh hợp tác với Wolverine, một đồng đội có tính cách và cách giải quyết vấn đề hoàn toàn khác biệt. Sự kết hợp khó hòa hợp này dẫn tới hàng loạt cuộc chạm trán hỗn loạn. Giữa những màn đối đầu dữ dội và lời thoại châm biếm, cả hai phải đối diện với quá khứ cùng những điều mình còn muốn gìn giữ. Cuộc hành trình thử thách lòng tin và khả năng sát cánh của hai nhân vật.' WHERE id = 11 AND title = 'Deadpool & Wolverine';
UPDATE movies SET description = 'Một vụ việc liên quan đến thanh kiếm và những dấu vết của kho báu đưa Conan đến với cuộc điều tra tại Hakodate. Sự xuất hiện của một tên trộm nổi tiếng khiến tình hình thêm phức tạp, trong khi các manh mối tưởng rời rạc dần dẫn tới một bí mật được che giấu. Conan cùng những người bạn phải lần theo từng chi tiết để hiểu động cơ của các bên liên quan. Thời gian ngày càng gấp gáp khi nguy hiểm không chỉ dừng ở một vụ trộm. Câu chuyện kết hợp suy luận, truy đuổi và những tình huống bất ngờ trong bối cảnh thành phố nhiều dấu ấn lịch sử.' WHERE id = 12 AND title = 'Thám Tử Lừng Danh Conan: Ngôi Sao 5 Cánh 1 Triệu Đô';
UPDATE movies SET description = 'Một gia đình tìm đến sự giúp đỡ của các chuyên gia khi những hiện tượng kỳ lạ liên tục đeo bám cuộc sống của họ. Cuộc khảo sát dẫn nhóm điều tra đến một ngôi mộ có nhiều dấu hiệu bất thường, nơi những bí mật quá khứ dường như vẫn chưa được chôn vùi. Quyết định khai quật mở đầu cho chuỗi sự kiện ngày càng nguy hiểm. Các thành viên phải kết hợp kinh nghiệm, nghi thức và sự cảnh giác để tìm hiểu điều gì đang thật sự diễn ra. Không khí căng thẳng tăng dần khi ranh giới giữa những lời giải thích thông thường và thế lực vô hình trở nên mong manh.' WHERE id = 13 AND title = 'Quật Mộ Trùng Ma';
UPDATE movies SET description = 'Những đợt thời tiết cực đoan đưa các nhóm nghiên cứu và thợ săn bão vào những chuyến đi đầy rủi ro. Với mục tiêu hiểu rõ hơn sức mạnh của lốc xoáy, họ phải theo dõi các dấu hiệu bất thường và đưa ra quyết định trong thời gian rất ngắn. Sự khác biệt về phương pháp cùng những trải nghiệm cũ khiến việc hợp tác không hề dễ dàng. Khi các cơn bão ngày càng dữ dội, kiến thức và lòng dũng cảm đều bị thử thách. Bộ phim theo chân những con người cố gắng bảo vệ cộng đồng trước sức mạnh khó lường của thiên nhiên.' WHERE id = 14 AND title = 'Lốc Xoáy Tử Thần';
UPDATE movies SET description = 'Giữa thời chiến, một người lính trẻ cùng đồng đội phải đối mặt với những thử thách khắc nghiệt và sự mong manh của cuộc sống. Những ngày sát cánh bên nhau tạo nên tình đồng đội, nhưng cũng đặt mỗi người trước những mất mát khó diễn tả. Trong hoàn cảnh thiếu thốn và hiểm nguy, họ tìm thấy sức mạnh từ trách nhiệm, lòng tin và ký ức về những người thân đang chờ đợi. Câu chuyện trong bộ dữ liệu mẫu hướng tới sự hy sinh và khát vọng bình yên, đồng thời gợi nhắc giá trị của những điều giản dị mà chiến tranh có thể lấy đi.' WHERE id = 15 AND title = 'Mưa Đỏ';
UPDATE movies SET description = 'Một robot lạc đến hòn đảo hoang và nhận ra rằng những quy trình được lập sẵn không đủ để thích nghi với thế giới tự nhiên. Qua từng lần quan sát và thử nghiệm, nó học cách hiểu các sinh vật sống xung quanh và tìm vị trí của mình trên đảo. Việc chăm sóc một sinh linh nhỏ bé mở ra những trải nghiệm vượt ngoài nhiệm vụ ban đầu. Những mùa thay đổi mang đến cả hiểm nguy lẫn cơ hội gắn kết. Hành trình đặt ra câu hỏi dịu dàng về tình thân, sự khác biệt và khả năng học cách yêu thương.' WHERE id = 16 AND title = 'Robot Hoang Dã';
UPDATE movies SET description = 'Một nhóm người trẻ tìm kiếm cơ hội thay đổi cuộc sống bằng cách tiếp cận một trạm vũ trụ bị bỏ hoang. Những hành lang im lặng và thiết bị còn sót lại ban đầu hứa hẹn nguồn tài nguyên cần thiết, nhưng nhanh chóng hé lộ dấu hiệu của hiểm họa. Khi nhận ra mình không hề đơn độc, họ phải tìm lối thoát trong không gian chật hẹp và đầy bất trắc. Sự tin tưởng giữa các thành viên bị thử thách trước mỗi quyết định sinh tử. Bộ phim tạo nên cuộc chiến sống còn khi con người đối diện một sinh vật vượt xa khả năng kiểm soát.' WHERE id = 17 AND title = 'Alien: Romulus';
UPDATE movies SET description = 'Một người thợ chiếu phim rời quê lên Thành phố Hồ Chí Minh với hy vọng tìm cách cứu rạp chiếu cuối cùng của gia đình. Giữa nhịp sống xa lạ, anh gặp những con người có ước mơ và nỗi lo riêng, cùng những lựa chọn khiến mình phải xem lại điều thật sự quan trọng. Nỗ lực giữ gìn rạp phim cũng là hành trình nối lại ký ức với những người thân và khán giả cũ. Nội dung mở rộng này dành cho phim trong bộ dữ liệu mẫu, kể về sự gắn bó với điện ảnh và mong muốn giữ một nơi chốn có ý nghĩa giữa nhiều thay đổi.' WHERE id = 18 AND title = 'Thành Phố Ngủ Quên';

COMMIT;

-- =========================================================
-- SECTION 4: VERIFICATION
-- =========================================================

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

SELECT
    (SELECT COUNT(*) FROM showtime_seats) AS showtime_seat_count,
    (SELECT COUNT(*) FROM seat_holds) AS seat_hold_count,
    (SELECT COUNT(*) FROM tickets) AS ticket_count,
    (SELECT COUNT(*) FROM movies WHERE CHAR_LENGTH(description) >= 300) AS movies_with_long_description;
