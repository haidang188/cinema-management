package com.cinemamanagement.controller;

import com.cinemamanagement.response.BookingDetailResponse;
import com.cinemamanagement.service.OnlineBookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.net.URI;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class OnlinePaymentController {

    private final OnlineBookingService onlineBookingService;

    @PostMapping("/vietqr/{bookingCode}/confirm")
    public BookingDetailResponse confirmVietQr(
            @PathVariable String bookingCode,
            @RequestParam Long userId
    ) {
        return onlineBookingService.confirmVietQr(bookingCode, userId);
    }

    @GetMapping("/vnpay/return")
    public ResponseEntity<Void> processVnPayReturn(@RequestParam Map<String, String> parameters) {
        String redirectUrl = onlineBookingService.processVnPayReturn(parameters);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, URI.create(redirectUrl).toString())
                .build();
    }
}
