package com.cinemamanagement.response;

import java.math.BigDecimal;

public record BookingTicketResponse(
        String ticketCode,
        String seatName,
        String seatType,
        BigDecimal price,
        String status
) {
}
