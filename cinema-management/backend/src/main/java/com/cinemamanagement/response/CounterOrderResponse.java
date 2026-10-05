package com.cinemamanagement.response;

import java.util.List;

/**
 * holdToken: token giữ ghế của đơn. Frontend dùng token này cho mọi API giữ / nhả / bán.
 * maxSeats = null: không giới hạn (đơn đoàn).
 * expiresInSeconds = null: chưa giữ ghế nào.
 */
public record CounterOrderResponse(
        String code,
        String holdToken,
        Long showtimeId,
        String mode,
        String status,
        Integer maxSeats,
        int extendCount,
        int maxExtends,
        Long expiresInSeconds,
        List<Long> heldSeatIds,
        String customerName,
        String customerPhone,
        ShowtimeBrief showtime
) {
}