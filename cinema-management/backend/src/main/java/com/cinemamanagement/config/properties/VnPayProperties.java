package com.cinemamanagement.config.properties;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "payment.vnpay")
public class VnPayProperties {

    private String tmnCode;
    private String hashSecret;
    private String payUrl;
    private String queryUrl;
    private String returnUrl;
    private String frontendResultUrl;
    private String version = "2.1.0";
    private String command = "pay";
    private String currencyCode = "VND";
    private String locale = "vn";
    private String orderType = "other";

    public String getTmnCode() {
        return tmnCode;
    }

    public void setTmnCode(String tmnCode) {
        this.tmnCode = tmnCode;
    }

    public String getHashSecret() {
        return hashSecret;
    }

    public void setHashSecret(String hashSecret) {
        this.hashSecret = hashSecret;
    }

    public String getPayUrl() {
        return payUrl;
    }

    public void setPayUrl(String payUrl) {
        this.payUrl = payUrl;
    }

    public String getQueryUrl() {
        return queryUrl;
    }

    public void setQueryUrl(String queryUrl) {
        this.queryUrl = queryUrl;
    }

    public String getReturnUrl() {
        return returnUrl;
    }

    public void setReturnUrl(String returnUrl) {
        this.returnUrl = returnUrl;
    }

    public String getFrontendResultUrl() {
        return frontendResultUrl;
    }

    public void setFrontendResultUrl(String frontendResultUrl) {
        this.frontendResultUrl = frontendResultUrl;
    }

    public String getVersion() {
        return version;
    }

    public void setVersion(String version) {
        this.version = version;
    }

    public String getCommand() {
        return command;
    }

    public void setCommand(String command) {
        this.command = command;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public String getLocale() {
        return locale;
    }

    public void setLocale(String locale) {
        this.locale = locale;
    }

    public String getOrderType() {
        return orderType;
    }

    public void setOrderType(String orderType) {
        this.orderType = orderType;
    }

    public boolean isConfigured() {
        return !isBlank(tmnCode)
                && !isBlank(hashSecret)
                && !isBlank(payUrl)
                && !isBlank(returnUrl);
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}