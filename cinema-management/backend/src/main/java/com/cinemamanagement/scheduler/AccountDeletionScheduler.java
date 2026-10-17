package com.cinemamanagement.scheduler;

import com.cinemamanagement.service.AccountService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AccountDeletionScheduler {
    private final AccountService accountService;

    @Scheduled(cron = "${account.deletion-cleanup-cron:0 0 * * * *}")
    public void deleteExpiredAccounts() {
        accountService.deleteExpiredAccounts();
    }
}
