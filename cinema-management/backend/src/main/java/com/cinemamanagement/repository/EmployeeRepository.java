package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Employee;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EmployeeRepository extends JpaRepository<Employee, Long> {
    boolean existsByEmail(String email);

    Optional<Employee> findByUserId(Long userId);
}
