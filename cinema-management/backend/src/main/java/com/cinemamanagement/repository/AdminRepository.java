package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Admin;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface AdminRepository extends JpaRepository<Admin, Long> {
    boolean existsByUserId(Long userId);

    Optional<Admin> findByUserId(Long userId);
}
