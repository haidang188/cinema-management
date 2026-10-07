package com.cinemamanagement.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CounterSaleResponse {
    private Long bookingId;

    private String bookingCode;

    private BigDecimal totalAmount;

    private BigDecimal discountAmount;

    private BigDecimal finalAmount;

    private String paymentMethod;

    private String paymentStatus;

    private List<String> ticketCodes;
}
