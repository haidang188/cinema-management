package com.cinemamanagement.service;

import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.request.HoldSeatsRequest;
import com.cinemamanagement.request.UpdateSeatHoldRequest;
import com.cinemamanagement.response.SeatHoldActionResponse;
import com.cinemamanagement.response.SeatHoldResponse;
import com.cinemamanagement.response.SeatStateResponse;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface SeatHoldService {
    SeatHoldResponse createHold(HoldSeatsRequest request);

    SeatHoldResponse updateHold(String holdToken, UpdateSeatHoldRequest request);

    SeatHoldResponse getActiveHold(String holdToken, Long userId);

    void releaseHold(String holdToken, Long userId);

    void expireHolds();

    SeatHoldActionResponse hold(
            Long showtimeId,
            String holdToken,
            List<Long> showtimeSeatIds,
            boolean allowPartial
    );

    SeatHoldActionResponse release(
            Long showtimeId,
            String holdToken,
            List<Long> showtimeSeatIds
    );

    List<SeatStateResponse> getSeatStates(Long showtimeId);

    LocalDateTime requireActiveHold(
            Long showtimeId,
            String holdToken,
            Collection<Long> showtimeSeatIds
    );

    long extendAfterPayment(Long showtimeId, String owner);

    List<Long> setHoldExpiry(Long showtimeId, String owner, LocalDateTime until);

    List<Long> heldSeatIds(Long showtimeId, String owner);

    static boolean isActiveHold(ShowtimeSeat seat, LocalDateTime now) {
        return "HELD".equalsIgnoreCase(seat.getStatus())
                && seat.getHeldUntil() != null
                && seat.getHeldUntil().isAfter(now);
    }

    static boolean isFree(ShowtimeSeat seat, LocalDateTime now) {
        return "AVAILABLE".equalsIgnoreCase(seat.getStatus())
                || ("HELD".equalsIgnoreCase(seat.getStatus()) && !isActiveHold(seat, now));
    }

    static void clearHold(ShowtimeSeat seat) {
        seat.setStatus("AVAILABLE");
        seat.setHeldUntil(null);
        seat.setHoldOwner(null);
    }
}
