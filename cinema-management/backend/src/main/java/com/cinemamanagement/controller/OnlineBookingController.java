package com.cinemamanagement.controller;

import com.cinemamanagement.request.BookingPreviewRequest;
import com.cinemamanagement.request.CreateOnlineBookingRequest;
import com.cinemamanagement.response.BookingDetailResponse;
import com.cinemamanagement.response.BookingPreviewResponse;
import com.cinemamanagement.response.OnlineBookingResponse;
import com.cinemamanagement.service.OnlineBookingService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class OnlineBookingController {

    private final OnlineBookingService onlineBookingService;

    @PostMapping("/preview")
    public BookingPreviewResponse preview(@Valid @RequestBody BookingPreviewRequest request) {
        return onlineBookingService.preview(request);
    }

    @PostMapping
    public ResponseEntity<OnlineBookingResponse> create(
            @Valid @RequestBody CreateOnlineBookingRequest request,
            HttpServletRequest httpRequest
    ) {
        String forwardedIp = httpRequest.getHeader("X-Forwarded-For");
        String clientIp = forwardedIp == null ? httpRequest.getRemoteAddr() : forwardedIp;
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(onlineBookingService.create(request, clientIp));
    }

    @GetMapping("/{bookingCode}")
    public BookingDetailResponse getBooking(
            @PathVariable String bookingCode,
            @RequestParam Long userId
    ) {
        return onlineBookingService.getBooking(bookingCode, userId);
    }

    @GetMapping("/scan/{qrToken}")
    public BookingDetailResponse scanBooking(@PathVariable String qrToken) {
        return onlineBookingService.scanBooking(qrToken);
    }
}
