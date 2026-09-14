package com.cinemamanagement.service;

import com.cinemamanagement.response.TicketPriceResponse;

import java.util.List;

public interface TicketPriceService {
    List<TicketPriceResponse> getActiveTicketPrices();
}
