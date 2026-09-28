package com.cinemamanagement.repository;

import com.cinemamanagement.entity.BookingSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    List<BookingSeat> findByBookingId(Long bookingId);

    boolean existsByBookingIdAndSeatId(
            Long bookingId,
            Long seatId
    );
}