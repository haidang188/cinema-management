package com.cinemamanagement.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

<<<<<<< HEAD
import java.time.LocalDateTime;

=======
>>>>>>> 0594784ec9746a7697c56977aa7ff6335768b4d3
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
<<<<<<< HEAD

=======
>>>>>>> 0594784ec9746a7697c56977aa7ff6335768b4d3
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

<<<<<<< HEAD
=======
    @Column(nullable = false, unique = true, length = 100)
    private String username;

>>>>>>> 0594784ec9746a7697c56977aa7ff6335768b4d3
    @Column(nullable = false, length = 255)
    private String password;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "role_id", nullable = false)
    private Role role;
}
