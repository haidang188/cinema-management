package com.cinemamanagement.response;

import java.math.BigDecimal;

public record PromotionQuote(
        boolean valid,
        Long promotionId,
        String code,
        String title,
        String discountType,
        BigDecimal discountValue,
        BigDecimal orderAmount,
        BigDecimal discountAmount,
        BigDecimal finalAmount,
        String message
) {

    public static PromotionQuote invalid(String code, BigDecimal orderAmount, String message) {
        return new PromotionQuote(false, null, code, null, null, null,
                orderAmount, BigDecimal.ZERO, orderAmount, message);
    }
}