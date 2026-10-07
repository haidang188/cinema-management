package com.cinemamanagement.response;

import java.time.LocalDateTime;
import java.util.List;

public record SeatHoldResponse(
        String holdToken,
        Long userId,
        Long showtimeId,
        List<Long> showtimeSeatIds,
        LocalDateTime heldAt,
        LocalDateTime expiresAt,
        String status
) {
}