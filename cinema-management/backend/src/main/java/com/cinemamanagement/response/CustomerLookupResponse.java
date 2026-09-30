package com.cinemamanagement.response;

public record CustomerLookupResponse(
        boolean found,
        Long id,
        String phone,
        String fullName,
        int visitCount
) {
}