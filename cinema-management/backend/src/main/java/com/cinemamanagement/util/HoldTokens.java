package com.cinemamanagement.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.regex.Pattern;


public final class HoldTokens {

    private static final Pattern VALID = Pattern.compile("^[A-Za-z0-9_-]{16,128}$");

    private HoldTokens() {
    }

    public static String owner(String holdToken) {
        if (holdToken == null || !VALID.matcher(holdToken).matches()) {
            throw new IllegalArgumentException("Mã phiên giữ ghế không hợp lệ");
        }

        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(holdToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}