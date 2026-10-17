package com.cinemamanagement.response;

import java.math.BigDecimal;
import java.util.List;

public record StatisticsResponse(
        String type,
        String sort,
        Summary summary,
        List<Row> rows
) {
    public record Summary(
            BigDecimal revenue,
            long tickets,
            long bookings,
            long members,
            long unlinkedBookings
    ) {}

    public record Row(
            long id,
            String code,
            String name,
            long tickets,
            BigDecimal revenue,
            Integer pointBalance,
            Long movieCount
    ) {}
}