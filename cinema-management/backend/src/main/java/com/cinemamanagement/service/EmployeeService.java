package com.cinemamanagement.service;

import com.cinemamanagement.request.CreateEmployeeRequest;
import com.cinemamanagement.request.UpdateEmployeeRequest;
import com.cinemamanagement.response.EmployeeDetailResponse;
import com.cinemamanagement.response.EmployeeListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface EmployeeService {
    Page<EmployeeListResponse> getEmployees(String keyword, String status, Pageable pageable);

    EmployeeDetailResponse getEmployee(Long id);

    EmployeeDetailResponse createEmployee(CreateEmployeeRequest request);

    EmployeeDetailResponse updateEmployee(Long id, UpdateEmployeeRequest request);

    void deleteEmployee(Long id);
}
