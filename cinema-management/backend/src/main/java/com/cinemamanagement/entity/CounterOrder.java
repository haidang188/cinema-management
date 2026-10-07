package com.cinemamanagement.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * ĐƠN NHÁP BÁN VÉ TẠI QUẦY
 * ---------------------------------------------------------------
 * Ghế được giữ theo ĐƠN (hold_token của đơn), không theo tab trình duyệt,
 * nên có thể tạm gác đơn rồi mở lại ở quầy khác / sau khi F5.
 *
 * status : DRAFT (đang làm) -> PARKED (tạm gác) -> DRAFT (mở lại) -> COMPLETED (đã bán)
 *                                                       \-> EXPIRED (hết hạn) / CANCELLED (huỷ)
 * mode   : NORMAL (tối đa 20 ghế) | GROUP (đơn đoàn / bao rạp, không giới hạn ghế)
 */
@Getter
@Setter
@Entity
@Table(
        name = "counter_orders",
        indexes = {
                @Index(name = "idx_counter_orders_owner", columnList = "hold_owner", unique = true),
                @Index(name = "idx_counter_orders_status", columnList = "status, expires_at")
        }
)
public class CounterOrder {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mã hiển thị cho nhân viên, vd DH260929K7Q2. */
    @Column(nullable = false, unique = true, length = 20)
    private String code;

    /**
     * Token giữ ghế của đơn (bí mật). Lưu bản gốc để quầy khác mở lại đơn tạm gác
     * vẫn giữ / nhả / bán đúng các ghế đó. Chỉ trả về cho nhân viên đã đăng nhập.
     */
    @Column(name = "hold_token", nullable = false, length = 64)
    private String holdToken;

    /** SHA-256 của holdToken, khớp showtime_seats.hold_owner. */
    @Column(name = "hold_owner", nullable = false, length = 64)
    private String holdOwner;

    @Column(name = "showtime_id", nullable = false)
    private Long showtimeId;

    @Column(name = "employee_id")
    private Long employeeId;

    @Column(nullable = false, length = 10)
    private String mode;

    @Column(nullable = false, length = 12)
    private String status;

    @Column(name = "customer_name", length = 100)
    private String customerName;

    @Column(name = "customer_phone", length = 15)
    private String customerPhone;

    @Column(name = "extend_count", nullable = false)
    private int extendCount;

    /** Hạn giữ ghế của cả đơn; null khi chưa giữ ghế nào. */
    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "parked_at")
    private LocalDateTime parkedAt;

    @Column(name = "booking_id")
    private Long bookingId;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    private Long version;

    public boolean isActive() {
        return "DRAFT".equals(status) || "PARKED".equals(status);
    }

    public boolean isGroup() {
        return "GROUP".equals(mode);
    }
}