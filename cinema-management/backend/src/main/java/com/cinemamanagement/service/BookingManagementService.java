package com.cinemamanagement.service;

import com.cinemamanagement.request.BookingSearchRequest;
import com.cinemamanagement.response.BookingDetailResponse;
import com.cinemamanagement.response.BookingListItemResponse;
import com.cinemamanagement.response.PageResponse;

import java.util.List;

public interface BookingManagementService {

    PageResponse<BookingListItemResponse> search(BookingSearchRequest request);

    BookingDetailResponse getDetail(Long bookingId);

    BookingDetailResponse reprint(Long bookingId, List<String> ticketCodes, Long employeeId);
}