package com.cinemamanagement.service;

import com.cinemamanagement.request.BookingPreviewRequest;
import com.cinemamanagement.request.CreateOnlineBookingRequest;
import com.cinemamanagement.response.BookingDetailResponse;
import com.cinemamanagement.response.BookingPreviewResponse;
import com.cinemamanagement.response.OnlineBookingResponse;

import java.util.Map;

public interface OnlineBookingService {
    BookingPreviewResponse preview(BookingPreviewRequest request);

    OnlineBookingResponse create(CreateOnlineBookingRequest request, String clientIp);

    BookingDetailResponse confirmVietQr(String bookingCode, Long userId);

    String processVnPayReturn(Map<String, String> parameters);

    BookingDetailResponse getBooking(String bookingCode, Long userId);

    BookingDetailResponse scanBooking(String qrToken);

    void expirePendingBookings();
}
