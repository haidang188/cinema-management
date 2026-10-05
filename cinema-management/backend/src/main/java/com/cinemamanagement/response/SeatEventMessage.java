package com.cinemamanagement.response;

import java.util.List;

public record SeatEventMessage(
        Long showtimeId,
        List<SeatStateResponse> seats
) {
}