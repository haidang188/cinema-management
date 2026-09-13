package com.cinemamanagement.service.impl;
import com.cinemamanagement.dto.movie.MovieResponse;
import com.cinemamanagement.entity.Genre;
import com.cinemamanagement.entity.Movie;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.GenreRepository;
import com.cinemamanagement.repository.MovieRepository;
import com.cinemamanagement.request.MovieRequest;
import com.cinemamanagement.response.MovieDetailResponse;
import com.cinemamanagement.response.MovieListResponse;
import com.cinemamanagement.service.CloudinaryService;
import com.cinemamanagement.service.MovieService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;


import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Service
public class MovieServiceImpl implements MovieService {
    private static final String POSTER_FOLDER = "cinema/posters";
    private static final String SHOWING = "SHOWING";

    private final MovieRepository movieRepository;
    private final GenreRepository genreRepository;
    private final CloudinaryService cloudinaryService;

    public MovieServiceImpl(
            MovieRepository movieRepository,
            GenreRepository genreRepository,
            CloudinaryService cloudinaryService
    ) {
        this.movieRepository = movieRepository;
        this.genreRepository = genreRepository;
        this.cloudinaryService = cloudinaryService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<MovieResponse> getNowShowingMovies() {
        return movieRepository.findByStatusOrderByReleaseDateDesc(SHOWING)
                .stream()
                .map(this::toResponse)
                .toList();
    }
    @Override
    @Transactional(readOnly = true)
    public Page<MovieListResponse> getMovies(String keyword, String status, Pageable pageable) {
        return movieRepository.searchMovies(normalize(keyword), normalize(status), pageable)
                .map(MovieListResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public MovieDetailResponse getMovieById(Long id) {
        Movie movie = getMovieWithGenres(id);
        return MovieDetailResponse.fromEntity(movie);
    }

    @Override
    @Transactional
    public MovieDetailResponse createMovie(MovieRequest request, MultipartFile poster) {
        Movie movie = new Movie();
        applyRequest(movie, request);
        movie.setPosterUrl(cloudinaryService.uploadImage(poster, POSTER_FOLDER));
        Movie savedMovie = movieRepository.save(movie);
        return MovieDetailResponse.fromEntity(savedMovie);
    }

    @Override
    @Transactional
    public MovieDetailResponse updateMovie(Long id, MovieRequest request, MultipartFile poster) {
        Movie movie = getMovieWithGenres(id);
        String currentPosterUrl = movie.getPosterUrl();
        applyRequest(movie, request);
        movie.setPosterUrl(currentPosterUrl);
        if (poster != null && !poster.isEmpty()) {
            movie.setPosterUrl(cloudinaryService.uploadImage(poster, POSTER_FOLDER));
        }
        return MovieDetailResponse.fromEntity(movieRepository.save(movie));
    }

    private Movie getMovieWithGenres(Long id) {
        return movieRepository.findByIdWithGenres(id)
                .orElseThrow(() -> new ResourceNotFoundException("Movie not found with id " + id));
    }

    private void applyRequest(Movie movie, MovieRequest request) {
        movie.setTitle(request.getTitle().trim());
        movie.setDescription(request.getDescription());
        movie.setDurationMinutes(request.getDurationMinutes());
        movie.setReleaseDate(request.getReleaseDate());
        movie.setAgeRating(request.getAgeRating());
        movie.setDirector(request.getDirector());
        movie.setCast(request.getCast());
        movie.setLanguage(request.getLanguage());
        movie.setTrailerUrl(request.getTrailerUrl());
        movie.setStatus(request.getStatus());
        movie.setGenres(resolveGenres(request.getGenreIds()));
    }

    private Set<Genre> resolveGenres(List<Long> genreIds) {
        if (genreIds == null || genreIds.isEmpty()) {
            return new LinkedHashSet<>();
        }

        Set<Long> uniqueIds = new LinkedHashSet<>(genreIds);
        List<Genre> genres = genreRepository.findAllById(uniqueIds);
        if (genres.size() != uniqueIds.size()) {
            throw new BadRequestException("One or more genreIds do not exist");
        }
        return new LinkedHashSet<>(genres);
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
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
