package com.cinemamanagement.response;

import com.cinemamanagement.dto.GenreDto;
import com.cinemamanagement.entity.Movie;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

public record MovieListResponse(
        Long id,
        String title,
        String posterUrl,
        LocalDate releaseDate,
        Integer durationMinutes,
        String ageRating,
        String director,
        String language,
        String status,
        List<GenreDto> genres
) {
    public static MovieListResponse fromEntity(Movie movie) {
        return new MovieListResponse(
                movie.getId(),
                movie.getTitle(),
                movie.getPosterUrl(),
                movie.getReleaseDate(),
                movie.getDurationMinutes(),
                movie.getAgeRating(),
                movie.getDirector(),
                movie.getLanguage(),
                movie.getStatus(),
                movie.getGenres().stream()
                        .map(GenreDto::fromEntity)
                        .sorted(Comparator.comparing(GenreDto::name))
                        .toList()
        );
    }
}
