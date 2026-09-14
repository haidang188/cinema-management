package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.TicketPrice;
import com.cinemamanagement.repository.TicketPriceRepository;
import com.cinemamanagement.response.TicketPriceResponse;
import com.cinemamanagement.service.TicketPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TicketPriceServiceImpl implements TicketPriceService {

    private final TicketPriceRepository ticketPriceRepository;

    @Override
    @Transactional(readOnly = true)
    public List<TicketPriceResponse> getActiveTicketPrices() {
        return ticketPriceRepository
                .findByStatus("ACTIVE")
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private TicketPriceResponse toResponse(TicketPrice ticketPrice) {
        return new TicketPriceResponse(
                ticketPrice.getId(),
                ticketPrice.getRoomType(),
                ticketPrice.getSeatType(),
                ticketPrice.getDayType(),
                ticketPrice.getPrice()
        );
    }
}
