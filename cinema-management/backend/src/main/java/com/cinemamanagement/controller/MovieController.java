package com.cinemamanagement.controller;

import com.cinemamanagement.request.MovieRequest;
import com.cinemamanagement.response.MovieDetailResponse;
import com.cinemamanagement.response.MovieListResponse;
import com.cinemamanagement.response.MovieResponse;
import com.cinemamanagement.service.MovieService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/movies")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class MovieController {
    private final MovieService movieService;

    public MovieController(MovieService movieService) {
        this.movieService = movieService;
    }

    @GetMapping("/now-showing")
    public List<MovieResponse> getNowShowingMovies() {
        return movieService.getNowShowingMovies();
    }

    @GetMapping
    public List<MovieResponse> getHomeMovies(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) Long genreId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return movieService.getHomeMovies(status, genreId, date);
    }

    @GetMapping("/{id}")
    public MovieDetailResponse getPublicMovieById(@PathVariable Long id) {
        return movieService.getMovieById(id);
    }

    @GetMapping("/admin")
    public Page<MovieListResponse> getMovies(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        return movieService.getMovies(keyword, status, pageable);
    }

    @GetMapping("/admin/{id}")
    public MovieDetailResponse getMovieById(@PathVariable Long id) {
        return movieService.getMovieById(id);
    }

    @PostMapping("/admin")
    public MovieDetailResponse createMovie(
            @Valid @RequestBody MovieRequest request
    ) {
        return movieService.createMovie(request);
    }

    @PutMapping("/admin/{id}")
    public MovieDetailResponse updateMovie(
            @PathVariable Long id,
            @Valid @RequestBody MovieRequest request
    ) {
        return movieService.updateMovie(id, request);
    }
}
