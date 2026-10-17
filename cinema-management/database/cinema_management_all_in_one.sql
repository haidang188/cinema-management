-- DU LIEU TONG HOP - PREMIERE CINEMAS (MySQL 8.0+)
-- Cach dung: mo file nay, chon toan bo va chay mot lan trong MySQL Workbench.
-- Danh cho database cinema_management MOI/TRONG; khong chay tren database da co bang.
-- Khong xoa database hay du lieu hien co. Khong can chay cac file SQL le sau file nay.
-- Nguon: schema va roles tu rap_chieu_phim_full.sql; du lieu chuan tu 02_sample_data.sql;
--        movie_reviews tu 04; nhan vien tu 05; dat ve, lich chieu va mo ta phim tu 09.
-- 09 da gom 06, 07, 08 nen chi nap mot lan.
-- Bo 03_update_vietnamese_data.sql vi dung ID cu (vi du phim 6 la Kung Fu Panda,
-- trong du lieu 02 phim 6 la Mai). Du lieu 02 da co tieng Viet va quan he the loai dung.
-- Lich chieu moi tu ngay mai den 7 ngay tiep theo, tinh theo ngay chay script.
-- Tai khoan test: booking.test@premiere.local / 123456.
-- Tai khoan admin duoc backend tao khi khoi dong theo DataInitializer.
-- Da gom grid_row va grid_column (INT NULL) vao bang seats.

CREATE DATABASE IF NOT EXISTS cinema_management
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cinema_management;
SET NAMES utf8mb4;
SET @cinema_previous_safe_updates = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;
SET @cinema_previous_fk_checks = @@FOREIGN_KEY_CHECKS;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. SCHEMA GOC (khong nap du lieu dump cu de tranh trung ID)


