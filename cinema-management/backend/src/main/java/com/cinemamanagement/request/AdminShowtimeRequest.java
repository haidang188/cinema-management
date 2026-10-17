package com.cinemamanagement.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;

public record AdminShowtimeRequest(
        @NotNull @Positive Long movieId,
        @NotNull @Positive Long roomId,
        @NotNull LocalDateTime startTime,
        @Size(max = 50) String format
) {}