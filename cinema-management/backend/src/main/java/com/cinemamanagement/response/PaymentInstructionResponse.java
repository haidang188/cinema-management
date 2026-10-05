package com.cinemamanagement.response;

import java.math.BigDecimal;

public record PaymentInstructionResponse(
        String method,
        BigDecimal amount,
        String paymentUrl,
        String qrImageUrl,
        String bankName,
        String accountNumber,
        String accountName,
        String transferContent
) {
}
