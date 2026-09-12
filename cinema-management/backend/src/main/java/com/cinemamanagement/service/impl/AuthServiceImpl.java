package com.cinemamanagement.service.impl;

import com.cinemamanagement.dto.auth.AuthResponse;
import com.cinemamanagement.dto.auth.LoginRequest;
import com.cinemamanagement.dto.auth.RegisterRequest;
import com.cinemamanagement.entity.Employee;
import com.cinemamanagement.entity.Member;
import com.cinemamanagement.entity.Role;
import com.cinemamanagement.entity.User;
import com.cinemamanagement.repository.EmployeeRepository;
import com.cinemamanagement.repository.MemberRepository;
import com.cinemamanagement.repository.RoleRepository;
import com.cinemamanagement.repository.UserRepository;
import com.cinemamanagement.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private static final String ROLE_MEMBER = "MEMBER";
    private static final String ROLE_EMPLOYEE = "EMPLOYEE";

    private final UserRepository userRepository;
    private final RoleRepository roleRepository;
    private final MemberRepository memberRepository;
    private final EmployeeRepository employeeRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        User user = userRepository.findByUsername(email)
                .orElseThrow(() -> new IllegalArgumentException("Email hoặc mật khẩu không đúng"));

        if (!passwordEncoder.matches(nullToEmpty(request.password()), user.getPassword())) {
            throw new IllegalArgumentException("Email hoặc mật khẩu không đúng");
        }

        String role = user.getRole().getName();
        return buildResponse(user, role, "Đăng nhập thành công");
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validateRegisterRequest(request);

        String email = normalizeEmail(request.email());
        String accountType = normalizeRole(request.accountType());
        Role role = roleRepository.findByName(accountType)
                .orElseThrow(() -> new IllegalArgumentException("Role không tồn tại: " + accountType));

        User user = new User();
        user.setUsername(email);
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setRole(role);
        User savedUser = userRepository.save(user);

        LocalDateTime now = LocalDateTime.now();
        if (ROLE_EMPLOYEE.equals(accountType)) {
            Employee employee = new Employee();
            employee.setUser(savedUser);
            employee.setEmployeeCode(generateEmployeeCode());
            employee.setFullName(request.fullName().trim());
            employee.setEmail(email);
            employee.setPhone(request.phone().trim());
            employee.setStatus("ACTIVE");
            employee.setCreatedAt(now);
            employee.setUpdatedAt(now);
            employeeRepository.save(employee);
        } else {
            Member member = new Member();
            member.setUser(savedUser);
            member.setFullName(request.fullName().trim());
            member.setEmail(email);
            member.setPhone(request.phone().trim());
            member.setPointBalance(0);
            member.setMembershipLevel("BASIC");
            member.setStatus("ACTIVE");
            member.setCreatedAt(now);
            member.setUpdatedAt(now);
            memberRepository.save(member);
        }

        return buildResponse(savedUser, accountType, "Đăng ký tài khoản thành công");
    }

    private void validateRegisterRequest(RegisterRequest request) {
        if (isBlank(request.fullName())) {
            throw new IllegalArgumentException("Họ và tên không được để trống");
        }
        if (isBlank(request.email())) {
            throw new IllegalArgumentException("Email không được để trống");
        }
        if (isBlank(request.phone())) {
            throw new IllegalArgumentException("Số điện thoại không được để trống");
        }
        if (isBlank(request.password()) || request.password().length() < 6) {
            throw new IllegalArgumentException("Mật khẩu phải có ít nhất 6 ký tự");
        }
        if (!request.password().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Xác nhận mật khẩu không khớp");
        }

        String email = normalizeEmail(request.email());
        if (userRepository.existsByUsername(email)
                || memberRepository.existsByEmail(email)
                || employeeRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Email đã được sử dụng");
        }
    }

    private AuthResponse buildResponse(User user, String role, String message) {
        if (ROLE_EMPLOYEE.equals(role)) {
            return employeeRepository.findByUserId(user.getId())
                    .map(employee -> new AuthResponse(
                            user.getId(),
                            employee.getId(),
                            employee.getFullName(),
                            employee.getEmail(),
                            employee.getPhone(),
                            role,
                            message
                    ))
                    .orElse(new AuthResponse(user.getId(), null, null, user.getUsername(), null, role, message));
        }

        return memberRepository.findByUserId(user.getId())
                .map(member -> new AuthResponse(
                        user.getId(),
                        member.getId(),
                        member.getFullName(),
                        member.getEmail(),
                        member.getPhone(),
                        role,
                        message
                ))
                .orElse(new AuthResponse(user.getId(), null, null, user.getUsername(), null, role, message));
    }

    private String normalizeRole(String accountType) {
        if (ROLE_EMPLOYEE.equalsIgnoreCase(nullToEmpty(accountType))) {
            return ROLE_EMPLOYEE;
        }
        return ROLE_MEMBER;
    }

    private String normalizeEmail(String email) {
        return nullToEmpty(email).trim().toLowerCase(Locale.ROOT);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String generateEmployeeCode() {
        return "EMP" + System.currentTimeMillis();
    }
}
