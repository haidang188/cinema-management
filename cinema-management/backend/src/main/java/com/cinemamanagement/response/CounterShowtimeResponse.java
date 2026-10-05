package com.cinemamanagement.response;

import java.time.LocalDateTime;

public record CounterShowtimeResponse(
        Long id,
        Long movieId,
        String movieTitle,
        String posterUrl,
        String ageRating,
        Integer durationMinutes,
        String language,
        Long roomId,
        String roomName,
        String roomType,
        String format,
        String status,
        LocalDateTime startTime,
        LocalDateTime endTime
) {
}