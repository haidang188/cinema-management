package com.cinemamanagement.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record UpdateAccountRequest(
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 100) String email,
        @NotBlank @Pattern(regexp = "^(0[0-9]{9,10}|\\+84[0-9]{9,10})$") @Size(max = 20) String phone,
        @PastOrPresent LocalDate dateOfBirth,
        String gender,
        @Size(max = 255) String avatar
) {
}
