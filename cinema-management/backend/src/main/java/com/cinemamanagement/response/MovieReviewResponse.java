package com.cinemamanagement.response;

import java.time.LocalDateTime;

public record MovieReviewResponse(
        Long id,
        Long movieId,
        Long userId,
        String reviewerName,
        Integer rating,
        String content,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}