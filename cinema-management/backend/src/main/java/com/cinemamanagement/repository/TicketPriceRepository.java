package com.cinemamanagement.repository;

import com.cinemamanagement.entity.TicketPrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TicketPriceRepository extends JpaRepository<TicketPrice, Long> {
    List<TicketPrice> findByStatus(String status);

    Optional<TicketPrice> findByRoomTypeAndSeatTypeAndDayTypeAndStatus(
            String roomType,
            String seatType,
            String dayType,
            String status
    );
}
