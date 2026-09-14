package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Seat;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Long> {
    List<Seat> findByRoomIdOrderByRowLabelAscSeatNumberAsc(Long roomId);

    List<Seat> findByRoomIdAndIdIn(Long roomId, Collection<Long> ids);
}
