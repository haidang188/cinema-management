package com.cinemamanagement.response;

import com.cinemamanagement.entity.Seat;

public record SeatResponse(
        Long id,
        String rowLabel,
        Integer seatNumber,
        String seatName,
        String seatType,
        String status,
        Integer gridRow,
        Integer gridColumn
) {
    public static SeatResponse fromEntity(Seat seat) {
        return new SeatResponse(
                seat.getId(),
                seat.getRowLabel(),
                seat.getSeatNumber(),
                seat.getRowLabel() + seat.getSeatNumber(),
                seat.getSeatType(),
                seat.getStatus(),
                seat.getGridRow(),
                seat.getGridColumn()
        );
    }
}
