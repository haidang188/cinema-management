package com.cinemamanagement.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record DeleteAccountRequest(
        @NotBlank(message = "Vui lòng nhập mật khẩu hiện tại") String password,
        @Size(max = 500, message = "Lý do không được vượt quá 500 ký tự") String reason
) {
}
