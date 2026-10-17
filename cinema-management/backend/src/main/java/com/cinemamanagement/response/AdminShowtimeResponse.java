package com.cinemamanagement.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public record AdminShowtimeResponse(
        long id,
        long movieId,
        String movieTitle,
        long roomId,
        String roomName,
        String roomType,
        String format,
        LocalDateTime startTime,
        LocalDateTime endTime,
        String status,
        long totalSeats
) {
    public record MovieOption(
            long id,
            String title,
            Integer durationMinutes,
            LocalDate releaseDate,
            String status
    ) {}

    public record RoomOption(
            long id,
            String name,
            String roomType,
            String status
    ) {}

    public record Options(
            List<MovieOption> movies,
            List<RoomOption> rooms,
            List<String> statuses,
            int turnaroundMinutes
    ) {}

    public record Page(
            List<AdminShowtimeResponse> rows,
            long totalElements,
            int page,
            int size,
            int totalPages
    ) {}

    public record Preview(
            LocalDateTime endTime,
            LocalDateTime roomReadyAt,
            int turnaroundMinutes,
            int totalSeats
    ) {}
}