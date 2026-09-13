package com.cinemamanagement.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Table(name = "ticket_prices")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TicketPrice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "room_type", length = 30)
    private String roomType;

    @Column(name = "seat_type", length = 30)
    private String seatType;

    @Column(name = "day_type", length = 30)
    private String dayType;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal price;

    @Column(length = 30)
    private String status;
}
