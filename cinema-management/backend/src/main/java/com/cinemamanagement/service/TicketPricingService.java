package com.cinemamanagement.service;

import com.cinemamanagement.entity.Showtime;
import com.cinemamanagement.entity.ShowtimeSeat;

import java.math.BigDecimal;

public interface TicketPricingService {
    BigDecimal getPrice(Showtime showtime, ShowtimeSeat showtimeSeat);
}
