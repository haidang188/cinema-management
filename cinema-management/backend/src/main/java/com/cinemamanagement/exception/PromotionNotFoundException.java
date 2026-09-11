package com.cinemamanagement.exception;

public class PromotionNotFoundException extends RuntimeException {
    public PromotionNotFoundException(String message) {
        super(message);
    }
}
