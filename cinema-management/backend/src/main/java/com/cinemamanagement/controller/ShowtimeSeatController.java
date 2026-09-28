package com.cinemamanagement.controller;

import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.response.ShowtimeSeatResponse;
import com.cinemamanagement.service.ShowtimeSeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/showtime-seats")
@RequiredArgsConstructor
public class ShowtimeSeatController {

    private final ShowtimeSeatService showtimeSeatService;

    @GetMapping
    public ResponseEntity<List<ShowtimeSeatResponse>> getSeatsByShowtime(
            @RequestParam Long showtimeId
    ) {
        return ResponseEntity.ok(
                showtimeSeatService.getSeatsByShowtime(showtimeId)
        );
    }
}
