package com.cinemamanagement.service;

import com.cinemamanagement.entity.Booking;
import com.cinemamanagement.response.PointHistoryResponse;
import com.cinemamanagement.response.PointSummaryResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface LoyaltyPointService {
    int awardForPaidBooking(Booking booking);

    Page<PointHistoryResponse> getHistory(Long userId, Pageable pageable);

    PointSummaryResponse getSummary(Long userId);
}
