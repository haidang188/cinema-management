package com.cinemamanagement.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "tickets")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(
            name = "ticket_code",
            nullable = false,
            unique = true,
            length = 50
    )
    private String ticketCode;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(
            name = "booking_seat_id",
            nullable = false,
            unique = true
    )
    private BookingSeat bookingSeat;

    @Column(nullable = false, length = 30)
    private String status = "ACTIVE";

    @Column(name = "qr_token", unique = true, length = 100)
    private String qrToken;

    @Column(name = "issued_at", nullable = false)
    private LocalDateTime issuedAt;
}
