package com.cinemamanagement.response;

import com.cinemamanagement.entity.ShowtimeSeat;

import java.time.Duration;
import java.time.LocalDateTime;

/** Trạng thái 1 ghế, dùng cho API seat-states và tin nhắn WebSocket. */
public record SeatStateResponse(
        Long showtimeSeatId,
        String status,
        String holdOwner,
        Long expiresInSeconds
) {

    public static SeatStateResponse of(ShowtimeSeat seat, LocalDateTime now) {
        boolean held = "HELD".equalsIgnoreCase(seat.getStatus());
        boolean expired = held && (seat.getHeldUntil() == null || !seat.getHeldUntil().isAfter(now));

        if (held && expired) {
            return new SeatStateResponse(seat.getId(), "AVAILABLE", null, null);
        }

        return new SeatStateResponse(
                seat.getId(),
                seat.getStatus(),
                held ? seat.getHoldOwner() : null,
                held ? Math.max(0, Duration.between(now, seat.getHeldUntil()).toSeconds()) : null
        );
    }
}