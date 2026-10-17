package com.cinemamanagement.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record PickupInfoResponse(
        Long id,
        String bookingCode,
        String channel,
        String status,
        LocalDateTime createdAt,

        Customer customer,
        Showtime showtime,
        List<TicketItem> tickets,

        BigDecimal totalAmount,
        String paymentMethod,
        String paymentStatus,
        LocalDateTime paidAt,

        Pickup pickup,

        boolean canPickUp,

        String blockedReason
) {

    public record Customer(String name, String phone, String email) {
    }

    public record Showtime(
            Long id,
            String movieTitle,
            String posterUrl,
            LocalDateTime startTime,
            LocalDateTime endTime,
            String roomName,
            String roomType
    ) {
    }

    public record TicketItem(
            String seat,
            String seatType,
            String ticketCode,
            String qrToken,
            String ticketStatus
    ) {
    }

    public record Pickup(
            boolean pickedUp,
            LocalDateTime pickedUpAt,
            String pickedUpBy
    ) {
    }
}