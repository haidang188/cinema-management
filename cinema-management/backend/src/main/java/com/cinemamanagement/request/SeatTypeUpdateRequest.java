package com.cinemamanagement.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class SeatTypeUpdateRequest {
    @NotNull(message = "Seat id is required")
    private Long seatId;

    @NotBlank(message = "Seat type is required")
    private String seatType;

    public Long getSeatId() {
        return seatId;
    }

    public void setSeatId(Long seatId) {
        this.seatId = seatId;
    }

    public String getSeatType() {
        return seatType;
    }

    public void setSeatType(String seatType) {
        this.seatType = seatType;
    }
}
