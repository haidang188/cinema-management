package com.cinemamanagement.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateOnlineBookingRequest(
        @NotNull(message = "Thiếu người dùng") Long userId,
        @NotBlank(message = "Thiếu mã giữ ghế") String holdToken,
        @NotBlank(message = "Vui lòng chọn phương thức thanh toán") String paymentMethod
) {
}
