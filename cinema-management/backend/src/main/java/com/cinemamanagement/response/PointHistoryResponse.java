package com.cinemamanagement.response;

import com.cinemamanagement.entity.PointHistory;

import java.time.LocalDateTime;

public record PointHistoryResponse(
        Long id,
        Long bookingId,
        String bookingCode,
        Integer points,
        Integer balanceBefore,
        Integer balanceAfter,
        String type,
        String description,
        LocalDateTime createdAt
) {
    public static PointHistoryResponse from(PointHistory history) {
        return new PointHistoryResponse(
                history.getId(),
                history.getBooking() == null ? null : history.getBooking().getId(),
                history.getBooking() == null ? null : history.getBooking().getBookingCode(),
                history.getPoints(), history.getBalanceBefore(), history.getBalanceAfter(),
                history.getType(), history.getDescription(), history.getCreatedAt()
        );
    }
}
