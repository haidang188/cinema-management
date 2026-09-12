package com.cinemamanagement.service;

import com.cinemamanagement.dto.movie.MovieResponse;

import java.util.List;

public interface MovieService {
    List<MovieResponse> getNowShowingMovies();
}
