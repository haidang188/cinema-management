package com.cinemamanagement.response;

import com.cinemamanagement.entity.Employee;

import java.time.LocalDate;

public record EmployeeDetailResponse(
        Long id,
        Long userId,
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
        String status
) {
    public static EmployeeDetailResponse fromEntity(Employee employee) {
        return new EmployeeDetailResponse(
                employee.getId(),
                employee.getUser().getId(),
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
                employee.getStatus()
        );
    }
}
