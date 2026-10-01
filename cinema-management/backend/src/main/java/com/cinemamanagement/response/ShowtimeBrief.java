package com.cinemamanagement.response;

import java.time.LocalDateTime;


public record ShowtimeBrief(
        Long id,
        Long movieId,
        String movieTitle,
        String posterUrl,
        String ageRating,
        Integer durationMinutes,
        Long roomId,
        String roomName,
        String roomType,
        String format,
        String status,
        LocalDateTime startTime,
        LocalDateTime endTime
) {
}