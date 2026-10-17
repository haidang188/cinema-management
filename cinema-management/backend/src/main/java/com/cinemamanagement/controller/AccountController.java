package com.cinemamanagement.controller;

import com.cinemamanagement.request.DeleteAccountRequest;
import com.cinemamanagement.request.RestoreAccountRequest;
import com.cinemamanagement.request.UpdateAccountRequest;
import com.cinemamanagement.response.AccountProfileResponse;
import com.cinemamanagement.response.BookingListItemResponse;
import com.cinemamanagement.response.PointHistoryResponse;
import com.cinemamanagement.response.PointSummaryResponse;
import com.cinemamanagement.service.AccountService;
import com.cinemamanagement.service.LoyaltyPointService;
import com.cinemamanagement.service.MemberBookingHistoryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/account")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class AccountController {
    private final AccountService accountService;
    private final LoyaltyPointService loyaltyPointService;
    private final MemberBookingHistoryService memberBookingHistoryService;

    @GetMapping("/{userId}")
    public AccountProfileResponse getProfile(@PathVariable Long userId) {
        return accountService.getProfile(userId);
    }

    @PutMapping("/{userId}")
    public AccountProfileResponse updateProfile(@PathVariable Long userId, @Valid @RequestBody UpdateAccountRequest request) {
        return accountService.updateProfile(userId, request);
    }

    @PostMapping("/{userId}/deletion")
    public AccountProfileResponse requestDeletion(@PathVariable Long userId, @Valid @RequestBody DeleteAccountRequest request) {
        return accountService.requestDeletion(userId, request);
    }

    @PostMapping("/{userId}/restore")
    public AccountProfileResponse restore(@PathVariable Long userId, @Valid @RequestBody RestoreAccountRequest request) {
        return accountService.restore(userId, request);
    }

    @GetMapping("/{userId}/points")
    public PointSummaryResponse getPoints(@PathVariable Long userId) {
        return loyaltyPointService.getSummary(userId);
    }

    @GetMapping("/{userId}/points/history")
    public Page<PointHistoryResponse> getPointHistory(
            @PathVariable Long userId,
            @PageableDefault(size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return loyaltyPointService.getHistory(userId, pageable);
    }

    @GetMapping("/{userId}/bookings")
    public Page<BookingListItemResponse> getBookingHistory(
            @PathVariable Long userId,
            @RequestParam(required = false) LocalDate fromDate,
            @RequestParam(required = false) LocalDate toDate,
            @RequestParam(required = false) String timeline,
            @PageableDefault(size = 8, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return memberBookingHistoryService.getHistory(userId, fromDate, toDate, timeline, pageable);
    }
}
