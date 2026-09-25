package com.cinemamanagement.service;

import com.cinemamanagement.response.ShowtimeResponse;

import java.time.LocalDate;
import java.util.List;

public interface ShowtimeService {
    List<ShowtimeResponse> getShowtimeByDate(LocalDate date);

    List<ShowtimeResponse> getShowtimesByMovieAndDate(Long movieId, LocalDate date);
}
