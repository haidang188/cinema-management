package com.cinemamanagement.request;

import lombok.Getter;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.List;

@Getter
@Setter
public class CounterSaleRequest {

    private Long showtimeId;

    private List<Long> showtimeSeatIds;

    private String paymentMethod;

    private String holdToken;

    private String promotionCode;

    private BigDecimal cashReceived;

    private String paymentProvider;

    private String paymentReference;

    private String customerName;

    private String customerPhone;
}