package com.cinemamanagement.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "point_histories")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class PointHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "member_id", nullable = false)
    private Member member;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Column(nullable = false)
    private Integer points;

    @Column(name = "balance_before", nullable = false)
    private Integer balanceBefore;

    @Column(name = "balance_after", nullable = false)
    private Integer balanceAfter;

    @Column(length = 20)
    private String type;

    @Column(length = 255)
    private String description;

    @Column(name = "idempotency_key", unique = true, length = 150)
    private String idempotencyKey;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
