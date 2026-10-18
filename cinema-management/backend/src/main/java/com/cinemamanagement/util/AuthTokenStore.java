package com.cinemamanagement.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Phiên đăng nhập dạng token (gửi qua header "Authorization: Bearer ...") thay cho
 * HttpSession/cookie. Cookie dùng chung mọi tab nên chỉ giữ được một tài khoản cho cả
 * trình duyệt; token do frontend lưu trong sessionStorage nên mỗi tab có phiên riêng.
 * Lưu trong bộ nhớ: khởi động lại backend thì mọi phiên mất, giống session trước đây.
 */
@Component
public class AuthTokenStore {

    private static final Duration IDLE_TIMEOUT = Duration.ofMinutes(30);
    private static final String BEARER_PREFIX = "Bearer ";

    private final SecureRandom random = new SecureRandom();
    private final Map<String, Entry> tokens = new ConcurrentHashMap<>();

    private static final class Entry {
        private final Long userId;
        private volatile Instant lastAccess;

        private Entry(Long userId) {
            this.userId = userId;
            this.lastAccess = Instant.now();
        }

        private boolean isExpired(Instant now) {
            return lastAccess.plus(IDLE_TIMEOUT).isBefore(now);
        }
    }

    public String issue(Long userId) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tokens.put(token, new Entry(userId));
        return token;
    }

    public void revoke(HttpServletRequest request) {
        String token = extractToken(request);

        if (token != null) {
            tokens.remove(token);
        }
    }

    /** userId của phiên hiện tại, hoặc null nếu thiếu / sai / hết hạn token. */
    public Long resolveUserId(HttpServletRequest request) {
        String token = extractToken(request);

        if (token == null) {
            return null;
        }

        Entry entry = tokens.get(token);
        Instant now = Instant.now();

        if (entry == null || entry.isExpired(now)) {
            tokens.remove(token);
            return null;
        }

        entry.lastAccess = now;
        return entry.userId;
    }

    @Scheduled(fixedDelay = 10 * 60 * 1000)
    public void purgeExpired() {
        Instant now = Instant.now();
        tokens.values().removeIf(entry -> entry.isExpired(now));
    }

    private static String extractToken(HttpServletRequest request) {
        String header = request.getHeader("Authorization");

        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            return null;
        }

        String token = header.substring(BEARER_PREFIX.length()).trim();
        return token.isEmpty() ? null : token;
    }
}
