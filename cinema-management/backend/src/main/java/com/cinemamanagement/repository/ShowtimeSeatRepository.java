package com.cinemamanagement.repository;

import com.cinemamanagement.entity.ShowtimeSeat;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ShowtimeSeatRepository extends JpaRepository<ShowtimeSeat, Long> {
    List<ShowtimeSeat> findByShowtimeId(Long showtimeId);

    Optional<ShowtimeSeat> findByShowtimeIdAndSeatId(
            Long showtimeId,
            Long seatId
    );

    long countByShowtimeId(Long showtimeId);

    long countByShowtimeIdAndStatus(
            Long showtimeId,
            String status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT ss
            FROM ShowtimeSeat ss
            WHERE ss.id = :id
            """)
    Optional<ShowtimeSeat> findByIdForUpdate(
            @Param("id") Long id
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
    SELECT ss
    FROM ShowtimeSeat ss
    WHERE ss.id = :id
      AND ss.showtime.id = :showtimeId
""")
    Optional<ShowtimeSeat> findByIdAndShowtimeIdForUpdate(
            @Param("id") Long id,
            @Param("showtimeId") Long showtimeId
    );


}
