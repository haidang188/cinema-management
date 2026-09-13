package com.cinemamanagement.controller;

import com.cinemamanagement.dto.TicketPriceDTO;
import com.cinemamanagement.service.TicketPriceService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/ticket-prices")
@RequiredArgsConstructor
public class TicketPriceController {

    private final TicketPriceService ticketPriceService;

    @GetMapping
    public List<TicketPriceDTO> getTicketPrices() {

        return ticketPriceService.getActiveTicketPrices();
    }
}