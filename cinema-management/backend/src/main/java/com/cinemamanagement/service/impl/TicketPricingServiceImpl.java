package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Showtime;
import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.entity.TicketPrice;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.TicketPriceRepository;
import com.cinemamanagement.service.TicketPricingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.time.DayOfWeek;

@Service
@RequiredArgsConstructor
public class TicketPricingServiceImpl implements TicketPricingService {

    private final TicketPriceRepository ticketPriceRepository;

    @Override
    public BigDecimal getPrice(Showtime showtime, ShowtimeSeat showtimeSeat) {
        DayOfWeek day = showtime.getStartTime().getDayOfWeek();
        String dayType = day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY
                ? "WEEKEND"
                : "WEEKDAY";

        TicketPrice ticketPrice = ticketPriceRepository
                .findByRoomTypeAndSeatTypeAndDayTypeAndStatus(
                        showtime.getRoom().getRoomType(),
                        showtimeSeat.getSeat().getSeatType(),
                        dayType,
                        "ACTIVE"
                )
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Chưa cấu hình giá cho loại ghế "
                                + showtimeSeat.getSeat().getSeatType()
                ));

        return ticketPrice.getPrice();
    }
}
