package com.cinemamanagement.controller;

import com.cinemamanagement.request.BookingSearchRequest;
import com.cinemamanagement.request.ReprintTicketsRequest;
import com.cinemamanagement.response.BookingDetailResponse;
import com.cinemamanagement.response.BookingListItemResponse;
import com.cinemamanagement.response.PageResponse;
import com.cinemamanagement.service.BookingManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;


@RestController
@RequestMapping("/api/booking-management")
@RequiredArgsConstructor
public class BookingManagementController {

    private static final Long EMPLOYEE_ID = 1L;

    private final BookingManagementService bookingManagementService;

    @GetMapping
    public ResponseEntity<PageResponse<BookingListItemResponse>> search(@ModelAttribute BookingSearchRequest request) {
        return ResponseEntity.ok(bookingManagementService.search(request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<BookingDetailResponse> detail(@PathVariable Long id) {
        return ResponseEntity.ok(bookingManagementService.getDetail(id));
    }

    @PostMapping("/{id}/reprint")
    public ResponseEntity<BookingDetailResponse> reprint(
            @PathVariable Long id,
            @RequestBody(required = false) ReprintTicketsRequest request
    ) {
        return ResponseEntity.ok(bookingManagementService.reprint(
                id,
                request == null ? null : request.ticketCodes(),
                EMPLOYEE_ID
        ));
    }
}