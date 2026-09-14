package com.cinemamanagement.service;

import com.cinemamanagement.request.LoginRequest;
import com.cinemamanagement.request.RegisterRequest;
import com.cinemamanagement.response.AuthResponse;

public interface AuthService {
    AuthResponse login(LoginRequest request);

    AuthResponse register(RegisterRequest request);
}
