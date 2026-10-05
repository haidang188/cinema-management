package com.cinemamanagement.service.impl;

import com.cinemamanagement.config.properties.VnPayProperties;
import com.cinemamanagement.entity.Booking;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.service.VnPayService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.TreeMap;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class VnPayServiceImpl implements VnPayService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter VNPAY_TIME = DateTimeFormatter.ofPattern("yyyyMMddHHmmss");

    private final VnPayProperties properties;

    @Override
    public String createPaymentUrl(Booking booking, String clientIp) {
        if (!properties.isConfigured()) {
            throw new BadRequestException("VNPay Sandbox chưa được cấu hình");
        }

        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        TreeMap<String, String> params = new TreeMap<>();
        params.put("vnp_Version", properties.getVersion());
        params.put("vnp_Command", properties.getCommand());
        params.put("vnp_TmnCode", properties.getTmnCode());
        params.put("vnp_Amount", booking.getTotalAmount().movePointRight(2).toBigInteger().toString());
        params.put("vnp_CurrCode", properties.getCurrencyCode());
        params.put("vnp_TxnRef", booking.getBookingCode());
        params.put("vnp_OrderInfo", "Thanh toan ve " + booking.getBookingCode());
        params.put("vnp_OrderType", properties.getOrderType());
        params.put("vnp_Locale", properties.getLocale());
        params.put("vnp_ReturnUrl", properties.getReturnUrl());
        params.put("vnp_IpAddr", normalizeIp(clientIp));
        params.put("vnp_CreateDate", now.format(VNPAY_TIME));
        params.put("vnp_ExpireDate", booking.getPaymentDeadline().format(VNPAY_TIME));

        String query = buildQuery(params);
        return properties.getPayUrl() + "?" + query + "&vnp_SecureHash=" + hmacSha512(query);
    }

    @Override
    public boolean isValidReturn(Map<String, String> parameters) {
        String receivedHash = parameters.get("vnp_SecureHash");
        if (receivedHash == null || receivedHash.isBlank()) {
            return false;
        }

        TreeMap<String, String> signedParams = parameters.entrySet().stream()
                .filter(entry -> entry.getKey().startsWith("vnp_"))
                .filter(entry -> !"vnp_SecureHash".equals(entry.getKey()))
                .filter(entry -> !"vnp_SecureHashType".equals(entry.getKey()))
                .collect(Collectors.toMap(
                        Map.Entry::getKey,
                        Map.Entry::getValue,
                        (left, right) -> left,
                        TreeMap::new
                ));

        return receivedHash.equalsIgnoreCase(hmacSha512(buildQuery(signedParams)));
    }

    private String buildQuery(Map<String, String> params) {
        return params.entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isBlank())
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue()))
                .collect(Collectors.joining("&"));
    }

    private String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.US_ASCII)
                .replace("+", "%20");
    }

    private String hmacSha512(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(
                    properties.getHashSecret().getBytes(StandardCharsets.UTF_8),
                    "HmacSHA512"
            ));
            byte[] bytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder result = new StringBuilder(bytes.length * 2);
            for (byte value : bytes) {
                result.append(String.format("%02x", value));
            }
            return result.toString();
        } catch (Exception exception) {
            throw new IllegalStateException("Không thể tạo chữ ký VNPay", exception);
        }
    }

    private String normalizeIp(String clientIp) {
        if (clientIp == null || clientIp.isBlank() || "0:0:0:0:0:0:0:1".equals(clientIp)) {
            return "127.0.0.1";
        }
        return clientIp.contains(",") ? clientIp.substring(0, clientIp.indexOf(',')).trim() : clientIp;
    }
}
