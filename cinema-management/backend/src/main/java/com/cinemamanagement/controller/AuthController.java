package com.cinemamanagement.controller;

import com.cinemamanagement.request.LoginRequest;
import com.cinemamanagement.request.RegisterRequest;
import com.cinemamanagement.response.AuthResponse;
import com.cinemamanagement.service.AuthService;
import com.cinemamanagement.util.AuthTokenStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor

public class AuthController {
    private final AuthService authService;
    private final AuthTokenStore authTokenStore;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest body
    ) {
        AuthResponse result = authService.login(body);
        result.setToken(authTokenStore.issue(result.getUserId()));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest body
    ) {
        AuthResponse result = authService.register(body);
        result.setToken(authTokenStore.issue(result.getUserId()));

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        authTokenStore.revoke(request);

        return ResponseEntity.noContent().build();
    }
}
