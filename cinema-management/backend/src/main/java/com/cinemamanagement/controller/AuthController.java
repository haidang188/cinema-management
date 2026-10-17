package com.cinemamanagement.controller;

import com.cinemamanagement.request.LoginRequest;
import com.cinemamanagement.request.RegisterRequest;
import com.cinemamanagement.response.AuthResponse;
import com.cinemamanagement.service.AuthService;
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
    public static final String SESSION_USER_ID = "cinema.auth.userId";

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest body,
            HttpServletRequest request
    ) {
        AuthResponse result = authService.login(body);
        startSession(request, result.getUserId());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest body,
            HttpServletRequest request
    ) {
        AuthResponse result = authService.register(body);
        startSession(request, result.getUserId());

        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletRequest request) {
        var session = request.getSession(false);

        if (session != null) {
            session.invalidate();
        }

        return ResponseEntity.noContent().build();
    }

    private void startSession(HttpServletRequest request, Long userId) {
        var oldSession = request.getSession(false);

        if (oldSession != null) {
            oldSession.invalidate();
        }

        var session = request.getSession(true);
        session.setAttribute(SESSION_USER_ID, userId);
        session.setMaxInactiveInterval(30 * 60);
    }
}