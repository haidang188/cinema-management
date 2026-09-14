package com.cinemamanagement.service;

import com.cinemamanagement.response.GenreResponse;

import java.util.List;

public interface GenreService {
    List<GenreResponse> getAllGenres();
}
