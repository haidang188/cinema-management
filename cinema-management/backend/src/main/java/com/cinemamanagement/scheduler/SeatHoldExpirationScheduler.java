package com.cinemamanagement.scheduler;

import com.cinemamanagement.service.SeatHoldService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SeatHoldExpirationScheduler {

    private final SeatHoldService seatHoldService;

    @Scheduled(
            fixedDelayString =
                    "${booking.seat-hold-cleanup-milliseconds:10000}"
    )
    public void releaseExpiredSeats() {
        seatHoldService.expireHolds();
    }
}