package com.cinemamanagement.controller;

import com.cinemamanagement.request.SeatHoldRequest;
import com.cinemamanagement.response.SeatHoldActionResponse;
import com.cinemamanagement.response.SeatStateResponse;
import com.cinemamanagement.service.SeatHoldService;
import com.cinemamanagement.util.SessionEmployeeResolver;
import jakarta.servlet.http.HttpServletRequest;
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
    private final SessionEmployeeResolver sessionEmployeeResolver;

    @PostMapping("/holds")
    public ResponseEntity<SeatHoldActionResponse> hold(
            @PathVariable Long showtimeId,
            @RequestBody SeatHoldRequest request,
            HttpServletRequest httpRequest
    ) {
        // API giữ ghế này chỉ dành cho quầy; khách đặt online đi qua /api/seat-holds.
        // Bắt buộc đăng nhập nhân viên để không ai sinh token ẩn danh và chiếm ghế hàng loạt.
        sessionEmployeeResolver.requireEmployeeId(httpRequest);
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
