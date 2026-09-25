package com.cinemamanagement.config;

import com.cinemamanagement.entity.Admin;
import com.cinemamanagement.entity.Role;
import com.cinemamanagement.entity.User;
import com.cinemamanagement.repository.AdminRepository;
import com.cinemamanagement.repository.RoleRepository;
import com.cinemamanagement.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String DEFAULT_ADMIN_EMAIL = "admin@gmail.com";
    private static final String DEFAULT_ADMIN_PASSWORD = "123456";

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final AdminRepository adminRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    @Override
    @Transactional
    public void run(String... args) {
        String[] requiredRoles = {ROLE_ADMIN, "EMPLOYEE", "MEMBER"};
        for (String roleName : requiredRoles) {
            Optional<Role> existingRole = roleRepository.findByName(roleName);

            if (existingRole.isEmpty()) {
                Role newRole = new Role();
                newRole.setName(roleName);
                roleRepository.save(newRole);
                System.out.println("Auto-created role: " + roleName);
            }
        }

        createDefaultAdmin();
    }

    private void createDefaultAdmin() {
        Role adminRole = roleRepository.findByName(ROLE_ADMIN)
                .orElseThrow(() -> new IllegalStateException("Missing ADMIN role"));

        User adminUser = userRepository.findByUsername(DEFAULT_ADMIN_EMAIL)
                .orElseGet(() -> {
                    User user = new User();
                    user.setUsername(DEFAULT_ADMIN_EMAIL);
                    user.setPassword(passwordEncoder.encode(DEFAULT_ADMIN_PASSWORD));
                    user.setRole(adminRole);
                    return userRepository.save(user);
                });

        if (!ROLE_ADMIN.equals(adminUser.getRole().getName())) {
            adminUser.setRole(adminRole);
            adminUser = userRepository.save(adminUser);
        }

        if (!adminRepository.existsByUserId(adminUser.getId())) {
            LocalDateTime now = LocalDateTime.now();
            Admin admin = new Admin();
            admin.setUser(adminUser);
            admin.setFullName("System Admin");
            admin.setEmail(DEFAULT_ADMIN_EMAIL);
            admin.setPhone("0900000000");
            admin.setStatus("ACTIVE");
            admin.setCreatedAt(now);
            admin.setUpdatedAt(now);
            adminRepository.save(admin);
        }
    }
}
