package com.cinemamanagement.response;

public record MovieReviewEligibilityResponse(
        Long movieId,
        Long userId,
        boolean canReview
) {
}
