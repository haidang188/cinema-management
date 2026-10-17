package com.cinemamanagement.request;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Pattern;
import java.time.LocalDateTime;

public record ScheduleShowtimeRequest(
        @NotNull(message = "Vui lòng chọn phim") @Positive Long movieId,
        @NotNull(message = "Vui lòng chọn phòng chiếu") @Positive Long roomId,
        @NotNull(message = "Vui lòng chọn giờ bắt đầu") LocalDateTime startTime,
        @NotNull(message = "Vui lòng chọn định dạng")
        @Pattern(regexp = "2D|3D|IMAX|4DX", message = "Định dạng không hợp lệ") String format
) {}
