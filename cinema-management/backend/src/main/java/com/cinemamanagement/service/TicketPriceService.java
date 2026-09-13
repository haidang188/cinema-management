package com.cinemamanagement.service;

import com.cinemamanagement.dto.TicketPriceDTO;
import com.cinemamanagement.entity.TicketPrice;
import com.cinemamanagement.repository.TicketPriceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketPriceService {

    private final TicketPriceRepository ticketPriceRepository;

    @Transactional(readOnly = true)
    public List<TicketPriceDTO> getActiveTicketPrices() {

        return ticketPriceRepository
                .findByStatus("ACTIVE")
                .stream()
                .map(this::convertToDTO)
                .toList();
    }

    private TicketPriceDTO convertToDTO(
            TicketPrice ticketPrice
    ) {

        return new TicketPriceDTO(
                ticketPrice.getId(),
                ticketPrice.getRoomType(),
                ticketPrice.getSeatType(),
                ticketPrice.getDayType(),
                ticketPrice.getPrice()
        );
    }
}
