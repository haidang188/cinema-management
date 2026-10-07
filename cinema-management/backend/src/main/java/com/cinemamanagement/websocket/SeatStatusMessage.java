package com.cinemamanagement.websocket;

import java.time.LocalDateTime;
import java.util.List;

public record SeatStatusMessage(
        String type,
        Long showtimeId,
        List<Long> showtimeSeatIds,
        LocalDateTime heldUntil
) {
}