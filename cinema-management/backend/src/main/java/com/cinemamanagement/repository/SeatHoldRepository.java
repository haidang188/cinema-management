package com.cinemamanagement.repository;

import com.cinemamanagement.entity.SeatHold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface SeatHoldRepository extends JpaRepository<SeatHold, Long> {
    Optional<SeatHold> findByShowtimeSeatIdAndStatus(
            Long showtimeSeatId,
            String status
    );

    List<SeatHold> findByExpiresAtBeforeAndStatus(
            LocalDateTime time,
            String status
    );

    boolean existsByShowtimeSeatIdAndStatus(
            Long showtimeSeatId,
            String status
    );
    List<SeatHold> findAllByHoldTokenOrderByIdAsc(
            String holdToken
    );

    List<SeatHold> findAllByHoldTokenAndStatusOrderByIdAsc(
            String holdToken,
            String status
    );

    List<SeatHold>
    findAllByUserIdAndShowtimeSeatShowtimeIdAndStatus(
            Long userId,
            Long showtimeId,
            String status
    );
    List<SeatHold> findAllByExpiresAtLessThanEqualAndStatus(
            LocalDateTime expiresAt,
            String status
    );

    Optional<SeatHold>
    findFirstByShowtimeSeatIdAndStatus(
            Long showtimeSeatId,
            String status
    );

    boolean existsByHoldToken(String holdToken);
}
