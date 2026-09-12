package com.cinemamanagement.service.impl;

import com.cinemamanagement.dto.movie.MovieResponse;
import com.cinemamanagement.entity.Movie;
import com.cinemamanagement.repository.MovieRepository;
import com.cinemamanagement.service.MovieService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MovieServiceImpl implements MovieService {
    private static final String SHOWING = "SHOWING";

    private final MovieRepository movieRepository;

    @Override
    @Transactional(readOnly = true)
    public List<MovieResponse> getNowShowingMovies() {
        return movieRepository.findByStatusOrderByReleaseDateDesc(SHOWING)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private MovieResponse toResponse(Movie movie) {
        return new MovieResponse(
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
                movie.getStatus()
        );
    }
}
