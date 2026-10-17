package com.cinemamanagement.response;

import java.time.LocalDateTime;
import java.util.List;

public record PickupBookingItemResponse(
        Long id,
        String bookingCode,
        String channel,
        String customerName,
        String customerPhone,
        String movieTitle,
        String posterUrl,
        LocalDateTime startTime,
        String roomName,
        List<String> seats,
        boolean pickedUp,
        boolean canPickUp
) {
}