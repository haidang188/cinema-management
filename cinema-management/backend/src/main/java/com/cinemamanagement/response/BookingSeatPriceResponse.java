package com.cinemamanagement.response;

import java.math.BigDecimal;

public record BookingSeatPriceResponse(
        Long showtimeSeatId,
        Long seatId,
        String seatName,
        String seatType,
        BigDecimal price
) {
}
