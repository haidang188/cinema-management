package com.cinemamanagement.response;

import com.cinemamanagement.entity.Employee;

import java.time.LocalDate;
import java.time.LocalDateTime;

public record EmployeeListResponse(
        Long id,
        String employeeCode,
        String username,
        String fullName,
        String email,
        String phone,
        LocalDate dateOfBirth,
        String gender,
        String address,
        String position,
        String avatar,
        String status,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
    public static EmployeeListResponse fromEntity(Employee employee) {
        return new EmployeeListResponse(
                employee.getId(),
                employee.getEmployeeCode(),
                employee.getUser().getUsername(),
                employee.getFullName(),
                employee.getEmail(),
                employee.getPhone(),
                employee.getDateOfBirth(),
                employee.getGender(),
                employee.getAddress(),
                employee.getPosition(),
                employee.getAvatar(),
                employee.getStatus(),
                employee.getCreatedAt(),
                employee.getUpdatedAt()
        );
    }
}
