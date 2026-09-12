package com.cinemamanagement.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public class UpdateSeatTypesRequest {
    @NotEmpty(message = "Seats must not be empty")
    private List<@Valid SeatTypeUpdateRequest> seats;

    public List<SeatTypeUpdateRequest> getSeats() {
        return seats;
    }

    public void setSeats(List<SeatTypeUpdateRequest> seats) {
        this.seats = seats;
    }
}
