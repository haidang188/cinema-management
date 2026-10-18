package com.cinemamanagement.service;

import com.cinemamanagement.entity.CounterOrder;

import java.time.Duration;
import java.time.LocalDateTime;

/**
 * CHÍNH SÁCH GIỮ GHẾ THEO KÊNH BÁN
 * ---------------------------------------------------------------
 *                    tối đa ghế      hạn giữ   gia hạn
 *   Online            8              10 phút   -   (cấu hình booking.* trong SeatHoldServiceImpl,
 *                                                   kèm chặn giữ ghế khi để hết hạn nhiều lần)
 *   Quầy - thường   20               5 phút   +2 phút x 2 lần
 *   Quầy - đơn đoàn  không giới hạn  15 phút   +2 phút x 2 lần
 *   Tạm gác đơn      -               15 phút   -
 *
 * Bản cài đặt (HoldPolicyServiceImpl) chỉ phụ thuộc repository, để SeatHoldService và
 * CounterOrderService cùng dùng mà không bị vòng phụ thuộc bean.
 */
public interface HoldPolicyService {

    int COUNTER_MAX_SEATS = 20;

    Duration COUNTER_DURATION = Duration.ofMinutes(5);
    Duration GROUP_DURATION = Duration.ofMinutes(15);
    Duration PARK_DURATION = Duration.ofMinutes(15);
    Duration EXTEND_STEP = Duration.ofMinutes(2);
    int MAX_EXTENDS = 2;

    /** maxSeats = null: không giới hạn (chỉ bị giới hạn bởi số ghế của phòng). */
    record Rule(Integer maxSeats, Duration duration, CounterOrder order) {

        public boolean isCounter() {
            return order != null;
        }
    }

    /**
     * Tìm chính sách theo người giữ ghế.
     * Đơn quầy đã kết thúc -> lỗi; đơn đang tạm gác -> không cho giữ thêm (forNewHold = true).
     */
    Rule resolve(String holdOwner, boolean forNewHold);

    /** Đồng bộ hạn giữ ghế vào đơn quầy (null = không còn ghế nào). */
    void syncOrderExpiry(Rule rule, LocalDateTime expiresAt);
}