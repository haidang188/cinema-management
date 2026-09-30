package com.cinemamanagement.response;

/** Số ghế còn trống / tổng số ghế của một suất chiếu. */
public record SeatSummaryResponse(
        Long showtimeId,
        long total,
        long available
) {
}