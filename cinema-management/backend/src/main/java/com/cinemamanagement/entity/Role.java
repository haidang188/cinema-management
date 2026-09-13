package com.cinemamanagement.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "roles")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor

public class Role {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
<<<<<<< HEAD
    private int id;
=======
    private Long id;

>>>>>>> 0594784ec9746a7697c56977aa7ff6335768b4d3
    @Column(nullable = false, unique = true, length = 50)
    private String name;
}
