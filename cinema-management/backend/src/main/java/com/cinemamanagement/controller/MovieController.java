package com.cinemamanagement.controller;

import com.cinemamanagement.dto.movie.MovieResponse;
import com.cinemamanagement.service.MovieService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/movies")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class MovieController {
    private final MovieService movieService;

    @GetMapping("/now-showing")
    public List<MovieResponse> getNowShowingMovies() {
        return movieService.getNowShowingMovies();
    }
}
