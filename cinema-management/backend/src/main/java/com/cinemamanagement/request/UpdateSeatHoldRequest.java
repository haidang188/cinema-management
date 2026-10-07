package com.cinemamanagement.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public class UpdateSeatHoldRequest {

    @NotNull(message = "Người dùng không được để trống")
    @Positive(message = "Người dùng không hợp lệ")
    private Long userId;

    @NotNull(message = "Danh sách ghế không được để trống")
    private List<@NotNull @Positive Long> showtimeSeatIds;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public List<Long> getShowtimeSeatIds() {
        return showtimeSeatIds;
    }

    public void setShowtimeSeatIds(
            List<Long> showtimeSeatIds
    ) {
        this.showtimeSeatIds = showtimeSeatIds;
    }
}