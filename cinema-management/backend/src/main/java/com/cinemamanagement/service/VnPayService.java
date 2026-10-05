package com.cinemamanagement.service;

import com.cinemamanagement.entity.Booking;

import java.util.Map;

public interface VnPayService {
    String createPaymentUrl(Booking booking, String clientIp);

    boolean isValidReturn(Map<String, String> parameters);
}
