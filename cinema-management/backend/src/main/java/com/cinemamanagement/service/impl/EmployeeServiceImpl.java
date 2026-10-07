package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Employee;
import com.cinemamanagement.entity.Role;
import com.cinemamanagement.entity.User;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.EmployeeRepository;
import com.cinemamanagement.repository.RoleRepository;
import com.cinemamanagement.repository.UserRepository;
import com.cinemamanagement.request.CreateEmployeeRequest;
import com.cinemamanagement.request.UpdateEmployeeRequest;
import com.cinemamanagement.response.EmployeeDetailResponse;
import com.cinemamanagement.response.EmployeeListResponse;
import com.cinemamanagement.service.EmployeeService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;

@Service
public class EmployeeServiceImpl implements EmployeeService {
    private static final String ROLE_EMPLOYEE = "EMPLOYEE";
    private static final Set<String> ALLOWED_GENDERS = Set.of("MALE", "FEMALE", "OTHER");
    private static final Set<String> ALLOWED_STATUSES = Set.of("ACTIVE", "INACTIVE");

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    public EmployeeServiceImpl(
            EmployeeRepository employeeRepository,
            UserRepository userRepository,
            RoleRepository roleRepository,
            BCryptPasswordEncoder passwordEncoder
    ) {
        this.employeeRepository = employeeRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<EmployeeListResponse> getEmployees(String keyword, String status, Pageable pageable) {
        return employeeRepository.searchEmployees(normalize(keyword), normalizeStatusFilter(status), pageable)
                .map(EmployeeListResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeDetailResponse getEmployee(Long id) {
        return EmployeeDetailResponse.fromEntity(findEmployee(id));
    }

    @Override
    @Transactional
    public EmployeeDetailResponse createEmployee(CreateEmployeeRequest request) {
        String username = requiredTrim(request.getUsername());
        String employeeCode = requiredTrim(request.getEmployeeCode());

        if (userRepository.existsByUsernameIgnoreCase(username)) {
            throw new ConflictException("Tên đăng nhập đã tồn tại.");
        }
        if (employeeRepository.existsByEmployeeCodeIgnoreCase(employeeCode)) {
            throw new ConflictException("Mã nhân viên đã tồn tại.");
        }

        Role role = roleRepository.findByName(ROLE_EMPLOYEE)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy vai trò EMPLOYEE."));

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);

        Employee employee = new Employee();
        employee.setUser(userRepository.save(user));
        employee.setEmployeeCode(employeeCode);
        applyEmployeeFields(employee, request.getFullName(), request.getEmail(), request.getPhone(),
                request.getDateOfBirth(), request.getGender(), request.getAddress(), request.getPosition(),
                request.getAvatar(), request.getStatus());

        LocalDateTime now = LocalDateTime.now();
        employee.setCreatedAt(now);
        employee.setUpdatedAt(now);

        return EmployeeDetailResponse.fromEntity(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public EmployeeDetailResponse updateEmployee(Long id, UpdateEmployeeRequest request) {
        Employee employee = findEmployee(id);
        String employeeCode = requiredTrim(request.getEmployeeCode());

        if (employeeRepository.existsByEmployeeCodeIgnoreCaseAndIdNot(employeeCode, id)) {
            throw new ConflictException("Mã nhân viên đã tồn tại.");
        }

        employee.setEmployeeCode(employeeCode);
        applyEmployeeFields(employee, request.getFullName(), request.getEmail(), request.getPhone(),
                request.getDateOfBirth(), request.getGender(), request.getAddress(), request.getPosition(),
                request.getAvatar(), request.getStatus());
        employee.setUpdatedAt(LocalDateTime.now());

        return EmployeeDetailResponse.fromEntity(employeeRepository.save(employee));
    }

    @Override
    @Transactional
    public void deleteEmployee(Long id) {
        Employee employee = findEmployee(id);
        employee.setStatus("INACTIVE");
        employee.setUpdatedAt(LocalDateTime.now());
        employeeRepository.save(employee);
    }

    private Employee findEmployee(Long id) {
        return employeeRepository.findDetailById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy nhân viên với id " + id));
    }

    private void applyEmployeeFields(
            Employee employee,
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
        employee.setFullName(requiredTrim(fullName));
        employee.setEmail(nullableTrim(email));
        employee.setPhone(nullableTrim(phone));
        employee.setDateOfBirth(dateOfBirth);
        employee.setGender(normalizeAllowed(gender, ALLOWED_GENDERS, "Giới tính không hợp lệ."));
        employee.setAddress(nullableTrim(address));
        employee.setPosition(nullableTrim(position));
        employee.setAvatar(nullableTrim(avatar));
        employee.setStatus(normalizeAllowed(defaultIfBlank(status, "ACTIVE"), ALLOWED_STATUSES, "Trạng thái không hợp lệ."));
    }

    private String normalizeAllowed(String value, Set<String> allowedValues, String message) {
        String normalized = nullableTrim(value);
        if (normalized == null) {
            return null;
        }
        normalized = normalized.toUpperCase(Locale.ROOT);
        if (!allowedValues.contains(normalized)) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeStatusFilter(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!ALLOWED_STATUSES.contains(normalized)) {
            throw new BadRequestException("Trạng thái không hợp lệ.");
        }
        return normalized;
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String nullableTrim(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }

    private String requiredTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return value == null || value.trim().isEmpty() ? defaultValue : value;
    }
}
