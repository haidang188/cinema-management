package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Movie;
import org.jspecify.annotations.NonNull;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface MovieRepository extends JpaRepository<Movie, Long> {
    @Query("""
            select movie from Movie movie
            where (:keyword is null or lower(movie.title) like lower(concat('%', :keyword, '%')))
              and (:status is null or movie.status = :status)
            """)
    Page<Movie> searchMovies(@Param("keyword") String keyword, @Param("status") String status, Pageable pageable);

    @Query("select movie from Movie movie left join fetch movie.genres where movie.id = :id")
    Optional<Movie> findByIdWithGenres(@Param("id") Long id);

    @Query("""
            select distinct movie from Movie movie
            left join fetch movie.genres
            where movie.status = :status
            order by movie.releaseDate desc
        """)
    List<Movie> findByStatusWithGenresOrderByReleaseDateDesc(@Param("status") String status);
    boolean existsById(Long movieId);
    @Query("""
            select distinct movie from Movie movie
            left join fetch movie.genres
            left join movie.genres genreFilter
            where (:status is null or movie.status = :status)
              and (:genreId is null or genreFilter.id = :genreId)
              and (:startOfDay is null or exists (
                    select showtime.id from Showtime showtime
                    where showtime.movie = movie
                      and showtime.startTime >= :startOfDay
                      and showtime.startTime < :endOfDay
              ))
            order by movie.releaseDate desc
        """)
    List<Movie> searchHomeMovies(
            @Param("status") String status,
            @Param("genreId") Long genreId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

    boolean existsByTitle(String title);

    Optional<Movie> findFirstByStatusOrderByReleaseDateDesc(String status);
}
