package com.cinemamanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimeDTO {
    private Long id;

    // Movie
    private Long movieId;
    private String movieTitle;
    private String posterUrl;
    private Integer durationMinutes;
    private String ageRating;

    // Room
    private Long roomId;
    private String roomName;
    private String roomType;
    private String format;

    // Showtime
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
}
