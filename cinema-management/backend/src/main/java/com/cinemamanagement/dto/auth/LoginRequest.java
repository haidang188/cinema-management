package com.cinemamanagement.dto.auth;

public record LoginRequest(
        String email,
        String password
) {
}
