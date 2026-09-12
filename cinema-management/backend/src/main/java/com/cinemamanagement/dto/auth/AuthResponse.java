package com.cinemamanagement.dto.auth;

public record AuthResponse(
        Long userId,
        Long profileId,
        String fullName,
        String email,
        String phone,
        String role,
        String message
) {
}
