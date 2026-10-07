package com.cinemamanagement.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public class CreateEmployeeRequest {
    @NotBlank(message = "Tên đăng nhập không được để trống.")
    @Size(max = 100, message = "Tên đăng nhập không được vượt quá 100 ký tự.")
    private String username;

    @NotBlank(message = "Mật khẩu không được để trống.")
    @Size(min = 8, max = 100, message = "Mật khẩu phải có ít nhất 8 ký tự.")
    private String password;

    @NotBlank(message = "Mã nhân viên không được để trống.")
    @Size(max = 50, message = "Mã nhân viên không được vượt quá 50 ký tự.")
    private String employeeCode;

    @NotBlank(message = "Họ và tên không được để trống.")
    @Size(max = 100, message = "Họ và tên không được vượt quá 100 ký tự.")
    private String fullName;

    @Email(message = "Email không đúng định dạng.")
    @Size(max = 100, message = "Email không được vượt quá 100 ký tự.")
    private String email;

    @Pattern(regexp = "^(|0[0-9]{9,10}|\\+84[0-9]{9,10})$", message = "Số điện thoại không đúng định dạng.")
    @Size(max = 20, message = "Số điện thoại không được vượt quá 20 ký tự.")
    private String phone;

    @PastOrPresent(message = "Ngày sinh không hợp lệ.")
    private LocalDate dateOfBirth;

    private String gender;
    private String address;
    private String position;
    private String avatar;
    private String status;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public String getEmployeeCode() {
        return employeeCode;
    }

    public void setEmployeeCode(String employeeCode) {
        this.employeeCode = employeeCode;
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

    public String getAddress() {
        return address;
    }

    public void setAddress(String address) {
        this.address = address;
    }

    public String getPosition() {
        return position;
    }

    public void setPosition(String position) {
        this.position = position;
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
