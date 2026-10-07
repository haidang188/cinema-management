package com.cinemamanagement.response;

public record PromotionStatisticsResponse(
        long total,
        long active,
        long upcoming,
        long expired,
        long inactive,
        long expiringSoon
) {
}
