package com.cinemamanagement.request;

import java.util.List;

public record SeatHoldRequest(
        String holdToken,
        List<Long> showtimeSeatIds,
        Boolean allowPartial
) {
}