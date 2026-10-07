package com.cinemamanagement.response;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PromotionResponse(
        Long id,
        String title,
        String description,
        String imageUrl,
        String code,
        String discountType,
        BigDecimal discountValue,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        Integer usageLimit,
        Integer usedCount,
        LocalDateTime startDate,
        LocalDateTime endDate,
        String status
) {
}
