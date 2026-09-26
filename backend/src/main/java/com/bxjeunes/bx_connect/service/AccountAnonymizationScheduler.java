package com.bxjeunes.bx_connect.service;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class AccountAnonymizationScheduler {

    private final AccountAnonymizationService accountAnonymizationService;

    public AccountAnonymizationScheduler(AccountAnonymizationService accountAnonymizationService) {
        this.accountAnonymizationService = accountAnonymizationService;
    }

    @Scheduled(cron = "${account-deletion.anonymization-cron:0 0 3 * * *}")
    public void anonymizeRequestedAccounts() {
        accountAnonymizationService.anonymizeEligibleAccounts();
    }
}
