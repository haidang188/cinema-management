package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Showtime;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface ShowtimeRepository extends JpaRepository <Showtime, Long>{

    List<Showtime> findByStartTimeGreaterThanEqualAndStartTimeLessThan (
            LocalDateTime startOfDay,
            LocalDateTime endOfDay
    );

}
