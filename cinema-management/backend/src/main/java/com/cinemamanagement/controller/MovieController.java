package com.cinemamanagement.controller;

import com.cinemamanagement.request.MovieRequest;
import com.cinemamanagement.response.MovieDetailResponse;
import com.cinemamanagement.response.MovieListResponse;
import com.cinemamanagement.service.MovieService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/admin/movies")
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class MovieController {
    private final MovieService movieService;

    public MovieController(MovieService movieService) {
        this.movieService = movieService;
    }

    @GetMapping
    public Page<MovieListResponse> getMovies(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        return movieService.getMovies(keyword, status, pageable);
    }

    @GetMapping("/{id}")
    public MovieDetailResponse getMovieById(@PathVariable Long id) {
        return movieService.getMovieById(id);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MovieDetailResponse createMovie(
            @Valid @RequestPart("movie") MovieRequest request,
            @RequestPart("poster") MultipartFile poster
    ) {
        return movieService.createMovie(request, poster);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public MovieDetailResponse updateMovie(
            @PathVariable Long id,
            @Valid @RequestPart("movie") MovieRequest request,
            @RequestPart(value = "poster", required = false) MultipartFile poster
    ) {
        return movieService.updateMovie(id, request, poster);
    }
}
