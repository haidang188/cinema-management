package com.cinemamanagement.response;

import java.time.LocalDate;
import java.util.List;

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
        String status,
        List<GenreResponse> genres
) {
}
