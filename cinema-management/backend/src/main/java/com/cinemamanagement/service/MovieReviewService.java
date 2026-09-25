package com.cinemamanagement.service;

import com.cinemamanagement.request.MovieReviewRequest;
import com.cinemamanagement.response.MovieRatingSummaryResponse;
import com.cinemamanagement.response.MovieReviewEligibilityResponse;
import com.cinemamanagement.response.MovieReviewResponse;

import java.util.List;

public interface MovieReviewService {
    List<MovieReviewResponse> getReviewsByMovie(Long movieId);
    MovieRatingSummaryResponse getRatingSummary(Long movieId);
    MovieReviewEligibilityResponse getReviewEligibility(Long movieId, Long userId);
    MovieReviewResponse createOrUpdateReview(Long movieId, Long userId, MovieReviewRequest request);
}
