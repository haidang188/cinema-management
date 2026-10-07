package com.cinemamanagement.scheduler;

import com.cinemamanagement.service.OnlineBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class BookingExpirationScheduler {

    private final OnlineBookingService onlineBookingService;

    @Scheduled(fixedDelayString = "${booking.seat-hold-cleanup-milliseconds:10000}")
    public void expirePendingBookings() {
        onlineBookingService.expirePendingBookings();
    }
}
