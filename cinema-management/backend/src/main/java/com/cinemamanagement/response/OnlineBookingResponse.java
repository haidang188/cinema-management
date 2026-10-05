package com.cinemamanagement.response;

import java.time.LocalDateTime;

public record OnlineBookingResponse(
        String bookingCode,
        String status,
        LocalDateTime paymentDeadline,
        PaymentInstructionResponse payment
) {
}
