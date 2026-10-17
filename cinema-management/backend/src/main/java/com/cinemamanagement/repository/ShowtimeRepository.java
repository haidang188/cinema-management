package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;

public interface ShowtimeRepository extends JpaRepository <Showtime, Long>{
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Showtime s where s.id = :id")
    java.util.Optional<Showtime> findByIdForScheduling(@Param("id") Long id);

    @Query("select s.room.id from Showtime s where s.id = :id")
    java.util.Optional<Long> findRoomIdById(@Param("id") Long id);
    @Query("""
            select count(s) > 0 from Showtime s
            where s.room.id = :roomId and s.status <> 'CANCELLED'
              and (:excludedId is null or s.id <> :excludedId)
              and s.startTime < :endTime and s.endTime > :startTime
            """)
    boolean hasSchedulingConflict(@Param("roomId") Long roomId, @Param("excludedId") Long excludedId,
                                  @Param("startTime") LocalDateTime startTime, @Param("endTime") LocalDateTime endTime);


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

    @Query("""
            select s from Showtime s
            join fetch s.movie
            join fetch s.room
            where s.startTime >= :from
              and s.startTime < :to
            order by s.startTime asc
            """)
    List<Showtime> findAllStartingBetween(
            @Param("from") LocalDateTime from,
            @Param("to") LocalDateTime to
    );

}