CREATE TABLE `admins` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_admins_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `booking_seats` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `booking_id` bigint NOT NULL,
  `seat_id` bigint NOT NULL,
  `price` decimal(10,2) DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_booking_seats_bookings` (`booking_id`),
  KEY `fk_booking_seats_seats` (`seat_id`),
  CONSTRAINT `fk_booking_seats_bookings` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  CONSTRAINT `fk_booking_seats_seats` FOREIGN KEY (`seat_id`) REFERENCES `seats` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `bookings` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `booking_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `member_id` bigint DEFAULT NULL,
  `employee_id` bigint DEFAULT NULL,
  `showtime_id` bigint NOT NULL,
  `promotion_id` bigint DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT NULL,
  `discount_amount` decimal(10,2) DEFAULT NULL,
  `booking_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `payment_deadline` datetime DEFAULT NULL,
  `qr_token` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_code` (`booking_code`),
  UNIQUE KEY `qr_token` (`qr_token`),
  KEY `fk_bookings_members` (`member_id`),
  KEY `fk_bookings_employees` (`employee_id`),
  KEY `fk_bookings_showtimes` (`showtime_id`),
  KEY `fk_bookings_promotions` (`promotion_id`),
  CONSTRAINT `fk_bookings_employees` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`),
  CONSTRAINT `fk_bookings_members` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`),
  CONSTRAINT `fk_bookings_promotions` FOREIGN KEY (`promotion_id`) REFERENCES `promotions` (`id`),
  CONSTRAINT `fk_bookings_showtimes` FOREIGN KEY (`showtime_id`) REFERENCES `showtimes` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `cinema_rooms` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `room_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `total_seats` int DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `employees` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `employee_code` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `address` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `position` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  UNIQUE KEY `employee_code` (`employee_code`),
  CONSTRAINT `fk_employees_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `genres` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `members` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `user_id` bigint NOT NULL,
  `full_name` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `phone` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `avatar` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `point_balance` int DEFAULT '0',
  `membership_level` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT 'ACTIVE',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  CONSTRAINT `fk_members_users` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `movie_genres` (
  `movie_id` bigint NOT NULL,
  `genre_id` bigint NOT NULL,
  PRIMARY KEY (`movie_id`,`genre_id`),
  KEY `fk_movie_genres_genres` (`genre_id`),
  CONSTRAINT `fk_movie_genres_genres` FOREIGN KEY (`genre_id`) REFERENCES `genres` (`id`),
  CONSTRAINT `fk_movie_genres_movies` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `movies` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `duration_minutes` int NOT NULL,
  `release_date` date DEFAULT NULL,
  `age_rating` varchar(10) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `director` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `cast` text COLLATE utf8mb4_unicode_ci,
  `language` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `poster_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `trailer_url` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `payments` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `booking_id` bigint NOT NULL,
  `payment_method` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `amount` decimal(10,2) DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `transaction_code` varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `booking_id` (`booking_id`),
  CONSTRAINT `fk_payments_bookings` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `point_histories` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `member_id` bigint NOT NULL,
  `booking_id` bigint DEFAULT NULL,
  `points` int NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_point_histories_members` (`member_id`),
  KEY `fk_point_histories_bookings` (`booking_id`),
  CONSTRAINT `fk_point_histories_bookings` FOREIGN KEY (`booking_id`) REFERENCES `bookings` (`id`),
  CONSTRAINT `fk_point_histories_members` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `promotions` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `title` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `description` text COLLATE utf8mb4_unicode_ci,
  `code` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `discount_value` decimal(10,2) DEFAULT NULL,
  `start_date` datetime DEFAULT NULL,
  `end_date` datetime DEFAULT NULL,
  `min_order_amount` decimal(10,2) DEFAULT NULL,
  `max_discount_amount` decimal(10,2) DEFAULT NULL,
  `usage_limit` int DEFAULT NULL,
  `used_count` int DEFAULT '0',
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `roles` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `name` varchar(50) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `seats` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `room_id` bigint NOT NULL,
  `row_label` varchar(5) COLLATE utf8mb4_unicode_ci NOT NULL,
  `seat_number` int NOT NULL,
  `grid_row` int DEFAULT NULL,
  `grid_column` int DEFAULT NULL,
  `seat_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `room_id` (`room_id`,`row_label`,`seat_number`),
  CONSTRAINT `fk_seats_rooms` FOREIGN KEY (`room_id`) REFERENCES `cinema_rooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `showtimes` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `movie_id` bigint NOT NULL,
  `room_id` bigint NOT NULL,
  `format` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `start_time` datetime NOT NULL,
  `end_time` datetime NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_showtimes_movies` (`movie_id`),
  KEY `fk_showtimes_rooms` (`room_id`),
  CONSTRAINT `fk_showtimes_movies` FOREIGN KEY (`movie_id`) REFERENCES `movies` (`id`),
  CONSTRAINT `fk_showtimes_rooms` FOREIGN KEY (`room_id`) REFERENCES `cinema_rooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `ticket_prices` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `room_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `seat_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `day_type` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `status` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `users` (
  `id` bigint NOT NULL AUTO_INCREMENT,
  `username` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `role_id` bigint NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  KEY `fk_users_roles` (`role_id`),
  CONSTRAINT `fk_users_roles` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = @cinema_previous_fk_checks;

-- 2. VAI TRO
INSERT INTO `roles` VALUES (1,'ADMIN'),(2,'EMPLOYEE'),(3,'MEMBER');

-- 3. DU LIEU MAU TIENG VIET
SET NAMES utf8mb4;

INSERT INTO genres (id, name) VALUES
(1, 'Hành động'),
(2, 'Phiêu lưu'),
(3, 'Hoạt hình'),
(4, 'Hài'),
(5, 'Tâm lý'),
(6, 'Giả tưởng'),
(7, 'Kinh dị'),
(8, 'Tình cảm'),
(9, 'Khoa học viễn tưởng'),
(10, 'Giật gân'),
(11, 'Gia đình'),












(12, 'Bí ẩn');

INSERT INTO movies (
  id,
  title,
  description,
  duration_minutes,
  release_date,
  age_rating,
  director,
  cast,
  language,
  poster_url,
  trailer_url,
  status,
  created_at,
  updated_at
) VALUES
(1, 'Dune: Hành Tinh Cát - Phần Hai', 'Paul Atreides liên minh với Chani và người Fremen để trả thù những kẻ đã hủy hoại gia tộc mình, đồng thời đối mặt lựa chọn có thể thay đổi vận mệnh thiên hà.', 166, '2024-03-01', 'T13', 'Denis Villeneuve', 'Timothee Chalamet, Zendaya, Rebecca Ferguson', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', 'https://www.youtube.com/watch?v=Way9Dexny3w', 'SHOWING', '2026-09-01 08:00:00', '2026-09-01 08:00:00'),
(2, 'Những Mảnh Ghép Cảm Xúc 2', 'Riley bước vào tuổi thiếu niên, kéo theo sự xuất hiện của nhiều cảm xúc mới khiến tổng hành dinh trở nên hỗn loạn và đáng yêu hơn bao giờ hết.', 96, '2024-06-14', 'P', 'Kelsey Mann', 'Amy Poehler, Maya Hawke, Kensington Tallman', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg', 'https://www.youtube.com/watch?v=LEjhY15eCx0', 'SHOWING', '2026-09-01 08:05:00', '2026-09-01 08:05:00'),
(3, 'Godzilla x Kong: Đế Chế Mới', 'Godzilla và Kong phải đối đầu một hiểm họa khổng lồ đang trỗi dậy từ sâu trong Trái Đất Rỗng, đe dọa sự tồn vong của cả hai giống loài.', 115, '2024-03-29', 'T13', 'Adam Wingard', 'Rebecca Hall, Brian Tyree Henry, Dan Stevens', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/z1p34vh7dEOnLDmyCrlUVLuoDzd.jpg', 'https://www.youtube.com/watch?v=lV1OOlGwExM', 'SHOWING', '2026-09-01 08:10:00', '2026-09-01 08:10:00'),
(4, 'Furiosa: Câu Chuyện Từ Max Điên', 'Bị bắt khỏi quê hương khi còn nhỏ, Furiosa phải sống sót giữa vùng đất hoang tàn và tìm đường trở về nơi mình thuộc về.', 149, '2024-05-24', 'T16', 'George Miller', 'Anya Taylor-Joy, Chris Hemsworth, Tom Burke', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/iADOJ8Zymht2JPMoy3R7xceZprc.jpg', 'https://www.youtube.com/watch?v=XJMuhwVlca4', 'UPCOMING', '2026-09-01 08:15:00', '2026-09-01 08:15:00'),
(5, 'Vùng Đất Câm Lặng: Ngày Một', 'Một người phụ nữ phải tìm cách sống sót trong những giờ đầu tiên của cuộc xâm lăng bí ẩn, khi âm thanh trở thành mối nguy chết người.', 99, '2024-06-28', 'T16', 'Michael Sarnoski', 'Lupita Nyongo, Joseph Quinn, Alex Wolff', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/hU42CRk14JuPEdqZG3AWmagiPAP.jpg', 'https://www.youtube.com/watch?v=YPY7J-flzE8', 'UPCOMING', '2026-09-01 08:20:00', '2026-09-01 08:20:00'),
(6, 'Mai', 'Mai, một người phụ nữ từng trải qua nhiều tổn thương, bất ngờ gặp một tình yêu mới nhưng cũng phải đối diện với những vết thương cũ chưa lành.', 131, '2024-02-10', 'T18', 'Trấn Thành', 'Phương Anh Đào, Tuấn Trần, Trấn Thành', 'Tiếng Việt', 'https://cdn-i.doisongphapluat.com.vn/media/trieu-phuong-linh/2024/01/17/dao-dien-tran-thanh-xay-dung-vu-tru-spa-va-vu-tru-hang-xom-day-mau-sac-trong-phim-mai1.jpg', 'https://www.youtube.com/watch?v=example-mai', 'SHOWING', '2026-09-01 08:25:00', '2026-09-01 08:25:00'),
(7, 'Lật Mặt 7: Một Điều Ước', 'Câu chuyện gia đình cảm động về tình thân, sự hy sinh và mong ước được đưa những người thân yêu trở lại gần nhau.', 138, '2024-04-26', 'P', 'Lý Hải', 'Thanh Hiền, Trương Minh Cường, Đinh Y Nhung', 'Tiếng Việt', 'https://i.imgur.com/VP8sUZ5.jpg', 'https://www.youtube.com/watch?v=example-lat-mat-7', 'SHOWING', '2026-09-01 08:30:00', '2026-09-01 08:30:00'),
(8, 'Kung Fu Panda 4', 'Po chuẩn bị trở thành thủ lĩnh tinh thần của Thung lũng Bình Yên và phải huấn luyện một chiến binh mới trước hiểm họa đang đến gần.', 94, '2024-03-08', 'P', 'Mike Mitchell', 'Jack Black, Awkwafina, Viola Davis', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/kDp1vUBnMpe8ak4rjgl3cLELqjU.jpg', 'https://www.youtube.com/watch?v=_inKs4eeHiI', 'ENDED', '2026-09-01 08:35:00', '2026-09-01 08:35:00'),
(9, 'Kẻ Thế Thân', 'Một diễn viên đóng thế bị cuốn vào vụ mất tích bí ẩn trong khi cố hàn gắn mối quan hệ với người yêu cũ.', 126, '2024-05-03', 'T13', 'David Leitch', 'Ryan Gosling, Emily Blunt, Aaron Taylor-Johnson', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/tSz1qsmSJon0rqjHBxXZmrotuse.jpg', 'https://www.youtube.com/watch?v=j7jPnwVGdZ8', 'ENDED', '2026-09-01 08:40:00', '2026-09-01 08:40:00'),
(10, 'Kẻ Trộm Mặt Trăng 4', 'Gru và gia đình phải thích nghi với thành viên mới trong nhà, đồng thời đối mặt một kẻ thù nguy hiểm vừa xuất hiện.', 95, '2024-07-03', 'P', 'Chris Renaud', 'Steve Carell, Kristen Wiig, Will Ferrell', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/wWba3TaojhK7NdycRhoQpsG0FaH.jpg', 'https://www.youtube.com/watch?v=qQlr9-rF32A', 'UPCOMING', '2026-09-01 08:45:00', '2026-09-01 08:45:00'),
(11, 'Deadpool & Wolverine', 'Deadpool hợp tác cùng Wolverine trong một nhiệm vụ náo loạn xuyên dòng thời gian, kéo theo hàng loạt rắc rối khó lường.', 128, '2024-07-26', 'T18', 'Shawn Levy', 'Ryan Reynolds, Hugh Jackman, Emma Corrin', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', 'https://www.youtube.com/watch?v=73_1biulkYk', 'UPCOMING', '2026-09-01 08:50:00', '2026-09-01 08:50:00'),
(12, 'Thám Tử Lừng Danh Conan: Ngôi Sao 5 Cánh 1 Triệu Đô', 'Conan điều tra vụ án xoay quanh một thanh kiếm, kho báu bí mật và tên trộm nguy hiểm tại Hakodate.', 111, '2024-04-12', 'T13', 'Chika Nagaoka', 'Minami Takayama, Wakana Yamazaki, Rikiya Koyama', 'Tiếng Nhật', 'https://image.tmdb.org/t/p/w500/9Gtg2DzBhmYamXBS1hKAhiwbBKS.jpg', 'https://www.youtube.com/watch?v=example-conan', 'SHOWING', '2026-09-01 08:55:00', '2026-09-01 08:55:00'),
(13, 'Quật Mộ Trùng Ma', 'Một nhóm pháp sư và chuyên gia phong thủy khai quật ngôi mộ cổ, từ đó đánh thức bí mật đen tối ám ảnh cả một gia tộc.', 134, '2024-02-22', 'T16', 'Jang Jae-hyun', 'Choi Min-sik, Kim Go-eun, Yoo Hae-jin', 'Tiếng Hàn', 'https://image.tmdb.org/t/p/w500/pQYHouPsDw32FhDLr7E3jmw0WTk.jpg', 'https://www.youtube.com/watch?v=example-exhuma', 'ENDED', '2026-09-01 09:00:00', '2026-09-01 09:00:00'),
(14, 'Lốc Xoáy Tử Thần', 'Một thế hệ thợ săn bão mới liều mình tiến vào tâm lốc xoáy để nghiên cứu và ngăn chặn thảm họa thiên nhiên.', 122, '2024-07-19', 'T13', 'Lee Isaac Chung', 'Daisy Edgar-Jones, Glen Powell, Anthony Ramos', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/pjnD08FlMAIXsfOLKQbvmO0f0MD.jpg', 'https://www.youtube.com/watch?v=wdok0rZdmx4', 'UPCOMING', '2026-09-01 09:05:00', '2026-09-01 09:05:00'),
(15, 'Mưa Đỏ', 'Một người lính trẻ Việt Nam cùng đồng đội trải qua mất mát, lòng trung thành và lòng dũng cảm giữa thời chiến.', 124, '2026-04-30', 'T16', 'Nguyễn Quang Dũng', 'Quốc Huy, B Trần, Huyền Lizzie', 'Tiếng Việt', 'https://image.tmdb.org/t/p/w500/d5NXSklXo0qyIYkgV94XAgMIckC.jpg', 'https://www.youtube.com/watch?v=example-mua-do', 'INACTIVE', '2026-09-01 09:10:00', '2026-09-01 09:10:00'),
(16, 'Robot Hoang Dã', 'Một robot bị mắc kẹt trên đảo hoang phải học cách thích nghi, chăm sóc và trở thành một phần của thế giới tự nhiên.', 102, '2024-09-27', 'P', 'Chris Sanders', 'Lupita Nyongo, Pedro Pascal, Kit Connor', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/wTnV3PCVW5O92JMrFvvrRcV39RU.jpg', 'https://www.youtube.com/watch?v=67vbA5ZJdKQ', 'UPCOMING', '2026-09-01 09:15:00', '2026-09-01 09:15:00'),
(17, 'Alien: Romulus', 'Một nhóm thực dân trẻ trong không gian chạm trán sinh vật ngoài hành tinh đáng sợ trên một trạm vũ trụ bỏ hoang.', 119, '2024-08-16', 'T18', 'Fede Alvarez', 'Cailee Spaeny, David Jonsson, Archie Renaux', 'Tiếng Anh', 'https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg', 'https://www.youtube.com/watch?v=x0XDEhP4MQs', 'UPCOMING', '2026-09-01 09:20:00', '2026-09-01 09:20:00'),
(18, 'Thành Phố Ngủ Quên', 'Một người thợ chiếu phim tỉnh lẻ lên Thành phố Hồ Chí Minh để cứu rạp chiếu cuối cùng của gia đình mình.', 108, '2026-08-21', 'T13', 'Lê Minh Hoàng', 'Khả Ngân, Song Luân, Hồng Ánh', 'Tiếng Việt', 'https://image.tmdb.org/t/p/w500/iiXliCeykkzmJ0Eg9RYJ7F2CWSz.jpg', 'https://www.youtube.com/watch?v=example-thanh-pho', 'SHOWING', '2026-09-01 09:25:00', '2026-09-01 09:25:00');

INSERT INTO movie_genres (movie_id, genre_id) VALUES
(1, 1),
(1, 2),
(1, 5),
(1, 9),
(2, 2),
(2, 3),
(2, 4),
(2, 11),
(3, 1),
(3, 2),
(3, 9),
(4, 1),
(4, 2),
(4, 10),
(5, 7),
(5, 9),
(5, 10),
(6, 5),
(6, 8),
(7, 4),
(7, 5),
(7, 11),
(8, 1),
(8, 2),
(8, 3),
(8, 4),
(9, 1),
(9, 4),
(9, 8),
(10, 3),
(10, 4),
(10, 11),
(11, 1),
(11, 4),
(11, 9),
(12, 2),
(12, 3),
(12, 12),
(13, 7),
(13, 10),
(13, 12),
(14, 1),
(14, 2),
(14, 10),
(15, 1),
(15, 5),
(16, 2),
(16, 3),
(16, 5),
(16, 11),
(17, 7),
(17, 9),
(17, 10),
(18, 5),
(18, 8);

INSERT INTO cinema_rooms (id, name, room_type, total_seats, status) VALUES
(1, 'Phòng 01', '2D', 120, 'ACTIVE'),
(2, 'Phòng 02', '2D', 100, 'ACTIVE'),
(3, 'Phòng IMAX 03', 'IMAX', 180, 'ACTIVE'),
(4, 'Phòng VIP 04', 'VIP', 72, 'ACTIVE'),
(5, 'Phòng 4DX 05', '4DX', 96, 'MAINTENANCE');

INSERT INTO showtimes (id, movie_id, room_id, start_time, end_time, status, created_at) VALUES
(1, 1, 3, '2026-09-08 09:00:00', '2026-09-08 11:46:00', 'OPEN', '2026-09-01 10:00:00'),
(2, 1, 3, '2026-09-08 19:30:00', '2026-09-08 22:16:00', 'OPEN', '2026-09-01 10:00:00'),
(3, 2, 1, '2026-09-08 10:15:00', '2026-09-08 11:51:00', 'OPEN', '2026-09-01 10:00:00'),
(4, 3, 2, '2026-09-08 13:30:00', '2026-09-08 15:25:00', 'OPEN', '2026-09-01 10:00:00'),
(5, 6, 4, '2026-09-08 20:00:00', '2026-09-08 22:11:00', 'OPEN', '2026-09-01 10:00:00'),
(6, 7, 1, '2026-09-09 09:30:00', '2026-09-09 11:48:00', 'OPEN', '2026-09-01 10:00:00'),
(7, 11, 3, '2026-09-09 18:45:00', '2026-09-09 20:53:00', 'OPEN', '2026-09-01 10:00:00'),
(8, 12, 2, '2026-09-10 14:00:00', '2026-09-10 15:51:00', 'OPEN', '2026-09-01 10:00:00'),
(9, 16, 1, '2026-09-10 16:30:00', '2026-09-10 18:12:00', 'OPEN', '2026-09-01 10:00:00'),
(10, 17, 4, '2026-09-10 21:15:00', '2026-09-10 23:14:00', 'OPEN', '2026-09-01 10:00:00'),
(11, 18, 2, '2026-09-11 18:00:00', '2026-09-11 19:48:00', 'OPEN', '2026-09-01 10:00:00'),
(12, 4, 5, '2026-09-12 20:20:00', '2026-09-12 22:49:00', 'CLOSED', '2026-09-01 10:00:00');

INSERT INTO seats (room_id, row_label, seat_number, seat_type, status) VALUES
(1, 'A', 1, 'NORMAL', 'ACTIVE'),
(1, 'A', 2, 'NORMAL', 'ACTIVE'),
(1, 'A', 3, 'NORMAL', 'ACTIVE'),
(1, 'A', 4, 'NORMAL', 'ACTIVE'),
(1, 'A', 5, 'NORMAL', 'ACTIVE'),
(1, 'A', 6, 'NORMAL', 'ACTIVE'),
(1, 'A', 7, 'NORMAL', 'ACTIVE'),
(1, 'A', 8, 'NORMAL', 'ACTIVE'),
(1, 'A', 9, 'NORMAL', 'ACTIVE'),
(1, 'A', 10, 'NORMAL', 'ACTIVE'),
(1, 'B', 1, 'NORMAL', 'ACTIVE'),
(1, 'B', 2, 'NORMAL', 'ACTIVE'),
(1, 'B', 3, 'NORMAL', 'ACTIVE'),
(1, 'B', 4, 'NORMAL', 'ACTIVE'),
(1, 'B', 5, 'NORMAL', 'ACTIVE'),
(1, 'B', 6, 'NORMAL', 'ACTIVE'),
(1, 'B', 7, 'NORMAL', 'ACTIVE'),
(1, 'B', 8, 'NORMAL', 'ACTIVE'),
(1, 'B', 9, 'NORMAL', 'ACTIVE'),
(1, 'B', 10, 'NORMAL', 'ACTIVE'),
(1, 'C', 1, 'VIP', 'ACTIVE'),
(1, 'C', 2, 'VIP', 'ACTIVE'),
(1, 'C', 3, 'NORMAL', 'ACTIVE'),
(1, 'C', 4, 'NORMAL', 'ACTIVE'),
(1, 'C', 5, 'NORMAL', 'ACTIVE'),
(1, 'C', 6, 'NORMAL', 'ACTIVE'),
(1, 'C', 7, 'NORMAL', 'ACTIVE'),
(1, 'C', 8, 'NORMAL', 'ACTIVE'),
(1, 'C', 9, 'NORMAL', 'ACTIVE'),
(1, 'C', 10, 'NORMAL', 'ACTIVE'),
(1, 'D', 1, 'VIP', 'ACTIVE'),
(1, 'D', 2, 'VIP', 'ACTIVE'),
(1, 'D', 3, 'NORMAL', 'ACTIVE'),
(1, 'D', 4, 'NORMAL', 'ACTIVE'),
(1, 'D', 5, 'NORMAL', 'ACTIVE'),
(1, 'D', 6, 'NORMAL', 'ACTIVE'),
(1, 'D', 7, 'NORMAL', 'ACTIVE'),
(1, 'D', 8, 'NORMAL', 'ACTIVE'),
(1, 'D', 9, 'NORMAL', 'ACTIVE'),
(1, 'D', 10, 'NORMAL', 'ACTIVE'),
(1, 'E', 1, 'VIP', 'ACTIVE'),
(1, 'E', 2, 'VIP', 'ACTIVE'),
(1, 'E', 3, 'NORMAL', 'ACTIVE'),
(1, 'E', 4, 'NORMAL', 'ACTIVE'),
(1, 'E', 5, 'NORMAL', 'ACTIVE'),
(1, 'E', 6, 'NORMAL', 'ACTIVE'),
(1, 'E', 7, 'NORMAL', 'ACTIVE'),
(1, 'E', 8, 'NORMAL', 'ACTIVE'),
(1, 'E', 9, 'NORMAL', 'ACTIVE'),
(1, 'E', 10, 'NORMAL', 'ACTIVE'),
(1, 'F', 1, 'VIP', 'ACTIVE'),
(1, 'F', 2, 'VIP', 'ACTIVE'),
(1, 'F', 3, 'NORMAL', 'ACTIVE'),
(1, 'F', 4, 'NORMAL', 'ACTIVE'),
(1, 'F', 5, 'NORMAL', 'ACTIVE'),
(1, 'F', 6, 'NORMAL', 'ACTIVE'),
(1, 'F', 7, 'NORMAL', 'ACTIVE'),
(1, 'F', 8, 'NORMAL', 'ACTIVE'),
(1, 'F', 9, 'NORMAL', 'ACTIVE'),
(1, 'F', 10, 'NORMAL', 'ACTIVE'),
(1, 'G', 1, 'VIP', 'ACTIVE'),
(1, 'G', 2, 'VIP', 'ACTIVE'),
(1, 'G', 3, 'NORMAL', 'ACTIVE'),
(1, 'G', 4, 'NORMAL', 'ACTIVE'),
(1, 'G', 5, 'NORMAL', 'ACTIVE'),
(1, 'G', 6, 'NORMAL', 'ACTIVE'),
(1, 'G', 7, 'NORMAL', 'ACTIVE'),
(1, 'G', 8, 'NORMAL', 'ACTIVE'),
(1, 'G', 9, 'NORMAL', 'ACTIVE'),
(1, 'G', 10, 'NORMAL', 'ACTIVE'),
(1, 'H', 1, 'VIP', 'ACTIVE'),
(1, 'H', 2, 'VIP', 'ACTIVE'),
(1, 'H', 3, 'NORMAL', 'ACTIVE'),
(1, 'H', 4, 'NORMAL', 'ACTIVE'),
(1, 'H', 5, 'NORMAL', 'ACTIVE'),
(1, 'H', 6, 'NORMAL', 'ACTIVE'),
(1, 'H', 7, 'NORMAL', 'ACTIVE'),
(1, 'H', 8, 'NORMAL', 'ACTIVE'),
(1, 'H', 9, 'NORMAL', 'ACTIVE'),
(1, 'H', 10, 'NORMAL', 'ACTIVE'),
(1, 'I', 1, 'VIP', 'ACTIVE'),
(1, 'I', 2, 'VIP', 'ACTIVE'),
(1, 'I', 3, 'NORMAL', 'ACTIVE'),
(1, 'I', 4, 'NORMAL', 'ACTIVE'),
(1, 'I', 5, 'NORMAL', 'ACTIVE'),
(1, 'I', 6, 'NORMAL', 'ACTIVE'),
(1, 'I', 7, 'NORMAL', 'ACTIVE'),
(1, 'I', 8, 'NORMAL', 'ACTIVE'),
(1, 'I', 9, 'NORMAL', 'ACTIVE'),
(1, 'I', 10, 'NORMAL', 'ACTIVE'),
(1, 'J', 1, 'VIP', 'ACTIVE'),
(1, 'J', 2, 'VIP', 'ACTIVE'),
(1, 'J', 3, 'NORMAL', 'ACTIVE'),
(1, 'J', 4, 'NORMAL', 'ACTIVE'),
(1, 'J', 5, 'NORMAL', 'ACTIVE'),
(1, 'J', 6, 'NORMAL', 'ACTIVE'),
(1, 'J', 7, 'NORMAL', 'ACTIVE'),
(1, 'J', 8, 'NORMAL', 'ACTIVE'),
(1, 'J', 9, 'NORMAL', 'ACTIVE'),
(1, 'J', 10, 'NORMAL', 'ACTIVE'),
(1, 'K', 1, 'VIP', 'ACTIVE'),
(1, 'K', 2, 'VIP', 'ACTIVE'),
(1, 'K', 3, 'NORMAL', 'ACTIVE'),
(1, 'K', 4, 'NORMAL', 'ACTIVE'),
(1, 'K', 5, 'NORMAL', 'ACTIVE'),
(1, 'K', 6, 'NORMAL', 'ACTIVE'),
(1, 'K', 7, 'NORMAL', 'ACTIVE'),
(1, 'K', 8, 'NORMAL', 'ACTIVE'),
(1, 'K', 9, 'NORMAL', 'ACTIVE'),
(1, 'K', 10, 'NORMAL', 'ACTIVE'),
(1, 'L', 1, 'VIP', 'ACTIVE'),
(1, 'L', 2, 'VIP', 'ACTIVE'),
(1, 'L', 3, 'NORMAL', 'ACTIVE'),
(1, 'L', 4, 'NORMAL', 'ACTIVE'),
(1, 'L', 5, 'NORMAL', 'ACTIVE'),
(1, 'L', 6, 'NORMAL', 'ACTIVE'),
(1, 'L', 7, 'NORMAL', 'ACTIVE'),
(1, 'L', 8, 'NORMAL', 'ACTIVE'),
(1, 'L', 9, 'NORMAL', 'ACTIVE'),
(1, 'L', 10, 'NORMAL', 'ACTIVE'),
(2, 'A', 1, 'NORMAL', 'ACTIVE'),
(2, 'A', 2, 'NORMAL', 'ACTIVE'),
(2, 'A', 3, 'NORMAL', 'ACTIVE'),
(2, 'A', 4, 'NORMAL', 'ACTIVE'),
(2, 'A', 5, 'NORMAL', 'ACTIVE'),
(2, 'A', 6, 'NORMAL', 'ACTIVE'),
(2, 'A', 7, 'NORMAL', 'ACTIVE'),
(2, 'A', 8, 'NORMAL', 'ACTIVE'),
(2, 'A', 9, 'NORMAL', 'ACTIVE'),
(2, 'A', 10, 'NORMAL', 'ACTIVE'),
(2, 'B', 1, 'NORMAL', 'ACTIVE'),
(2, 'B', 2, 'NORMAL', 'ACTIVE'),
(2, 'B', 3, 'NORMAL', 'ACTIVE'),
(2, 'B', 4, 'NORMAL', 'ACTIVE'),
(2, 'B', 5, 'NORMAL', 'ACTIVE'),
(2, 'B', 6, 'NORMAL', 'ACTIVE'),
(2, 'B', 7, 'NORMAL', 'ACTIVE'),
(2, 'B', 8, 'NORMAL', 'ACTIVE'),
(2, 'B', 9, 'NORMAL', 'ACTIVE'),
(2, 'B', 10, 'NORMAL', 'ACTIVE'),
(2, 'C', 1, 'VIP', 'ACTIVE'),
(2, 'C', 2, 'VIP', 'ACTIVE'),
(2, 'C', 3, 'NORMAL', 'ACTIVE'),
(2, 'C', 4, 'NORMAL', 'ACTIVE'),
(2, 'C', 5, 'NORMAL', 'ACTIVE'),
(2, 'C', 6, 'NORMAL', 'ACTIVE'),
(2, 'C', 7, 'NORMAL', 'ACTIVE'),
(2, 'C', 8, 'NORMAL', 'ACTIVE'),
(2, 'C', 9, 'NORMAL', 'ACTIVE'),
(2, 'C', 10, 'NORMAL', 'ACTIVE'),
(2, 'D', 1, 'VIP', 'ACTIVE'),
(2, 'D', 2, 'VIP', 'ACTIVE'),
(2, 'D', 3, 'NORMAL', 'ACTIVE'),
(2, 'D', 4, 'NORMAL', 'ACTIVE'),
(2, 'D', 5, 'NORMAL', 'ACTIVE'),
(2, 'D', 6, 'NORMAL', 'ACTIVE'),
(2, 'D', 7, 'NORMAL', 'ACTIVE'),
(2, 'D', 8, 'NORMAL', 'ACTIVE'),
(2, 'D', 9, 'NORMAL', 'ACTIVE'),
(2, 'D', 10, 'NORMAL', 'ACTIVE'),
(2, 'E', 1, 'VIP', 'ACTIVE'),
(2, 'E', 2, 'VIP', 'ACTIVE'),
(2, 'E', 3, 'NORMAL', 'ACTIVE'),
(2, 'E', 4, 'NORMAL', 'ACTIVE'),
(2, 'E', 5, 'NORMAL', 'ACTIVE'),
(2, 'E', 6, 'NORMAL', 'ACTIVE'),
(2, 'E', 7, 'NORMAL', 'ACTIVE'),
(2, 'E', 8, 'NORMAL', 'ACTIVE'),
(2, 'E', 9, 'NORMAL', 'ACTIVE'),
(2, 'E', 10, 'NORMAL', 'ACTIVE'),
(2, 'F', 1, 'VIP', 'ACTIVE'),
(2, 'F', 2, 'VIP', 'ACTIVE'),
(2, 'F', 3, 'NORMAL', 'ACTIVE'),
(2, 'F', 4, 'NORMAL', 'ACTIVE'),
(2, 'F', 5, 'NORMAL', 'ACTIVE'),
(2, 'F', 6, 'NORMAL', 'ACTIVE'),
(2, 'F', 7, 'NORMAL', 'ACTIVE'),
(2, 'F', 8, 'NORMAL', 'ACTIVE'),
(2, 'F', 9, 'NORMAL', 'ACTIVE'),
(2, 'F', 10, 'NORMAL', 'ACTIVE'),
(2, 'G', 1, 'VIP', 'ACTIVE'),
(2, 'G', 2, 'VIP', 'ACTIVE'),
(2, 'G', 3, 'NORMAL', 'ACTIVE'),
(2, 'G', 4, 'NORMAL', 'ACTIVE'),
(2, 'G', 5, 'NORMAL', 'ACTIVE'),
(2, 'G', 6, 'NORMAL', 'ACTIVE'),
(2, 'G', 7, 'NORMAL', 'ACTIVE'),
(2, 'G', 8, 'NORMAL', 'ACTIVE'),
(2, 'G', 9, 'NORMAL', 'ACTIVE'),
(2, 'G', 10, 'NORMAL', 'ACTIVE'),
(2, 'H', 1, 'VIP', 'ACTIVE'),
(2, 'H', 2, 'VIP', 'ACTIVE'),
(2, 'H', 3, 'NORMAL', 'ACTIVE'),
(2, 'H', 4, 'NORMAL', 'ACTIVE'),
(2, 'H', 5, 'NORMAL', 'ACTIVE'),
(2, 'H', 6, 'NORMAL', 'ACTIVE'),
(2, 'H', 7, 'NORMAL', 'ACTIVE'),
(2, 'H', 8, 'NORMAL', 'ACTIVE'),
(2, 'H', 9, 'NORMAL', 'ACTIVE'),
(2, 'H', 10, 'NORMAL', 'ACTIVE'),
(2, 'I', 1, 'VIP', 'ACTIVE'),
(2, 'I', 2, 'VIP', 'ACTIVE'),
(2, 'I', 3, 'NORMAL', 'ACTIVE'),
(2, 'I', 4, 'NORMAL', 'ACTIVE'),
(2, 'I', 5, 'NORMAL', 'ACTIVE'),
(2, 'I', 6, 'NORMAL', 'ACTIVE'),
(2, 'I', 7, 'NORMAL', 'ACTIVE'),
(2, 'I', 8, 'NORMAL', 'ACTIVE'),
(2, 'I', 9, 'NORMAL', 'ACTIVE'),
(2, 'I', 10, 'NORMAL', 'ACTIVE'),
(2, 'J', 1, 'VIP', 'ACTIVE'),
(2, 'J', 2, 'VIP', 'ACTIVE'),
(2, 'J', 3, 'NORMAL', 'ACTIVE'),
(2, 'J', 4, 'NORMAL', 'ACTIVE'),
(2, 'J', 5, 'NORMAL', 'ACTIVE'),
(2, 'J', 6, 'NORMAL', 'ACTIVE'),
(2, 'J', 7, 'NORMAL', 'ACTIVE'),
(2, 'J', 8, 'NORMAL', 'ACTIVE'),
(2, 'J', 9, 'NORMAL', 'ACTIVE'),
(2, 'J', 10, 'NORMAL', 'ACTIVE'),
(3, 'A', 1, 'NORMAL', 'ACTIVE'),
(3, 'A', 2, 'NORMAL', 'ACTIVE'),
(3, 'A', 3, 'NORMAL', 'ACTIVE'),
(3, 'A', 4, 'NORMAL', 'ACTIVE'),
(3, 'A', 5, 'NORMAL', 'ACTIVE'),
(3, 'A', 6, 'NORMAL', 'ACTIVE'),
(3, 'A', 7, 'NORMAL', 'ACTIVE'),
(3, 'A', 8, 'NORMAL', 'ACTIVE'),
(3, 'A', 9, 'NORMAL', 'ACTIVE'),
(3, 'A', 10, 'NORMAL', 'ACTIVE'),
(3, 'B', 1, 'NORMAL', 'ACTIVE'),
(3, 'B', 2, 'NORMAL', 'ACTIVE'),
(3, 'B', 3, 'NORMAL', 'ACTIVE'),
(3, 'B', 4, 'NORMAL', 'ACTIVE'),
(3, 'B', 5, 'NORMAL', 'ACTIVE'),
(3, 'B', 6, 'NORMAL', 'ACTIVE'),
(3, 'B', 7, 'NORMAL', 'ACTIVE'),
(3, 'B', 8, 'NORMAL', 'ACTIVE'),
(3, 'B', 9, 'NORMAL', 'ACTIVE'),
(3, 'B', 10, 'NORMAL', 'ACTIVE'),
(3, 'C', 1, 'VIP', 'ACTIVE'),
(3, 'C', 2, 'VIP', 'ACTIVE'),
(3, 'C', 3, 'NORMAL', 'ACTIVE'),
(3, 'C', 4, 'NORMAL', 'ACTIVE'),
(3, 'C', 5, 'NORMAL', 'ACTIVE'),
(3, 'C', 6, 'NORMAL', 'ACTIVE'),
(3, 'C', 7, 'NORMAL', 'ACTIVE'),
(3, 'C', 8, 'NORMAL', 'ACTIVE'),
(3, 'C', 9, 'NORMAL', 'ACTIVE'),
(3, 'C', 10, 'NORMAL', 'ACTIVE'),
(3, 'D', 1, 'VIP', 'ACTIVE'),
(3, 'D', 2, 'VIP', 'ACTIVE'),
(3, 'D', 3, 'NORMAL', 'ACTIVE'),
(3, 'D', 4, 'NORMAL', 'ACTIVE'),
(3, 'D', 5, 'NORMAL', 'ACTIVE'),
(3, 'D', 6, 'NORMAL', 'ACTIVE'),
(3, 'D', 7, 'NORMAL', 'ACTIVE'),
(3, 'D', 8, 'NORMAL', 'ACTIVE'),
(3, 'D', 9, 'NORMAL', 'ACTIVE'),
(3, 'D', 10, 'NORMAL', 'ACTIVE'),
(3, 'E', 1, 'VIP', 'ACTIVE'),
(3, 'E', 2, 'VIP', 'ACTIVE'),
(3, 'E', 3, 'NORMAL', 'ACTIVE'),
(3, 'E', 4, 'NORMAL', 'ACTIVE'),
(3, 'E', 5, 'NORMAL', 'ACTIVE'),
(3, 'E', 6, 'NORMAL', 'ACTIVE'),
(3, 'E', 7, 'NORMAL', 'ACTIVE'),
(3, 'E', 8, 'NORMAL', 'ACTIVE'),
(3, 'E', 9, 'NORMAL', 'ACTIVE'),
(3, 'E', 10, 'NORMAL', 'ACTIVE'),
(3, 'F', 1, 'VIP', 'ACTIVE'),
(3, 'F', 2, 'VIP', 'ACTIVE'),
(3, 'F', 3, 'NORMAL', 'ACTIVE'),
(3, 'F', 4, 'NORMAL', 'ACTIVE'),
(3, 'F', 5, 'NORMAL', 'ACTIVE'),
(3, 'F', 6, 'NORMAL', 'ACTIVE'),
(3, 'F', 7, 'NORMAL', 'ACTIVE'),
(3, 'F', 8, 'NORMAL', 'ACTIVE'),
(3, 'F', 9, 'NORMAL', 'ACTIVE'),
(3, 'F', 10, 'NORMAL', 'ACTIVE'),
(3, 'G', 1, 'VIP', 'ACTIVE'),
(3, 'G', 2, 'VIP', 'ACTIVE'),
(3, 'G', 3, 'NORMAL', 'ACTIVE'),
(3, 'G', 4, 'NORMAL', 'ACTIVE'),
(3, 'G', 5, 'NORMAL', 'ACTIVE'),
(3, 'G', 6, 'NORMAL', 'ACTIVE'),
(3, 'G', 7, 'NORMAL', 'ACTIVE'),
(3, 'G', 8, 'NORMAL', 'ACTIVE'),
(3, 'G', 9, 'NORMAL', 'ACTIVE'),
(3, 'G', 10, 'NORMAL', 'ACTIVE'),
(3, 'H', 1, 'VIP', 'ACTIVE'),
(3, 'H', 2, 'VIP', 'ACTIVE'),
(3, 'H', 3, 'NORMAL', 'ACTIVE'),
(3, 'H', 4, 'NORMAL', 'ACTIVE'),
(3, 'H', 5, 'NORMAL', 'ACTIVE'),
(3, 'H', 6, 'NORMAL', 'ACTIVE'),
(3, 'H', 7, 'NORMAL', 'ACTIVE'),
(3, 'H', 8, 'NORMAL', 'ACTIVE'),
(3, 'H', 9, 'NORMAL', 'ACTIVE'),
(3, 'H', 10, 'NORMAL', 'ACTIVE'),
(3, 'I', 1, 'VIP', 'ACTIVE'),
(3, 'I', 2, 'VIP', 'ACTIVE'),
(3, 'I', 3, 'NORMAL', 'ACTIVE'),
(3, 'I', 4, 'NORMAL', 'ACTIVE'),
(3, 'I', 5, 'NORMAL', 'ACTIVE'),
(3, 'I', 6, 'NORMAL', 'ACTIVE'),
(3, 'I', 7, 'NORMAL', 'ACTIVE'),
(3, 'I', 8, 'NORMAL', 'ACTIVE'),
(3, 'I', 9, 'NORMAL', 'ACTIVE'),
(3, 'I', 10, 'NORMAL', 'ACTIVE'),
(3, 'J', 1, 'VIP', 'ACTIVE'),
(3, 'J', 2, 'VIP', 'ACTIVE'),
(3, 'J', 3, 'NORMAL', 'ACTIVE'),
(3, 'J', 4, 'NORMAL', 'ACTIVE'),
(3, 'J', 5, 'NORMAL', 'ACTIVE'),
(3, 'J', 6, 'NORMAL', 'ACTIVE'),
(3, 'J', 7, 'NORMAL', 'ACTIVE'),
(3, 'J', 8, 'NORMAL', 'ACTIVE'),
(3, 'J', 9, 'NORMAL', 'ACTIVE'),
(3, 'J', 10, 'NORMAL', 'ACTIVE'),
(3, 'K', 1, 'VIP', 'ACTIVE'),
(3, 'K', 2, 'VIP', 'ACTIVE'),
(3, 'K', 3, 'NORMAL', 'ACTIVE'),
(3, 'K', 4, 'NORMAL', 'ACTIVE'),
(3, 'K', 5, 'NORMAL', 'ACTIVE'),
(3, 'K', 6, 'NORMAL', 'ACTIVE'),
(3, 'K', 7, 'NORMAL', 'ACTIVE'),
(3, 'K', 8, 'NORMAL', 'ACTIVE'),
(3, 'K', 9, 'NORMAL', 'ACTIVE'),
(3, 'K', 10, 'NORMAL', 'ACTIVE'),
(3, 'L', 1, 'VIP', 'ACTIVE'),
(3, 'L', 2, 'VIP', 'ACTIVE'),
(3, 'L', 3, 'NORMAL', 'ACTIVE'),
(3, 'L', 4, 'NORMAL', 'ACTIVE'),
(3, 'L', 5, 'NORMAL', 'ACTIVE'),
(3, 'L', 6, 'NORMAL', 'ACTIVE'),
(3, 'L', 7, 'NORMAL', 'ACTIVE'),
(3, 'L', 8, 'NORMAL', 'ACTIVE'),
(3, 'L', 9, 'NORMAL', 'ACTIVE'),
(3, 'L', 10, 'NORMAL', 'ACTIVE'),
(3, 'M', 1, 'VIP', 'ACTIVE'),
(3, 'M', 2, 'VIP', 'ACTIVE'),
(3, 'M', 3, 'NORMAL', 'ACTIVE'),
(3, 'M', 4, 'NORMAL', 'ACTIVE'),
(3, 'M', 5, 'NORMAL', 'ACTIVE'),
(3, 'M', 6, 'NORMAL', 'ACTIVE'),
(3, 'M', 7, 'NORMAL', 'ACTIVE'),
(3, 'M', 8, 'NORMAL', 'ACTIVE'),
(3, 'M', 9, 'NORMAL', 'ACTIVE'),
(3, 'M', 10, 'NORMAL', 'ACTIVE'),
(3, 'N', 1, 'VIP', 'ACTIVE'),
(3, 'N', 2, 'VIP', 'ACTIVE'),
(3, 'N', 3, 'NORMAL', 'ACTIVE'),
(3, 'N', 4, 'NORMAL', 'ACTIVE'),
(3, 'N', 5, 'NORMAL', 'ACTIVE'),
(3, 'N', 6, 'NORMAL', 'ACTIVE'),
(3, 'N', 7, 'NORMAL', 'ACTIVE'),
(3, 'N', 8, 'NORMAL', 'ACTIVE'),
(3, 'N', 9, 'NORMAL', 'ACTIVE'),
(3, 'N', 10, 'NORMAL', 'ACTIVE'),
(3, 'O', 1, 'VIP', 'ACTIVE'),
(3, 'O', 2, 'VIP', 'ACTIVE'),
(3, 'O', 3, 'NORMAL', 'ACTIVE'),
(3, 'O', 4, 'NORMAL', 'ACTIVE'),
(3, 'O', 5, 'NORMAL', 'ACTIVE'),
(3, 'O', 6, 'NORMAL', 'ACTIVE'),
(3, 'O', 7, 'NORMAL', 'ACTIVE'),
(3, 'O', 8, 'NORMAL', 'ACTIVE'),
(3, 'O', 9, 'NORMAL', 'ACTIVE'),
(3, 'O', 10, 'NORMAL', 'ACTIVE'),
(3, 'P', 1, 'VIP', 'ACTIVE'),
(3, 'P', 2, 'VIP', 'ACTIVE'),
(3, 'P', 3, 'NORMAL', 'ACTIVE'),
(3, 'P', 4, 'NORMAL', 'ACTIVE'),
(3, 'P', 5, 'NORMAL', 'ACTIVE'),
(3, 'P', 6, 'NORMAL', 'ACTIVE'),
(3, 'P', 7, 'NORMAL', 'ACTIVE'),
(3, 'P', 8, 'NORMAL', 'ACTIVE'),
(3, 'P', 9, 'NORMAL', 'ACTIVE'),
(3, 'P', 10, 'NORMAL', 'ACTIVE'),
(3, 'Q', 1, 'VIP', 'ACTIVE'),
(3, 'Q', 2, 'VIP', 'ACTIVE'),
(3, 'Q', 3, 'NORMAL', 'ACTIVE'),
(3, 'Q', 4, 'NORMAL', 'ACTIVE'),
(3, 'Q', 5, 'NORMAL', 'ACTIVE'),
(3, 'Q', 6, 'NORMAL', 'ACTIVE'),
(3, 'Q', 7, 'NORMAL', 'ACTIVE'),
(3, 'Q', 8, 'NORMAL', 'ACTIVE'),
(3, 'Q', 9, 'NORMAL', 'ACTIVE'),
(3, 'Q', 10, 'NORMAL', 'ACTIVE'),
(3, 'R', 1, 'VIP', 'ACTIVE'),
(3, 'R', 2, 'VIP', 'ACTIVE'),
(3, 'R', 3, 'NORMAL', 'ACTIVE'),
(3, 'R', 4, 'NORMAL', 'ACTIVE'),
(3, 'R', 5, 'NORMAL', 'ACTIVE'),
(3, 'R', 6, 'NORMAL', 'ACTIVE'),
(3, 'R', 7, 'NORMAL', 'ACTIVE'),
(3, 'R', 8, 'NORMAL', 'ACTIVE'),
(3, 'R', 9, 'NORMAL', 'ACTIVE'),
(3, 'R', 10, 'NORMAL', 'ACTIVE'),
(4, 'A', 1, 'NORMAL', 'ACTIVE'),
(4, 'A', 2, 'NORMAL', 'ACTIVE'),
(4, 'A', 3, 'NORMAL', 'ACTIVE'),
(4, 'A', 4, 'NORMAL', 'ACTIVE'),
(4, 'A', 5, 'NORMAL', 'ACTIVE'),
(4, 'A', 6, 'NORMAL', 'ACTIVE'),
(4, 'A', 7, 'NORMAL', 'ACTIVE'),
(4, 'A', 8, 'NORMAL', 'ACTIVE'),
(4, 'A', 9, 'NORMAL', 'ACTIVE'),
(4, 'A', 10, 'NORMAL', 'ACTIVE'),
(4, 'B', 1, 'NORMAL', 'ACTIVE'),
(4, 'B', 2, 'NORMAL', 'ACTIVE'),
(4, 'B', 3, 'NORMAL', 'ACTIVE'),
(4, 'B', 4, 'NORMAL', 'ACTIVE'),
(4, 'B', 5, 'NORMAL', 'ACTIVE'),
(4, 'B', 6, 'NORMAL', 'ACTIVE'),
(4, 'B', 7, 'NORMAL', 'ACTIVE'),
(4, 'B', 8, 'NORMAL', 'ACTIVE'),
(4, 'B', 9, 'NORMAL', 'ACTIVE'),
(4, 'B', 10, 'NORMAL', 'ACTIVE'),
(4, 'C', 1, 'VIP', 'ACTIVE'),
(4, 'C', 2, 'VIP', 'ACTIVE'),
(4, 'C', 3, 'NORMAL', 'ACTIVE'),
(4, 'C', 4, 'NORMAL', 'ACTIVE'),
(4, 'C', 5, 'NORMAL', 'ACTIVE'),
(4, 'C', 6, 'NORMAL', 'ACTIVE'),
(4, 'C', 7, 'NORMAL', 'ACTIVE'),
(4, 'C', 8, 'NORMAL', 'ACTIVE'),
(4, 'C', 9, 'NORMAL', 'ACTIVE'),
(4, 'C', 10, 'NORMAL', 'ACTIVE'),
(4, 'D', 1, 'VIP', 'ACTIVE'),
(4, 'D', 2, 'VIP', 'ACTIVE'),
(4, 'D', 3, 'NORMAL', 'ACTIVE'),
(4, 'D', 4, 'NORMAL', 'ACTIVE'),
(4, 'D', 5, 'NORMAL', 'ACTIVE'),
(4, 'D', 6, 'NORMAL', 'ACTIVE'),
(4, 'D', 7, 'NORMAL', 'ACTIVE'),
(4, 'D', 8, 'NORMAL', 'ACTIVE'),
(4, 'D', 9, 'NORMAL', 'ACTIVE'),
(4, 'D', 10, 'NORMAL', 'ACTIVE'),
(4, 'E', 1, 'VIP', 'ACTIVE'),
(4, 'E', 2, 'VIP', 'ACTIVE'),
(4, 'E', 3, 'NORMAL', 'ACTIVE'),
(4, 'E', 4, 'NORMAL', 'ACTIVE'),
(4, 'E', 5, 'NORMAL', 'ACTIVE'),
(4, 'E', 6, 'NORMAL', 'ACTIVE'),
(4, 'E', 7, 'NORMAL', 'ACTIVE'),
(4, 'E', 8, 'NORMAL', 'ACTIVE'),
(4, 'E', 9, 'NORMAL', 'ACTIVE'),
(4, 'E', 10, 'NORMAL', 'ACTIVE'),
(4, 'F', 1, 'VIP', 'ACTIVE'),
(4, 'F', 2, 'VIP', 'ACTIVE'),
(4, 'F', 3, 'NORMAL', 'ACTIVE'),
(4, 'F', 4, 'NORMAL', 'ACTIVE'),
(4, 'F', 5, 'NORMAL', 'ACTIVE'),
(4, 'F', 6, 'NORMAL', 'ACTIVE'),
(4, 'F', 7, 'NORMAL', 'ACTIVE'),
(4, 'F', 8, 'NORMAL', 'ACTIVE'),
(4, 'F', 9, 'NORMAL', 'ACTIVE'),
(4, 'F', 10, 'NORMAL', 'ACTIVE'),
(4, 'G', 1, 'VIP', 'ACTIVE'),
(4, 'G', 2, 'VIP', 'ACTIVE'),
(4, 'G', 3, 'NORMAL', 'ACTIVE'),
(4, 'G', 4, 'NORMAL', 'ACTIVE'),
(4, 'G', 5, 'NORMAL', 'ACTIVE'),
(4, 'G', 6, 'NORMAL', 'ACTIVE'),
(4, 'G', 7, 'NORMAL', 'ACTIVE'),
(4, 'G', 8, 'NORMAL', 'ACTIVE'),
(4, 'G', 9, 'NORMAL', 'ACTIVE'),
(4, 'G', 10, 'NORMAL', 'ACTIVE'),
(4, 'H', 1, 'VIP', 'ACTIVE'),
(4, 'H', 2, 'VIP', 'ACTIVE'),
(5, 'A', 1, 'NORMAL', 'INACTIVE'),
(5, 'A', 2, 'NORMAL', 'INACTIVE'),
(5, 'A', 3, 'NORMAL', 'INACTIVE'),
(5, 'A', 4, 'NORMAL', 'INACTIVE'),
(5, 'A', 5, 'NORMAL', 'INACTIVE'),
(5, 'A', 6, 'NORMAL', 'INACTIVE'),
(5, 'A', 7, 'NORMAL', 'ACTIVE'),
(5, 'A', 8, 'NORMAL', 'ACTIVE'),
(5, 'A', 9, 'NORMAL', 'ACTIVE'),
(5, 'A', 10, 'NORMAL', 'ACTIVE'),
(5, 'B', 1, 'NORMAL', 'ACTIVE'),
(5, 'B', 2, 'NORMAL', 'ACTIVE'),
(5, 'B', 3, 'NORMAL', 'ACTIVE'),
(5, 'B', 4, 'NORMAL', 'ACTIVE'),
(5, 'B', 5, 'NORMAL', 'ACTIVE'),
(5, 'B', 6, 'NORMAL', 'ACTIVE'),
(5, 'B', 7, 'NORMAL', 'ACTIVE'),
(5, 'B', 8, 'NORMAL', 'ACTIVE'),
(5, 'B', 9, 'NORMAL', 'ACTIVE'),
(5, 'B', 10, 'NORMAL', 'ACTIVE'),
(5, 'C', 1, 'VIP', 'ACTIVE'),
(5, 'C', 2, 'VIP', 'ACTIVE'),
(5, 'C', 3, 'NORMAL', 'ACTIVE'),
(5, 'C', 4, 'NORMAL', 'ACTIVE'),
(5, 'C', 5, 'NORMAL', 'ACTIVE'),
(5, 'C', 6, 'NORMAL', 'ACTIVE'),
(5, 'C', 7, 'NORMAL', 'ACTIVE'),
(5, 'C', 8, 'NORMAL', 'ACTIVE'),
(5, 'C', 9, 'NORMAL', 'ACTIVE'),
(5, 'C', 10, 'NORMAL', 'ACTIVE'),
(5, 'D', 1, 'VIP', 'ACTIVE'),
(5, 'D', 2, 'VIP', 'ACTIVE'),
(5, 'D', 3, 'NORMAL', 'ACTIVE'),
(5, 'D', 4, 'NORMAL', 'ACTIVE'),
(5, 'D', 5, 'NORMAL', 'ACTIVE'),
(5, 'D', 6, 'NORMAL', 'ACTIVE'),
(5, 'D', 7, 'NORMAL', 'ACTIVE'),
(5, 'D', 8, 'NORMAL', 'ACTIVE'),
(5, 'D', 9, 'NORMAL', 'ACTIVE'),
(5, 'D', 10, 'NORMAL', 'ACTIVE'),
(5, 'E', 1, 'VIP', 'ACTIVE'),
(5, 'E', 2, 'VIP', 'ACTIVE'),
(5, 'E', 3, 'NORMAL', 'ACTIVE'),
(5, 'E', 4, 'NORMAL', 'ACTIVE'),
(5, 'E', 5, 'NORMAL', 'ACTIVE'),
(5, 'E', 6, 'NORMAL', 'ACTIVE'),
(5, 'E', 7, 'NORMAL', 'ACTIVE'),
(5, 'E', 8, 'NORMAL', 'ACTIVE'),
(5, 'E', 9, 'NORMAL', 'ACTIVE'),
(5, 'E', 10, 'NORMAL', 'ACTIVE'),
(5, 'F', 1, 'VIP', 'ACTIVE'),
(5, 'F', 2, 'VIP', 'ACTIVE'),
(5, 'F', 3, 'NORMAL', 'ACTIVE'),
(5, 'F', 4, 'NORMAL', 'ACTIVE'),
(5, 'F', 5, 'NORMAL', 'ACTIVE'),
(5, 'F', 6, 'NORMAL', 'ACTIVE'),
(5, 'F', 7, 'NORMAL', 'ACTIVE'),
(5, 'F', 8, 'NORMAL', 'ACTIVE'),
(5, 'F', 9, 'NORMAL', 'ACTIVE'),
(5, 'F', 10, 'NORMAL', 'ACTIVE'),
(5, 'G', 1, 'VIP', 'ACTIVE'),
(5, 'G', 2, 'VIP', 'ACTIVE'),
(5, 'G', 3, 'NORMAL', 'ACTIVE'),
(5, 'G', 4, 'NORMAL', 'ACTIVE'),
(5, 'G', 5, 'NORMAL', 'ACTIVE'),
(5, 'G', 6, 'NORMAL', 'ACTIVE'),
(5, 'G', 7, 'NORMAL', 'ACTIVE'),
(5, 'G', 8, 'NORMAL', 'ACTIVE'),
(5, 'G', 9, 'NORMAL', 'ACTIVE'),
(5, 'G', 10, 'NORMAL', 'ACTIVE'),
(5, 'H', 1, 'VIP', 'ACTIVE'),
(5, 'H', 2, 'VIP', 'ACTIVE'),
(5, 'H', 3, 'NORMAL', 'ACTIVE'),
(5, 'H', 4, 'NORMAL', 'ACTIVE'),
(5, 'H', 5, 'NORMAL', 'ACTIVE'),
(5, 'H', 6, 'NORMAL', 'ACTIVE'),
(5, 'H', 7, 'NORMAL', 'ACTIVE'),
(5, 'H', 8, 'NORMAL', 'ACTIVE'),
(5, 'H', 9, 'NORMAL', 'ACTIVE'),
(5, 'H', 10, 'NORMAL', 'ACTIVE'),
(5, 'I', 1, 'VIP', 'ACTIVE'),
(5, 'I', 2, 'VIP', 'ACTIVE'),
(5, 'I', 3, 'NORMAL', 'ACTIVE'),
(5, 'I', 4, 'NORMAL', 'ACTIVE'),
(5, 'I', 5, 'NORMAL', 'ACTIVE'),
(5, 'I', 6, 'NORMAL', 'ACTIVE'),
(5, 'I', 7, 'NORMAL', 'ACTIVE'),
(5, 'I', 8, 'NORMAL', 'ACTIVE'),
(5, 'I', 9, 'NORMAL', 'ACTIVE'),
(5, 'I', 10, 'NORMAL', 'ACTIVE'),
(5, 'J', 1, 'VIP', 'ACTIVE'),
(5, 'J', 2, 'VIP', 'ACTIVE'),
(5, 'J', 3, 'NORMAL', 'ACTIVE'),
(5, 'J', 4, 'NORMAL', 'ACTIVE'),
(5, 'J', 5, 'NORMAL', 'ACTIVE'),
(5, 'J', 6, 'NORMAL', 'ACTIVE');

-- 4. DANH GIA PHIM
USE cinema_management;

CREATE TABLE IF NOT EXISTS movie_reviews (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,

    movie_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,

    rating TINYINT NOT NULL,
    content TEXT,

    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_movie_reviews_movie
    FOREIGN KEY (movie_id)
    REFERENCES movies(id)
    ON DELETE CASCADE,

    CONSTRAINT fk_movie_reviews_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE,

    CONSTRAINT chk_movie_reviews_rating
    CHECK (rating >= 1 AND rating <= 5),

    CONSTRAINT uq_movie_reviews_movie_user
    UNIQUE (movie_id, user_id)
);

-- 5. NHAN VIEN
USE cinema_management;

START TRANSACTION;

SET @employee_role_id := (
  SELECT id
  FROM roles
  WHERE name = 'EMPLOYEE'
  LIMIT 1
);

INSERT INTO users (username, password, role_id) VALUES
('nguyenvana', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('tranthibich', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('leminhcuong', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('phamthuha', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('hoangquocbao', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('vothanhdat', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('dangmaiphuong', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('buituananh', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('dothikimngan', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id),
('ngophuclong', '$2a$10$4y0IVPda0lYRaSEmS38ZBOFrdb7AR2GKfn2VPgfFTcOOHZXFYkmku', @employee_role_id)
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id);

INSERT INTO employees (
  user_id,
  employee_code,
  full_name,
  email,
  phone,
  date_of_birth,
  gender,
  address,
  position,
  avatar,
  status,
  created_at,
  updated_at
) VALUES
((SELECT id FROM users WHERE username = 'nguyenvana'), 'NV001', 'Nguyễn Văn An', 'nguyenvana@cinema.local', '0901234567', '1998-03-12', 'MALE', 'Hải Châu, Đà Nẵng', 'Nhân viên bán vé', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'tranthibich'), 'NV002', 'Trần Thị Bích', 'tranthibich@cinema.local', '0912345678', '1999-07-25', 'FEMALE', 'Thanh Khê, Đà Nẵng', 'Nhân viên quầy bắp nước', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'leminhcuong'), 'NV003', 'Lê Minh Cường', 'leminhcuong@cinema.local', '0923456789', '1997-11-08', 'MALE', 'Sơn Trà, Đà Nẵng', 'Nhân viên soát vé', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'phamthuha'), 'NV004', 'Phạm Thu Hà', 'phamthuha@cinema.local', '0934567890', '2000-01-19', 'FEMALE', 'Cẩm Lệ, Đà Nẵng', 'Nhân viên chăm sóc khách hàng', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'hoangquocbao'), 'NV005', 'Hoàng Quốc Bảo', 'hoangquocbao@cinema.local', '0945678901', '1996-05-03', 'MALE', 'Liên Chiểu, Đà Nẵng', 'Tổ trưởng ca', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'vothanhdat'), 'NV006', 'Võ Thành Đạt', 'vothanhdat@cinema.local', '0956789012', '1998-09-14', 'MALE', 'Ngũ Hành Sơn, Đà Nẵng', 'Kỹ thuật phòng chiếu', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'dangmaiphuong'), 'NV007', 'Đặng Mai Phương', 'dangmaiphuong@cinema.local', '0967890123', '2001-12-01', 'FEMALE', 'Hải Châu, Đà Nẵng', 'Nhân viên bán vé', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'buituananh'), 'NV008', 'Bùi Tuấn Anh', 'buituananh@cinema.local', '0978901234', '1995-04-22', 'MALE', 'Thanh Khê, Đà Nẵng', 'Nhân viên an ninh', NULL, 'INACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'dothikimngan'), 'NV009', 'Đỗ Thị Kim Ngân', 'dothikimngan@cinema.local', '0989012345', '1999-10-30', 'FEMALE', 'Sơn Trà, Đà Nẵng', 'Kế toán ca', NULL, 'ACTIVE', NOW(), NOW()),
((SELECT id FROM users WHERE username = 'ngophuclong'), 'NV010', 'Ngô Phúc Long', 'ngophuclong@cinema.local', '0990123456', '1997-06-17', 'OTHER', 'Cẩm Lệ, Đà Nẵng', 'Nhân viên kho', NULL, 'INACTIVE', NOW(), NOW())
ON DUPLICATE KEY UPDATE
  user_id = VALUES(user_id),
  full_name = VALUES(full_name),
  email = VALUES(email),
  phone = VALUES(phone),
  date_of_birth = VALUES(date_of_birth),
  gender = VALUES(gender),
  address = VALUES(address),
  position = VALUES(position),
  avatar = VALUES(avatar),
  status = VALUES(status),
  updated_at = NOW();

COMMIT;

-- 6. DAT VE ONLINE, LICH CHIEU, GIA VE VA MO TA PHIM
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

SET SQL_SAFE_UPDATES = @cinema_previous_safe_updates;
