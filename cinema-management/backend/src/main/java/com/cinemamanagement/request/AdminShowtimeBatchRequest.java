package com.cinemamanagement.request;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.time.LocalDateTime;
import java.util.List;

/** Thêm nhanh nhiều suất cho cùng một phim và một phòng. */
public record AdminShowtimeBatchRequest(
        @NotNull @Positive Long movieId,
        @NotNull @Positive Long roomId,
        @NotEmpty(message = "Chọn ít nhất một giờ chiếu")
        @Size(max = 20, message = "Mỗi lần thêm tối đa 20 suất")
        List<@NotNull LocalDateTime> startTimes,
        @Size(max = 50) String format
) {}
