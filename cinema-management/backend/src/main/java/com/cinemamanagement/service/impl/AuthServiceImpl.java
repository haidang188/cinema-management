package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Employee;
import com.cinemamanagement.entity.Member;
import com.cinemamanagement.entity.Role;
import com.cinemamanagement.entity.User;
import com.cinemamanagement.exception.AuthValidationException;
import com.cinemamanagement.repository.EmployeeRepository;
import com.cinemamanagement.repository.MemberRepository;
import com.cinemamanagement.repository.RoleRepository;
import com.cinemamanagement.repository.UserRepository;
import com.cinemamanagement.request.LoginRequest;
import com.cinemamanagement.request.RegisterRequest;
import com.cinemamanagement.response.AuthResponse;
import com.cinemamanagement.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

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
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByUsername(email)
                .orElseThrow(this::invalidCredentials);

        if (!passwordEncoder.matches(nullToEmpty(request.getPassword()), user.getPassword())) {
            throw invalidCredentials();
        }

        String role = user.getRole().getName();
        return buildResponse(user, role, "Đăng nhập thành công");
    }

    @Override
    @Transactional
    public AuthResponse register(RegisterRequest request) {
        validateRegisterRequest(request);

        String email = normalizeEmail(request.getEmail());
        String accountType = normalizeRole(request.getAccountType());
        Role role = roleRepository.findByName(accountType)
                .orElseThrow(() -> new AuthValidationException(
                        "Thông tin đăng ký không hợp lệ",
                        Map.of("accountType", "Loại tài khoản không tồn tại")
                ));

        User user = new User();
        user.setUsername(email);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        User savedUser = userRepository.save(user);

        LocalDateTime now = LocalDateTime.now();
        if (ROLE_EMPLOYEE.equals(accountType)) {
            Employee employee = new Employee();
            employee.setUser(savedUser);
            employee.setEmployeeCode(generateEmployeeCode());
            employee.setFullName(request.getFullName().trim());
            employee.setEmail(email);
            employee.setPhone(request.getPhone().trim());
            employee.setStatus("ACTIVE");
            employee.setCreatedAt(now);
            employee.setUpdatedAt(now);
            employeeRepository.save(employee);
        } else {
            Member member = new Member();
            member.setUser(savedUser);
            member.setFullName(request.getFullName().trim());
            member.setEmail(email);
            member.setPhone(request.getPhone().trim());
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
        Map<String, String> errors = new LinkedHashMap<>();

        if (isBlank(request.getFullName())) {
            errors.put("fullName", "Họ và tên không được để trống");
        }
        if (isBlank(request.getEmail())) {
            errors.put("email", "Email không được để trống");
        }
        if (isBlank(request.getPhone())) {
            errors.put("phone", "Số điện thoại không được để trống");
        }
        if (isBlank(request.getPassword()) || request.getPassword().length() < 6) {
            errors.put("password", "Mật khẩu phải có ít nhất 6 ký tự");
        }
        if (!nullToEmpty(request.getPassword()).equals(nullToEmpty(request.getConfirmPassword()))) {
            errors.put("confirmPassword", "Xác nhận mật khẩu không khớp");
        }

        String email = normalizeEmail(request.getEmail());
        if (!isBlank(email)
                && (userRepository.existsByUsername(email)
                || memberRepository.existsByEmail(email)
                || employeeRepository.existsByEmail(email))) {
            errors.put("email", "Email đã được sử dụng");
        }

        if (!errors.isEmpty()) {
            throw new AuthValidationException("Thông tin đăng ký không hợp lệ", errors);
        }
    }

    private AuthValidationException invalidCredentials() {
        return new AuthValidationException(
                "Email hoặc mật khẩu không đúng",
                Map.of("password", "Email hoặc mật khẩu không đúng")
        );
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
