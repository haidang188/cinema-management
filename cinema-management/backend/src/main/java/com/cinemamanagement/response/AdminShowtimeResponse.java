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

    /** Một suất đang chiếm phòng (kể cả thời gian dọn phòng sau suất). */
    public record BusySlot(
            long id,
            String movieTitle,
            LocalDateTime startTime,
            LocalDateTime endTime,
            LocalDateTime readyAt
    ) {}

    /**
     * Khoảng trống của phòng: from/to là khoảng phòng rảnh,
     * earliestStart/latestStart là khoảng giờ bắt đầu hợp lệ cho phim đã chọn.
     */
    public record FreeSlot(
            LocalDateTime from,
            LocalDateTime to,
            LocalDateTime earliestStart,
            LocalDateTime latestStart
    ) {}

    public record Availability(
            long roomId,
            String roomName,
            long movieId,
            String movieTitle,
            int durationMinutes,
            LocalDate date,
            LocalDateTime dayStart,
            LocalDateTime lastStart,
            int turnaroundMinutes,
            boolean available,
            String message,
            List<BusySlot> busy,
            List<FreeSlot> freeSlots,
            List<LocalDateTime> suggestedStarts
    ) {}

    public record BatchPreviewItem(
            LocalDateTime startTime,
            LocalDateTime endTime,
            LocalDateTime readyAt,
            boolean ok,
            String message
    ) {}

    public record BatchResult(
            List<AdminShowtimeResponse> created
    ) {}
}
