package com.cinemamanagement.util;

import com.cinemamanagement.entity.Booking;

public final class BookingCustomers {

    private BookingCustomers() {
    }

    public static String name(Booking b) {
        if (notBlank(b.getCustomerName())) return b.getCustomerName();
        if (b.getMember() == null) return null;

        return b.getMember().getFullName();
    }

    public static String phone(Booking b) {
        if (notBlank(b.getCustomerPhone())) return b.getCustomerPhone();
        if (b.getMember() == null) return null;

        return b.getMember().getPhone();
    }

    public static String email(Booking b) {
        if (b.getMember() == null) return null;

        return b.getMember().getEmail();
    }

    private static boolean notBlank(String value) {
        return value != null && !value.isBlank();
    }
}