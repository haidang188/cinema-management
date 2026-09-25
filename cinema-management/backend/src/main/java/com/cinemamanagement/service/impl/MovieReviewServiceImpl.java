package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Movie;
import com.cinemamanagement.entity.MovieReview;
import com.cinemamanagement.entity.User;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.BookingRepository;
import com.cinemamanagement.repository.MemberRepository;
import com.cinemamanagement.repository.MovieRepository;
import com.cinemamanagement.repository.MovieReviewRepository;
import com.cinemamanagement.repository.UserRepository;
import com.cinemamanagement.request.MovieReviewRequest;
import com.cinemamanagement.response.MovieRatingSummaryResponse;
import com.cinemamanagement.response.MovieReviewEligibilityResponse;
import com.cinemamanagement.response.MovieReviewResponse;
import com.cinemamanagement.service.MovieReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
@Service
@RequiredArgsConstructor
public class MovieReviewServiceImpl implements MovieReviewService {
    private final MovieReviewRepository movieReviewRepository;
    private final MovieRepository movieRepository;
    private final MemberRepository memberRepository;
    private final UserRepository userRepository;
    private final BookingRepository bookingRepository;
    @Override
    @Transactional(readOnly = true)
    public List<MovieReviewResponse> getReviewsByMovie(Long movieId) {
        if(!movieRepository.existsById(movieId)) {
            throw new ResourceNotFoundException("Movie not found with id " + movieId);
        }
        return movieReviewRepository.findByMovieIdOrderByCreatedAtDesc(movieId).stream()
                .map(this::toResponse).toList();
    }

    private MovieReviewResponse toResponse(MovieReview movieReview) {
        String reviewName = memberRepository.findByUserId(movieReview.getUser().getId()).map(member -> member.getFullName())
                .filter(fullName -> fullName != null && !fullName.isBlank()).orElse(movieReview.getUser().getUsername());
        return new MovieReviewResponse(
                movieReview.getId(),
                movieReview.getMovie().getId(),
                movieReview.getUser().getId(),
                reviewName,
                movieReview.getRating(),
                movieReview.getContent(),
                movieReview.getCreatedAt(),
                movieReview.getUpdatedAt()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public MovieRatingSummaryResponse getRatingSummary(Long movieId) {
        if(!movieRepository.existsById(movieId)) {
            throw new ResourceNotFoundException("Movie not found with id " + movieId);
        }
        return movieReviewRepository.getRatingSummary(movieId);
    }

    @Override
    @Transactional(readOnly = true)
    public MovieReviewEligibilityResponse getReviewEligibility(Long movieId, Long userId) {
        if(!movieRepository.existsById(movieId)) {
            throw new ResourceNotFoundException("Movie not found with id " + movieId);
        }
        if(!userRepository.existsById(userId)) {
            throw new ResourceNotFoundException("User not found with id " + userId);
        }

        boolean canReview = bookingRepository.existsValidBookingByUserIdAndMovieId(userId, movieId);
        return new MovieReviewEligibilityResponse(movieId, userId, canReview);
    }

    @Override
    @Transactional
    public MovieReviewResponse createOrUpdateReview(Long movieId, Long userId, MovieReviewRequest request) {
        validateRequest(request);
        Movie movie = movieRepository.findById(movieId).orElseThrow(() -> new ResourceNotFoundException("Phim không tồn tại với id " + movieId));
        User user = userRepository.findById(userId).orElseThrow(() -> new ResourceNotFoundException("Người dùng không tồn tại với id " + userId));
        if (!bookingRepository.existsValidBookingByUserIdAndMovieId(userId, movieId)) {
            throw new BadRequestException("Bạn cần đặt vé phim này trước khi đánh giá");
        }

        MovieReview review = movieReviewRepository.findByMovieIdAndUserId(movieId, userId)
                .orElseGet(MovieReview::new);

        review.setMovie(movie);
        review.setUser(user);
        review.setRating(request.getRating());
        review.setContent(normalizeContent(request.getContent()));
        return toResponse(movieReviewRepository.save(review));
    }
    private void validateRequest(MovieReviewRequest request){
        if (request.getRating() == null){
            throw new BadRequestException("Vui lòng chọn số sao");
        }
        if(request.getRating() < 1 || request.getRating() > 5){
            throw new BadRequestException("Số sao phải nằm trong khoảng từ 1 tới 5");
        }
    }
    private String normalizeContent(String content){
        if(content == null || content.isBlank()){
            return null;
        }
        return content.trim();
    }
}
