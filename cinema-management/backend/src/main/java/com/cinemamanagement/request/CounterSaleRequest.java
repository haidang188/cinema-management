package com.cinemamanagement.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CounterSaleRequest {
    private Long showtimeId;

    private List<Long> showtimeSeatIds;

    private Long promotionId;

    private String paymentMethod;
}
