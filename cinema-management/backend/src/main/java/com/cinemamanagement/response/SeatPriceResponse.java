package com.cinemamanagement.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

import java.math.BigDecimal;

@Getter
@AllArgsConstructor
public class SeatPriceResponse {

    private Long showtimeSeatId;

    private String rowLabel;

    private Integer seatNumber;

    private String seatType;

    private BigDecimal price;
}