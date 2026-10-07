package com.cinemamanagement.controller;

import com.cinemamanagement.request.SeatHoldRequest;
import com.cinemamanagement.response.SeatHoldActionResponse;
import com.cinemamanagement.response.SeatStateResponse;
import com.cinemamanagement.service.SeatHoldService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/showtimes/{showtimeId}")
@RequiredArgsConstructor
public class ShowtimeSeatHoldController {

    private final SeatHoldService seatHoldService;

    @PostMapping("/holds")
    public ResponseEntity<SeatHoldActionResponse> hold(
            @PathVariable Long showtimeId,
            @RequestBody SeatHoldRequest request
    ) {
        return ResponseEntity.ok(seatHoldService.hold(
                showtimeId,
                request.holdToken(),
                request.showtimeSeatIds(),
                Boolean.TRUE.equals(request.allowPartial())
        ));
    }

    @PostMapping(
            path = "/holds/release",
            consumes = MediaType.APPLICATION_JSON_VALUE
    )
    public ResponseEntity<SeatHoldActionResponse> release(
            @PathVariable Long showtimeId,
            @RequestBody SeatHoldRequest request
    ) {
        return ResponseEntity.ok(seatHoldService.release(
                showtimeId,
                request.holdToken(),
                request.showtimeSeatIds()
        ));
    }

    @PostMapping(
            path = "/holds/release",
            consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE
    )
    public ResponseEntity<SeatHoldActionResponse> releaseOnUnload(
            @PathVariable Long showtimeId,
            @RequestParam String holdToken
    ) {
        return ResponseEntity.ok(
                seatHoldService.release(showtimeId, holdToken, List.of())
        );
    }

    @GetMapping("/seat-states")
    public ResponseEntity<List<SeatStateResponse>> states(
            @PathVariable Long showtimeId
    ) {
        return ResponseEntity.ok(
                seatHoldService.getSeatStates(showtimeId)
        );
    }
}
