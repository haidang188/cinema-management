package com.cinemamanagement.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
@Entity
@Table(name = "customers")
public class Customer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 15)
    private String phone;

    @Column(name = "full_name", length = 100)
    private String fullName;

    @Column(name = "visit_count", nullable = false)
    private int visitCount;

    @Column(name = "last_visit_at")
    private LocalDateTime lastVisitAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;
}