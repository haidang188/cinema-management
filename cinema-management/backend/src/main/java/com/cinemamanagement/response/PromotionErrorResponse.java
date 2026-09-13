package com.cinemamanagement.response;

import java.time.LocalDateTime;
import java.util.Map;

public record PromotionErrorResponse(
        String message,
        Map<String, String> errors,
        LocalDateTime timestamp
) {
}