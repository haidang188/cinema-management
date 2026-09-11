package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Movie;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
