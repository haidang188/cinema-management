package com.cinemamanagement.response;

public record PointSummaryResponse(
        Integer pointBalance,
        String membershipLevel,
        Integer nextLevelPoints,
        String nextLevel
) {
}
