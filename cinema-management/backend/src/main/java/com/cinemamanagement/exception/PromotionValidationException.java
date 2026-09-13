package com.cinemamanagement.exception;

import java.util.Map;

public class PromotionValidationException extends RuntimeException {

    private final Map<String, String> errors;

    public PromotionValidationException(
            String message,
            Map<String, String> errors
    ) {
        super(message);
        this.errors = errors;
    }

    public Map<String, String> getErrors() {
        return errors;
    }
}