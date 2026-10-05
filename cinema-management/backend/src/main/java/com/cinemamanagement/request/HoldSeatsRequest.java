package com.cinemamanagement.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.List;

public class HoldSeatsRequest {
    @NotNull(message = "Người dùng không được để trống")
    @Positive(message = "Người dùng không hợp lệ")
    private Long userId;

    @NotNull(message = "Suất chiếu không được để trống")
    @Positive(message = "Suất chiếu không hợp lệ")
    private Long showtimeId;

    @NotEmpty(message = "Vui lòng chọn ít nhất một ghế")
    private List<@NotNull @Positive Long> showtimeSeatIds;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getShowtimeId() {
        return showtimeId;
    }

    public void setShowtimeId(Long showtimeId) {
        this.showtimeId = showtimeId;
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
