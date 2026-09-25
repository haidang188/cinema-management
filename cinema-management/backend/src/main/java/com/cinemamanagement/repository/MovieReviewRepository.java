package com.cinemamanagement.repository;

import com.cinemamanagement.entity.MovieReview;
import com.cinemamanagement.response.MovieRatingSummaryResponse;
import com.cinemamanagement.response.MovieReviewResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface MovieReviewRepository extends JpaRepository<MovieReview, Long> {
    @Query("""
        select review from MovieReview review join fetch review.user user
        where review.movie.id = :movieId order by review.createdAt desc
        """)
    List<MovieReview> findByMovieIdOrderByCreatedAtDesc(@Param("movieId") Long movieId);
    Optional<MovieReview> findByMovieIdAndUserId(Long movieId, Long userId);

    @Query("""
        select new com.cinemamanagement.response.MovieRatingSummaryResponse(
                        :movieId,
                        coalesce(avg(review.rating), 0),
                        count(review.id)
                    )
                    from MovieReview review
                    where review.movie.id = :movieId
    """)
    MovieRatingSummaryResponse getRatingSummary(@Param("movieId") Long movieId);
}
