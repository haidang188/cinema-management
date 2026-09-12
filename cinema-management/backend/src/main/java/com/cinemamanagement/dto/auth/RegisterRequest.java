package com.cinemamanagement.dto.auth;

public record RegisterRequest(
        String fullName,
        String email,
        String phone,
        String password,
        String confirmPassword,
        String accountType
) {
}
