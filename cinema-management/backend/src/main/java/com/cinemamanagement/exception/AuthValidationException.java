package com.cinemamanagement.exception;

import java.util.Map;

public class AuthValidationException extends RuntimeException {
    private final Map<String, String> fieldErrors;

    public AuthValidationException(String message, Map<String, String> fieldErrors) {
        super(message);
        this.fieldErrors = fieldErrors;
    }

    public Map<String, String> getFieldErrors() {
        return fieldErrors;
    }
}
