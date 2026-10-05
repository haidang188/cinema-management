package com.cinemamanagement.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;


public record BookingListItemResponse(
        Long id,
        String bookingCode,

        String channel,
        String status,
        String customerName,
        String customerPhone,
        String movieTitle,
        String posterUrl,
        LocalDateTime showtimeStart,
        String roomName,

        List<String> seats,
        BigDecimal totalAmount,
        BigDecimal discountAmount,

        String paymentMethod,
        String paymentStatus,

        String employeeName,
        LocalDateTime createdAt
) {
}