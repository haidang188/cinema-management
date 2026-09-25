package com.cinemamanagement.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "showtime_seats", uniqueConstraints = {
        @UniqueConstraint(name = "uk_showtime_seat", columnNames = {
                "showtime_id", "seat_id"
        }
        )
}
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ShowtimeSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "showtime_id", nullable = false)
    private Showtime showtime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @Column(nullable = false, length = 30)
    private String status = "AVAILABLE";

    @Column(name = "held_until")
    private LocalDateTime heldUntil;
}
