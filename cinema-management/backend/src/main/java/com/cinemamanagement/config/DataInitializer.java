package com.cinemamanagement.config;

import com.cinemamanagement.entity.Role;
import com.cinemamanagement.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    private final RoleRepository roleRepository;

    @Override
    public void run(String... args) {
        String[] requiredRoles = {"ADMIN", "EMPLOYEE", "MEMBER"};
        for (String roleName : requiredRoles){
            Optional<Role> existingRole = roleRepository.findByName(roleName);

            if(existingRole.isEmpty()){
                Role newRole = new Role();
                newRole.setName(roleName);
                roleRepository.save(newRole);
                System.out.println("Đã tự động thêm Role: " + roleName);
            }
        }
    }
}
