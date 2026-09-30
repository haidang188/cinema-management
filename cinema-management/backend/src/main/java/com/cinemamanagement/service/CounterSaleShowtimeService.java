package com.cinemamanagement.service;

import com.cinemamanagement.response.CounterShowtimeResponse;
import com.cinemamanagement.response.SeatSummaryResponse;

import java.time.LocalDate;
import java.util.List;

public interface CounterSaleShowtimeService {

    int MAX_RANGE_DAYS = 31;

    int MAX_SUMMARY_IDS = 200;

    List<CounterShowtimeResponse> getShowtimesInRange(LocalDate from, LocalDate to);

    List<SeatSummaryResponse> getSeatSummaries(List<Long> showtimeIds);
}
