-- Premiere Cinemas
-- Migration 10: điểm thành viên, hạng thành viên và vòng đời xóa tài khoản
-- Yêu cầu: MySQL 8.x

USE cinema_management;

-- Ghi nhớ cấu hình Safe Updates của phiên hiện tại và tạm tắt trong lúc
-- chuẩn hóa dữ liệu. Cuối file sẽ khôi phục lại đúng giá trị ban đầu.
SET @previous_sql_safe_updates := @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

-- =====================================================
-- 1. Chuẩn hóa điểm và hạng thành viên hiện có
-- =====================================================

UPDATE members
SET point_balance = 0
WHERE id > 0
  AND (point_balance IS NULL OR point_balance < 0);

UPDATE members
SET membership_level = CASE
                           WHEN point_balance >= 600 THEN 'PLATINUM'
                           WHEN point_balance >= 300 THEN 'GOLD'
                           WHEN point_balance >= 100 THEN 'SILVER'
                           ELSE 'BASIC'
    END
WHERE id > 0;

ALTER TABLE members
    MODIFY COLUMN point_balance INT NOT NULL DEFAULT 0,
    MODIFY COLUMN membership_level VARCHAR(50) NOT NULL DEFAULT 'BASIC';

ALTER TABLE members
    ADD CONSTRAINT chk_members_point_balance_nonnegative
        CHECK (point_balance >= 0),
    ADD CONSTRAINT chk_members_membership_level
        CHECK (membership_level IN ('BASIC', 'SILVER', 'GOLD', 'PLATINUM'));

-- =====================================================
-- 2. Bổ sung vòng đời xóa tài khoản
--
-- Trạng thái member được sử dụng sau migration:
-- ACTIVE, INACTIVE, PENDING_DELETION, DELETED.
-- =====================================================

ALTER TABLE members
    ADD COLUMN deletion_requested_at DATETIME NULL
        AFTER updated_at,
    ADD COLUMN scheduled_deletion_at DATETIME NULL
        AFTER deletion_requested_at,
    ADD COLUMN deleted_at DATETIME NULL
        AFTER scheduled_deletion_at,
    ADD COLUMN deletion_reason VARCHAR(500) NULL
        AFTER deleted_at;

CREATE INDEX idx_members_pending_deletion
    ON members (status, scheduled_deletion_at);

-- =====================================================
-- 3. Hoàn thiện lịch sử điểm
--
-- points          : số điểm thay đổi trong giao dịch.
-- balance_before  : tổng điểm trước giao dịch.
-- balance_after   : tổng điểm sau giao dịch.
-- idempotency_key : ngăn một booking được cộng điểm nhiều lần.
-- =====================================================

ALTER TABLE point_histories
    ADD COLUMN balance_before INT NULL
        AFTER points,
    ADD COLUMN balance_after INT NULL
        AFTER balance_before,
    ADD COLUMN idempotency_key VARCHAR(150) NULL
        AFTER description;

CREATE INDEX idx_point_histories_member_created
    ON point_histories (member_id, created_at);

CREATE UNIQUE INDEX uq_point_histories_idempotency
    ON point_histories (idempotency_key);

CREATE UNIQUE INDEX uq_point_histories_booking_type
    ON point_histories (booking_id, type);

-- Dữ liệu mẫu hiện chưa có lịch sử điểm, vì vậy có thể siết các cột
-- nghiệp vụ thành NOT NULL ngay trong migration này.
ALTER TABLE point_histories
    MODIFY COLUMN type VARCHAR(20) NOT NULL,
    MODIFY COLUMN balance_before INT NOT NULL,
    MODIFY COLUMN balance_after INT NOT NULL,
    MODIFY COLUMN created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE point_histories
    ADD CONSTRAINT chk_point_histories_type
        CHECK (type IN ('EARN', 'REDEEM', 'REFUND', 'ADJUST', 'EXPIRE')),
    ADD CONSTRAINT chk_point_histories_balances_nonnegative
        CHECK (balance_before >= 0 AND balance_after >= 0);

-- Khôi phục Safe Updates về trạng thái trước khi chạy migration.
SET SQL_SAFE_UPDATES = @previous_sql_safe_updates;

-- =====================================================
-- 4. Truy vấn kiểm tra sau migration
-- =====================================================

SELECT
    id,
    full_name,
    point_balance,
    membership_level,
    status,
    deletion_requested_at,
    scheduled_deletion_at,
    deleted_at
FROM members
ORDER BY id;

-- Truy vấn này phải trả về 0 dòng nếu toàn bộ hạng đã được gán đúng.
SELECT
    id,
    point_balance,
    membership_level,
    CASE
        WHEN point_balance >= 600 THEN 'PLATINUM'
        WHEN point_balance >= 300 THEN 'GOLD'
        WHEN point_balance >= 100 THEN 'SILVER'
        ELSE 'BASIC'
        END AS expected_level
FROM members
WHERE membership_level <> CASE
                              WHEN point_balance >= 600 THEN 'PLATINUM'
                              WHEN point_balance >= 300 THEN 'GOLD'
                              WHEN point_balance >= 100 THEN 'SILVER'
                              ELSE 'BASIC'
    END;
