package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ShowtimeRepository extends JpaRepository <Showtime, Long>{

    List<Showtime> findByStartTimeGreaterThanEqualAndStartTimeLessThan (
            LocalDateTime startOfDay,
            LocalDateTime endOfDay
    );

    @Query("""
            select showtime from Showtime showtime
            join fetch showtime.movie movie
            join fetch showtime.room room
            where movie.id = :movieId
              and showtime.startTime >= :startOfDay
              and showtime.startTime < :endOfDay
            order by showtime.startTime asc
            """)
    List<Showtime> findByMovieIdAndStartTimeBetween(
            @Param("movieId") Long movieId,
            @Param("startOfDay") LocalDateTime startOfDay,
            @Param("endOfDay") LocalDateTime endOfDay
    );

}
