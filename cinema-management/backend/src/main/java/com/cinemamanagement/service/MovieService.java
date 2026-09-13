package com.cinemamanagement.service;

import com.cinemamanagement.request.MovieRequest;
import com.cinemamanagement.response.MovieDetailResponse;
import com.cinemamanagement.response.MovieListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.web.multipart.MultipartFile;
import com.cinemamanagement.dto.movie.MovieResponse;
import java.util.List;

public interface MovieService {
    List<MovieResponse> getNowShowingMovies();
    Page<MovieListResponse> getMovies(String keyword, String status, Pageable pageable);

    MovieDetailResponse getMovieById(Long id);

    MovieDetailResponse createMovie(MovieRequest request, MultipartFile poster);

    MovieDetailResponse updateMovie(Long id, MovieRequest request, MultipartFile poster);
}
