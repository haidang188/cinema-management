package com.cinemamanagement.repository;

import com.cinemamanagement.entity.BookingSeat;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {
    boolean existsBySeatId(Long seatId);
}
