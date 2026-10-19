package com.cinemamanagement.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record BookingManagementDetailResponse(
        Long id,
        String bookingCode,
        String channel,
        String status,
        LocalDateTime createdAt,

        Customer customer,
        Showtime showtime,
        List<SeatTicket> tickets,
        Payment payment,

        BigDecimal subtotalAmount,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String promotionCode,
        String employeeName,

        boolean reprintable,

        String reprintBlockedReason
) {

    public record Customer(String name, String phone) {
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

    public record SeatTicket(
            String seat,
            String seatType,
            BigDecimal price,
            String ticketCode,
            String ticketStatus,
            LocalDateTime issuedAt,

            int reprintCount,
            LocalDateTime lastReprintedAt
    ) {
    }

    public record Payment(
            String method,
            String provider,
            String status,
            BigDecimal amount,
            BigDecimal cashReceived,
            BigDecimal changeAmount,
            String transactionCode,
            LocalDateTime paidAt
    ) {
    }
}