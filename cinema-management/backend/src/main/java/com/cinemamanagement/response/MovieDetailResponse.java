package com.cinemamanagement.response;

import com.cinemamanagement.entity.Movie;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

public record MovieDetailResponse(
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
    public static MovieDetailResponse fromEntity(Movie movie) {
        return new MovieDetailResponse(
                movie.getId(),
                movie.getTitle(),
                movie.getDescription(),
                movie.getDurationMinutes(),
                movie.getReleaseDate(),
                movie.getAgeRating(),
                movie.getDirector(),
                movie.getCast(),
                movie.getLanguage(),
                movie.getPosterUrl(),
                movie.getTrailerUrl(),
                movie.getStatus(),
                movie.getGenres().stream()
                        .map(GenreResponse::fromEntity)
                        .sorted(Comparator.comparing(GenreResponse::name))
                        .toList()
        );
    }
}
