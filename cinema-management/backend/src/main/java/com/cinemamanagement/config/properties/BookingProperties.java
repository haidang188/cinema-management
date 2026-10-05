package com.cinemamanagement.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "booking")
public class BookingProperties {
    private int seatHoldDurationMinutes = 5;
    private long seatHoldCleanupMilliseconds = 10000;

    public int getSeatHoldDurationMinutes(){
        return seatHoldDurationMinutes;
    }
    public void setSeatHoldDurationMinutes(int seatHoldDurationMinutes){
        this.seatHoldDurationMinutes = seatHoldDurationMinutes;
    }
    public long getSeatHoldCleanupMilliseconds() {
        return seatHoldCleanupMilliseconds;
    }

    public void setSeatHoldCleanupMilliseconds(
            long seatHoldCleanupMilliseconds
    ) {
        this.seatHoldCleanupMilliseconds =
                seatHoldCleanupMilliseconds;
    }
}
