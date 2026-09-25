package com.cinemamanagement.controller;

import com.cinemamanagement.request.MovieReviewRequest;
import com.cinemamanagement.response.MovieRatingSummaryResponse;
import com.cinemamanagement.response.MovieReviewEligibilityResponse;
import com.cinemamanagement.response.MovieReviewResponse;
import com.cinemamanagement.service.MovieReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/movies/{movieId}/reviews")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
@RequiredArgsConstructor
public class MovieReviewController {
    private final MovieReviewService movieReviewService;
    @GetMapping
    public List<MovieReviewResponse> getReviewsByMovie(@PathVariable Long movieId){
        return movieReviewService.getReviewsByMovie(movieId);
    }
    @GetMapping("/summary")
    public MovieRatingSummaryResponse getRatingSummary(@PathVariable Long movieId){
        return movieReviewService.getRatingSummary(movieId);
    }
    @GetMapping("/eligibility")
    public MovieReviewEligibilityResponse getReviewEligibility(@PathVariable Long movieId, @RequestParam Long userId){
        return movieReviewService.getReviewEligibility(movieId, userId);
    }
    @PostMapping
    public MovieReviewResponse createOrUpdateReview(@PathVariable Long movieId, @RequestParam Long userId, @Valid @RequestBody MovieReviewRequest request){
        return movieReviewService.createOrUpdateReview(movieId,userId,request);
    }

}
