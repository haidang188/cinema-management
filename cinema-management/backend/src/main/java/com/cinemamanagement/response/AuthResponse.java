package com.cinemamanagement.response;

public class AuthResponse {
    private Long userId;
    private Long profileId;
    private String fullName;
    private String email;
    private String phone;
    private String role;
    private String message;

    public AuthResponse(
            Long userId,
            Long profileId,
            String fullName,
            String email,
            String phone,
            String role,
            String message
    ) {
        this.userId = userId;
        this.profileId = profileId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.role = role;
        this.message = message;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public Long getProfileId() {
        return profileId;
    }

    public void setProfileId(Long profileId) {
        this.profileId = profileId;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
