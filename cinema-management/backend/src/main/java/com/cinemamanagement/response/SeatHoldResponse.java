package com.cinemamanagement.response;

import java.util.List;

public record SeatHoldResponse(
        Long showtimeId,
        List<Long> heldSeatIds,
        long expiresInSeconds,
        /** Ghế bị bỏ qua khi allowPartial (đã có nơi khác giữ / bán), vd ["D5", "D6"]. */
        List<String> skippedSeats
) {
}