package com.cinemamanagement.request;

import jakarta.validation.constraints.NotBlank;

public record RestoreAccountRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại") String password
) {
}
