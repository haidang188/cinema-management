package com.cinemamanagement.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "payment.vietqr")
public class VietQrProperties {
    private String bankId;
    private String bankName;
    private String accountNumber;
    private String accountName;
    private String template = "compact2";
    private String imageBaseUrl =
            "https://img.vietqr.io/image";
    public String getBankId() {
        return bankId;
    }

    public void setBankId(String bankId) {
        this.bankId = bankId;
    }

    public String getBankName() {
        return bankName;
    }

    public void setBankName(String bankName) {
        this.bankName = bankName;
    }

    public String getAccountNumber() {
        return accountNumber;
    }

    public void setAccountNumber(String accountNumber) {
        this.accountNumber = accountNumber;
    }

    public String getAccountName() {
        return accountName;
    }

    public void setAccountName(String accountName) {
        this.accountName = accountName;
    }

    public String getTemplate() {
        return template;
    }

    public void setTemplate(String template) {
        this.template = template;
    }

    public String getImageBaseUrl() {
        return imageBaseUrl;
    }

    public void setImageBaseUrl(String imageBaseUrl) {
        this.imageBaseUrl = imageBaseUrl;
    }

    public boolean isConfigured() {
        return !isBlank(bankId)
                && !isBlank(accountNumber);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
