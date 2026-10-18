package com.cinemamanagement.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "booking")
public class BookingProperties {
    /** Thời gian giữ ghế online, tính từ lúc chọn ghế tới hạn thanh toán. */
    private int seatHoldDurationMinutes = 10;
    private long seatHoldCleanupMilliseconds = 10000;

    /** Số ghế tối đa cho một lượt đặt online; nhóm lớn hơn mua tại quầy (đơn đoàn). */
    private int onlineMaxSeats = 8;

    /*
     * Chống chiếm ghế: trong abuseWindowMinutes, nếu một thành viên để hết hạn
     * (giữ ghế/tạo đơn nhưng không thanh toán) abuseMaxExpiredHolds lượt,
     * thì bị chặn giữ ghế online thêm abuseBlockMinutes kể từ lượt hết hạn gần nhất.
     */
    private int abuseWindowMinutes = 60;
    private int abuseMaxExpiredHolds = 3;
    private int abuseBlockMinutes = 30;

    public int getSeatHoldDurationMinutes() {
        return seatHoldDurationMinutes;
    }

    public void setSeatHoldDurationMinutes(int seatHoldDurationMinutes) {
        this.seatHoldDurationMinutes = seatHoldDurationMinutes;
    }

    public long getSeatHoldCleanupMilliseconds() {
        return seatHoldCleanupMilliseconds;
    }

    public void setSeatHoldCleanupMilliseconds(long seatHoldCleanupMilliseconds) {
        this.seatHoldCleanupMilliseconds = seatHoldCleanupMilliseconds;
    }

    public int getOnlineMaxSeats() {
        return onlineMaxSeats;
    }

    public void setOnlineMaxSeats(int onlineMaxSeats) {
        this.onlineMaxSeats = onlineMaxSeats;
    }

    public int getAbuseWindowMinutes() {
        return abuseWindowMinutes;
    }

    public void setAbuseWindowMinutes(int abuseWindowMinutes) {
        this.abuseWindowMinutes = abuseWindowMinutes;
    }

    public int getAbuseMaxExpiredHolds() {
        return abuseMaxExpiredHolds;
    }

    public void setAbuseMaxExpiredHolds(int abuseMaxExpiredHolds) {
        this.abuseMaxExpiredHolds = abuseMaxExpiredHolds;
    }

    public int getAbuseBlockMinutes() {
        return abuseBlockMinutes;
    }

    public void setAbuseBlockMinutes(int abuseBlockMinutes) {
        this.abuseBlockMinutes = abuseBlockMinutes;
    }
}
