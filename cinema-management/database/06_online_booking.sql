USE cinema_management;

-- =========================================================
-- ONLINE BOOKING MIGRATION
-- - Seat inventory per showtime
-- - Five-minute seat holds
-- - Online payment metadata
-- - One booking QR and one ticket per seat
-- This script is safe to run after rap_chieu_phim_full.sql.
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

-- Legacy hold rows did not have a token. Each old row receives a valid token.
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

-- Generate one inventory row for every physical seat in every existing showtime.
-- INSERT IGNORE keeps this operation idempotent because of the unique pair above.
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

-- Normalize nullable legacy states used by older schema dumps.
UPDATE booking_seats
SET status = 'ACTIVE'
WHERE status IS NULL;

UPDATE showtime_seats
SET status = 'AVAILABLE'
WHERE status IS NULL OR status = '';
