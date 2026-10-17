package com.cinemamanagement.service;

import com.cinemamanagement.response.BookingListItemResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import java.time.LocalDate;

public interface MemberBookingHistoryService {
    Page<BookingListItemResponse> getHistory(Long userId, LocalDate fromDate, LocalDate toDate, String timeline, Pageable pageable);
}
