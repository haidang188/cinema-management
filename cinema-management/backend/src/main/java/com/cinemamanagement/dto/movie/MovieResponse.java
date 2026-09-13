package com.cinemamanagement.dto.movie;

import java.time.LocalDate;

public record MovieResponse(
        Long id,
        String title,
        String description,
        Integer durationMinutes,
        LocalDate releaseDate,
        String ageRating,
        String director,
        String cast,
        String language,
        String posterUrl,
        String trailerUrl,
        String status
) {
}
