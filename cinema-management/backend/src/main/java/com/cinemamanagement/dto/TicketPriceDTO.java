package com.cinemamanagement.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketPriceDTO {

    private Long id;

    private String roomType;

    private String seatType;

    private String dayType;

    private BigDecimal price;
}