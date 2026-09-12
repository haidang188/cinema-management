package com.cinemamanagement.repositoty;

import com.cinemamanagement.entity.TicketPrice;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TicketPriceRepository extends JpaRepository<TicketPrice, Long> {
    List<TicketPrice> findByStatus(String status);
}
