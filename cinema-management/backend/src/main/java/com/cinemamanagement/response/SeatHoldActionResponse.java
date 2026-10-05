package com.cinemamanagement.response;

import java.util.List;

/** Response gọn cho thao tác giữ/nhả ghế theo thời gian thực. */
public record SeatHoldActionResponse(
        Long showtimeId,
        List<Long> heldSeatIds,
        long expiresInSeconds,
        List<String> skippedSeats
) {
}
