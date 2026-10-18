package com.cinemamanagement.controller;

import com.cinemamanagement.response.PickupBookingItemResponse;
import com.cinemamanagement.response.PickupInfoResponse;
import com.cinemamanagement.service.TicketPickupService;
import com.cinemamanagement.util.SessionEmployeeResolver;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/ticket-pickup")
@RequiredArgsConstructor
public class TicketPickupController {

    private final TicketPickupService ticketPickupService;
    private final SessionEmployeeResolver sessionEmployeeResolver;

    @GetMapping("/search")
    public ResponseEntity<List<PickupBookingItemResponse>> search(@RequestParam String keyword) {
        return ResponseEntity.ok(ticketPickupService.search(keyword));
    }

    @GetMapping("/{bookingId}")
    public ResponseEntity<PickupInfoResponse> info(@PathVariable Long bookingId) {
        return ResponseEntity.ok(ticketPickupService.getInfo(bookingId));
    }

    @PostMapping("/{bookingId}/confirm")
    public ResponseEntity<PickupInfoResponse> confirm(@PathVariable Long bookingId, HttpServletRequest request) {
        Long employeeId = sessionEmployeeResolver.requireEmployeeId(request);
        return ResponseEntity.ok(ticketPickupService.confirm(bookingId, employeeId));
    }
}