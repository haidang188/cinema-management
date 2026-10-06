package com.cinemamanagement.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class UpdateMemberRequest {
    @NotBlank(message = "Ho va ten khong duoc de trong.")
    @Size(max = 100, message = "Ho va ten khong duoc vuot qua 100 ky tu.")
    private String fullName;

    @Email(message = "Email khong dung dinh dang.")
    @Size(max = 100, message = "Email khong duoc vuot qua 100 ky tu.")
    private String email;

    @Pattern(regexp = "^(|0[0-9]{9,10}|\\+84[0-9]{9,10})$", message = "So dien thoai khong dung dinh dang.")
    @Size(max = 20, message = "So dien thoai khong duoc vuot qua 20 ky tu.")
    private String phone;

    @PastOrPresent(message = "Ngay sinh khong hop le.")
    private LocalDate dateOfBirth;

    private String gender;
    private String avatar;
    private String status;

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

    public LocalDate getDateOfBirth() {
        return dateOfBirth;
    }

    public void setDateOfBirth(LocalDate dateOfBirth) {
        this.dateOfBirth = dateOfBirth;
    }

    public String getGender() {
        return gender;
    }

    public void setGender(String gender) {
        this.gender = gender;
    }

    public String getAvatar() {
        return avatar;
    }

    public void setAvatar(String avatar) {
        this.avatar = avatar;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
