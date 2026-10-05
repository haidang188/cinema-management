package com.cinemamanagement.service;

import com.cinemamanagement.request.HoldSeatsRequest;
import com.cinemamanagement.request.UpdateSeatHoldRequest;
import com.cinemamanagement.response.SeatHoldResponse;

public interface SeatHoldService {
    SeatHoldResponse createHold(HoldSeatsRequest request);
    SeatHoldResponse updateHold(String holdToken, UpdateSeatHoldRequest request);
    SeatHoldResponse getActiveHold(String holdToken, Long userId);
    void releaseHold(String holdToken, Long userId);
    void expireHolds();
}
