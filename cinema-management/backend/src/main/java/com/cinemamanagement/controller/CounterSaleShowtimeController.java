package com.cinemamanagement.controller;

import com.cinemamanagement.response.CounterShowtimeResponse;
import com.cinemamanagement.response.SeatSummaryResponse;
import com.cinemamanagement.service.CounterSaleShowtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/counter-sales")
@RequiredArgsConstructor
public class CounterSaleShowtimeController {

    private final CounterSaleShowtimeService counterSaleShowtimeService;

    @GetMapping("/showtimes")
    public ResponseEntity<List<CounterShowtimeResponse>> getShowtimesInRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to
    ) {
        return ResponseEntity.ok(counterSaleShowtimeService.getShowtimesInRange(from, to));
    }

    @GetMapping("/seat-summary")
    public ResponseEntity<List<SeatSummaryResponse>> getSeatSummaries(
            @RequestParam List<Long> showtimeIds
    ) {
        return ResponseEntity.ok(counterSaleShowtimeService.getSeatSummaries(showtimeIds));
    }
}