package com.cinemamanagement.service;

import com.cinemamanagement.dto.auth.AuthResponse;
import com.cinemamanagement.dto.auth.LoginRequest;
import com.cinemamanagement.dto.auth.RegisterRequest;

public interface AuthService {
    AuthResponse login(LoginRequest request);

    AuthResponse register(RegisterRequest request);
}
