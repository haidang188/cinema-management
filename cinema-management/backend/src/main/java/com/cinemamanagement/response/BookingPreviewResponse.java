package com.cinemamanagement.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record BookingPreviewResponse(
        String holdToken,
        Long showtimeId,
        String movieTitle,
        String posterUrl,
        String roomName,
        String format,
        LocalDateTime startTime,
        LocalDateTime expiresAt,
        List<BookingSeatPriceResponse> seats,
        BigDecimal subtotal,
        BigDecimal discountAmount,
        BigDecimal totalAmount,
        String promotionMessage
) {
}
