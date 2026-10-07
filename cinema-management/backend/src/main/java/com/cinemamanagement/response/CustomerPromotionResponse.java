package com.cinemamanagement.response;

import com.cinemamanagement.entity.Promotion;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record CustomerPromotionResponse(
        Long id,
        String title,
        String description,
        String imageUrl,
        String code,
        String discountType,
        BigDecimal discountValue,
        BigDecimal minOrderAmount,
        BigDecimal maxDiscountAmount,
        LocalDateTime startDate,
        LocalDateTime endDate,
        String status
) {

    public static CustomerPromotionResponse from(
            Promotion promotion,
            LocalDateTime now
    ) {
        return new CustomerPromotionResponse(
                promotion.getId(),
                promotion.getTitle(),
                promotion.getDescription(),
                promotion.getImageUrl(),
                promotion.getCode(),
                promotion.getDiscountType(),
                promotion.getDiscountValue(),
                promotion.getMinOrderAmount(),
                promotion.getMaxDiscountAmount(),
                promotion.getStartDate(),
                promotion.getEndDate(),
                promotion.getStartDate().isAfter(now)
                        ? "UPCOMING"
                        : "ACTIVE"
        );
    }
}