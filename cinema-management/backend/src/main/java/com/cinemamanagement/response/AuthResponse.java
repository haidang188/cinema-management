package com.cinemamanagement.response;

public class AuthResponse {
    private Long userId;
    private Long profileId;
    private String fullName;
    private String email;
    private String phone;
    private String role;
    private String accountStatus;
    private java.time.LocalDateTime scheduledDeletionAt;
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
        this(userId, profileId, fullName, email, phone, role, "ACTIVE", null, message);
    }

    public AuthResponse(
            Long userId,
            Long profileId,
            String fullName,
            String email,
            String phone,
            String role,
            String accountStatus,
            java.time.LocalDateTime scheduledDeletionAt,
            String message
    ) {
        this.userId = userId;
        this.profileId = profileId;
        this.fullName = fullName;
        this.email = email;
        this.phone = phone;
        this.role = role;
        this.accountStatus = accountStatus;
        this.scheduledDeletionAt = scheduledDeletionAt;
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

    public String getAccountStatus() {
        return accountStatus;
    }

    public void setAccountStatus(String accountStatus) {
        this.accountStatus = accountStatus;
    }

    public java.time.LocalDateTime getScheduledDeletionAt() {
        return scheduledDeletionAt;
    }

    public void setScheduledDeletionAt(java.time.LocalDateTime scheduledDeletionAt) {
        this.scheduledDeletionAt = scheduledDeletionAt;
    }

    public String getMessage() {
        return message;
    }

    public void setMessage(String message) {
        this.message = message;
    }
}
