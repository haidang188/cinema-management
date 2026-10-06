package com.cinemamanagement.controller;

import com.cinemamanagement.request.HoldSeatsRequest;
import com.cinemamanagement.request.UpdateSeatHoldRequest;
import com.cinemamanagement.response.SeatHoldResponse;
import com.cinemamanagement.service.SeatHoldService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/seat-holds")
@RequiredArgsConstructor
public class SeatHoldController {

    private final SeatHoldService seatHoldService;

    @PostMapping
    public ResponseEntity<SeatHoldResponse> createHold(
            @Valid @RequestBody HoldSeatsRequest request
    ) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(
                        seatHoldService.createHold(request)
                );
    }

    @PutMapping("/{holdToken}")
    public ResponseEntity<SeatHoldResponse> updateHold(
            @PathVariable String holdToken,
            @Valid @RequestBody
            UpdateSeatHoldRequest request
    ) {
        return ResponseEntity.ok(
                seatHoldService.updateHold(
                        holdToken,
                        request
                )
        );
    }

    @GetMapping("/{holdToken}")
    public ResponseEntity<SeatHoldResponse> getHold(
            @PathVariable String holdToken,
            @RequestParam Long userId
    ) {
        return ResponseEntity.ok(
                seatHoldService.getActiveHold(
                        holdToken,
                        userId
                )
        );
    }

    @DeleteMapping("/{holdToken}")
    public ResponseEntity<Void> releaseHold(
            @PathVariable String holdToken,
            @RequestParam Long userId
    ) {
        seatHoldService.releaseHold(
                holdToken,
                userId
        );

        return ResponseEntity.noContent().build();
    }
}
