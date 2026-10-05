package com.cinemamanagement.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record BookingDetailResponse(
        String bookingCode,
        String bookingStatus,
        String paymentMethod,
        String paymentStatus,
        LocalDateTime paidAt,
        LocalDateTime paymentDeadline,
        String customerName,
        String customerEmail,
        String customerPhone,
        String movieTitle,
        String posterUrl,
        String ageRating,
        String roomName,
        String roomType,
        String format,
        LocalDateTime startTime,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String bookingQrToken,
        List<BookingTicketResponse> tickets
) {
}
