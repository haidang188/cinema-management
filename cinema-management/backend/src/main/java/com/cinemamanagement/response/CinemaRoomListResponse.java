package com.cinemamanagement.response;

import com.cinemamanagement.entity.CinemaRoom;

public record CinemaRoomListResponse(
        Long id,
        String name,
        String roomType,
        Integer totalSeats,
        String status
) {
    public static CinemaRoomListResponse fromEntity(CinemaRoom room) {
        return new CinemaRoomListResponse(
                room.getId(),
                room.getName(),
                room.getRoomType(),
                room.getTotalSeats(),
                room.getStatus()
        );
    }
}
