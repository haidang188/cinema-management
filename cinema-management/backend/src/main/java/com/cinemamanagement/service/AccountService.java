package com.cinemamanagement.service;

import com.cinemamanagement.request.DeleteAccountRequest;
import com.cinemamanagement.request.RestoreAccountRequest;
import com.cinemamanagement.request.UpdateAccountRequest;
import com.cinemamanagement.response.AccountProfileResponse;

public interface AccountService {
    AccountProfileResponse getProfile(Long userId);

    AccountProfileResponse updateProfile(Long userId, UpdateAccountRequest request);

    AccountProfileResponse requestDeletion(Long userId, DeleteAccountRequest request);

    AccountProfileResponse restore(Long userId, RestoreAccountRequest request);

    void deleteExpiredAccounts();
}
