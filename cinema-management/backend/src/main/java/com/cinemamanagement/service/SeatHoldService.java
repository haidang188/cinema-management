package com.cinemamanagement.service;

import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.response.SeatHoldResponse;
import com.cinemamanagement.response.SeatStateResponse;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

public interface SeatHoldService {

    SeatHoldResponse hold(Long showtimeId, String holdToken, List<Long> showtimeSeatIds, boolean allowPartial);

    SeatHoldResponse release(Long showtimeId, String holdToken, List<Long> showtimeSeatIds);

    List<SeatStateResponse> getSeatStates(Long showtimeId);

    LocalDateTime requireActiveHold(Long showtimeId, String holdToken, Collection<Long> showtimeSeatIds);

    long extendAfterPayment(Long showtimeId, String owner);

    List<Long> setHoldExpiry(Long showtimeId, String owner, LocalDateTime until);

    List<Long> heldSeatIds(Long showtimeId, String owner);

    void releaseExpiredHolds();

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