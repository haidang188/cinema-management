package com.cinemamanagement.service;

import com.cinemamanagement.request.BookingSearchRequest;
import com.cinemamanagement.response.BookingManagementDetailResponse;
import com.cinemamanagement.response.BookingListItemResponse;
import com.cinemamanagement.response.PageResponse;

import java.util.List;

public interface BookingManagementService {

    PageResponse<BookingListItemResponse> search(BookingSearchRequest request);

    BookingManagementDetailResponse getDetail(Long bookingId);

    BookingManagementDetailResponse reprint(Long bookingId, List<String> ticketCodes, Long employeeId);
}