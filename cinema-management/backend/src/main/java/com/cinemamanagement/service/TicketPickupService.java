package com.cinemamanagement.service;

import com.cinemamanagement.response.PickupBookingItemResponse;
import com.cinemamanagement.response.PickupInfoResponse;

import java.util.List;

public interface TicketPickupService {

    List<PickupBookingItemResponse> search(String keyword);

    PickupInfoResponse getInfo(Long bookingId);

    PickupInfoResponse confirm(Long bookingId, Long employeeId);
}