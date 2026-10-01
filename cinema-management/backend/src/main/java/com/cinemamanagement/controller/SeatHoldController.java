package com.cinemamanagement.controller;

import com.cinemamanagement.request.SeatHoldRequest;
import com.cinemamanagement.response.SeatHoldResponse;
import com.cinemamanagement.response.SeatStateResponse;
import com.cinemamanagement.service.SeatHoldService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * POST /api/showtimes/{id}/holds          giữ thêm ghế
 * POST /api/showtimes/{id}/holds/release  nhả ghế (rỗng = nhả hết)
 * GET  /api/showtimes/{id}/seat-states    trạng thái mọi ghế (kèm holdOwner)
 *
 * /holds/release có 2 biến thể:
 * - JSON: gọi bình thường từ axios.
 * - Form (x-www-form-urlencoded): trình duyệt gửi bằng navigator.sendBeacon khi
 *   đóng tab. Form là kiểu "an toàn" nên không cần CORS preflight, và Spring tự
 *   đọc được mà không cần ObjectMapper (tránh lệch Jackson 2 / Jackson 3).
 * holdToken chính là bằng chứng sở hữu, nên endpoint này có thể permitAll.
 */
@RestController
@RequestMapping("/api/showtimes/{showtimeId}")
@RequiredArgsConstructor
public class SeatHoldController {

    private final SeatHoldService seatHoldService;

    @PostMapping("/holds")
    public ResponseEntity<SeatHoldResponse> hold(
            @PathVariable Long showtimeId,
            @RequestBody SeatHoldRequest request
    ) {
        return ResponseEntity.ok(
                seatHoldService.hold(
                        showtimeId,
                        request.holdToken(),
                        request.showtimeSeatIds(),
                        Boolean.TRUE.equals(request.allowPartial())
                )
        );
    }

    @PostMapping(value = "/holds/release", consumes = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<SeatHoldResponse> release(
            @PathVariable Long showtimeId,
            @RequestBody SeatHoldRequest request
    ) {
        return ResponseEntity.ok(
                seatHoldService.release(showtimeId, request.holdToken(), request.showtimeSeatIds())
        );
    }

    @PostMapping(value = "/holds/release", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    public ResponseEntity<SeatHoldResponse> releaseFromBeacon(
            @PathVariable Long showtimeId,
            @RequestParam String holdToken,
            @RequestParam(required = false) List<Long> showtimeSeatIds
    ) {
        return ResponseEntity.ok(seatHoldService.release(showtimeId, holdToken, showtimeSeatIds));
    }

    @GetMapping("/seat-states")
    public ResponseEntity<List<SeatStateResponse>> seatStates(@PathVariable Long showtimeId) {
        return ResponseEntity.ok(seatHoldService.getSeatStates(showtimeId));
    }
}