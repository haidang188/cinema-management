package com.cinemamanagement.service;

import com.cinemamanagement.request.MovieRequest;
import com.cinemamanagement.response.MovieDetailResponse;
import com.cinemamanagement.response.MovieListResponse;
import com.cinemamanagement.response.MovieResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface MovieService {
    List<MovieResponse> getNowShowingMovies();
    Page<MovieListResponse> getMovies(String keyword, String status, Pageable pageable);

    MovieDetailResponse getMovieById(Long id);

    MovieDetailResponse createMovie(MovieRequest request);

    MovieDetailResponse updateMovie(Long id, MovieRequest request);
}
