package com.cinemamanagement.response;

public record MovieRatingSummaryResponse (
    Long movieId,
    Double averageRating,
    Long totalReviews
)
{}
