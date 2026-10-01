package com.cinemamanagement.service;

import com.cinemamanagement.entity.Customer;
import com.cinemamanagement.response.CustomerLookupResponse;

public interface CustomerService {

    CustomerLookupResponse lookup(String phone);

    Customer recordPurchase(String fullName, String phone);

    static String normalizePhone(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }

        String digits = raw.replaceAll("[\\s.\\-()]", "");

        if (digits.startsWith("+84")) {
            digits = "0" + digits.substring(3);
        } else if (digits.startsWith("84") && digits.length() == 11) {
            digits = "0" + digits.substring(2);
        }

        if (!digits.matches("^0[35789]\\d{8}$")) {
            throw new IllegalArgumentException("Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03/05/07/08/09)");
        }

        return digits;
    }

    static String normalizeName(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }

        String name = raw.trim().replaceAll("\\s+", " ");

        if (name.length() > 100) {
            throw new IllegalArgumentException("Tên khách tối đa 100 ký tự");
        }

        return name;
    }
}