package com.cinemamanagement.response;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketPriceResponse {
    private Long id;
    private String roomType;
    private String seatType;
    private String dayType;
    private BigDecimal price;
}
