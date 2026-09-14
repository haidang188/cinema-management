package com.cinemamanagement.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimeResponse {
    private Long id;
    private Long movieId;
    private String movieTitle;
    private String posterUrl;
    private Integer durationMinutes;
    private String ageRating;
    private Long roomId;
    private String roomName;
    private String roomType;
    private String format;
    private LocalDateTime startTime;
    private LocalDateTime endTime;
    private String status;
}
