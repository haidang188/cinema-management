package com.cinemamanagement.response;

import com.cinemamanagement.entity.CinemaRoom;
import com.cinemamanagement.entity.Seat;

import java.util.List;

public record CinemaRoomDetailResponse(
        Long id,
        String name,
        String roomType,
        Integer totalSeats,
        String status,
        List<SeatResponse> seats
) {
    public static CinemaRoomDetailResponse fromEntity(CinemaRoom room, List<Seat> seats) {
        return new CinemaRoomDetailResponse(
                room.getId(),
                room.getName(),
                room.getRoomType(),
                room.getTotalSeats(),
                room.getStatus(),
                seats.stream().map(SeatResponse::fromEntity).toList()
        );
    }
}
