package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Promotion;
import com.cinemamanagement.repository.PromotionRepository;
import com.cinemamanagement.response.PromotionQuote;
import com.cinemamanagement.service.PromotionApplyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

@Service
@RequiredArgsConstructor
public class PromotionApplyServiceImpl implements PromotionApplyService {

    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final PromotionRepository promotionRepository;

    @Override
    @Transactional(readOnly = true)
    public PromotionQuote quote(String code, BigDecimal orderAmount) {

        String normalized = normalizeCode(code);
        BigDecimal amount = orderAmount == null ? BigDecimal.ZERO : orderAmount;

        if (normalized == null) {
            return PromotionQuote.invalid(null, amount, "Chưa nhập mã giảm giá");
        }

        return promotionRepository.findByCodeIgnoreCase(normalized)
                .map(promotion -> evaluate(promotion, amount, LocalDateTime.now()))
                .orElseGet(() -> PromotionQuote.invalid(normalized, amount, "Mã giảm giá không tồn tại"));
    }

    @Override
    @Transactional
    public PromotionQuote redeem(String code, BigDecimal orderAmount) {

        PromotionQuote quote = quote(code, orderAmount);

        if (!quote.valid()) {
            throw new IllegalStateException(quote.message());
        }

        if (promotionRepository.incrementUsedCountIfAvailable(quote.promotionId()) == 0) {
            throw new IllegalStateException("Mã " + quote.code() + " vừa hết lượt sử dụng");
        }

        return quote;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PromotionQuote> listApplicable(BigDecimal orderAmount) {

        BigDecimal amount = orderAmount == null ? BigDecimal.ZERO : orderAmount;
        LocalDateTime now = LocalDateTime.now();

        return promotionRepository.findApplicable(now, amount).stream()
                .map(promotion -> evaluate(promotion, amount, now))
                .filter(PromotionQuote::valid)
                // Mã giảm nhiều nhất lên đầu cho nhân viên chọn.
                .sorted((a, b) -> b.discountAmount().compareTo(a.discountAmount()))
                .toList();
    }


    private PromotionQuote evaluate(Promotion p, BigDecimal orderAmount, LocalDateTime now) {

        String code = p.getCode();

        if ("INACTIVE".equalsIgnoreCase(p.getStatus())) {
            return PromotionQuote.invalid(code, orderAmount, "Mã " + code + " đã bị tắt");
        }

        int used = p.getUsedCount() == null ? 0 : p.getUsedCount();

        if (p.getUsageLimit() != null && used >= p.getUsageLimit()) {
            return PromotionQuote.invalid(code, orderAmount, "Mã " + code + " đã hết lượt sử dụng");
        }

        if (p.getStartDate() != null && now.isBefore(p.getStartDate())) {
            return PromotionQuote.invalid(code, orderAmount,
                    "Mã " + code + " bắt đầu áp dụng từ " + p.getStartDate().format(DATE_TIME));
        }

        if (p.getEndDate() != null && now.isAfter(p.getEndDate())) {
            return PromotionQuote.invalid(code, orderAmount, "Mã " + code + " đã hết hạn");
        }

        BigDecimal minOrder = p.getMinOrderAmount() == null ? BigDecimal.ZERO : p.getMinOrderAmount();

        if (orderAmount.compareTo(minOrder) < 0) {
            return PromotionQuote.invalid(code, orderAmount,
                    "Đơn chưa đạt giá trị tối thiểu " + money(minOrder) + " để dùng mã " + code);
        }

        BigDecimal discount = calculateDiscount(p, orderAmount);

        if (discount.signum() <= 0) {
            return PromotionQuote.invalid(code, orderAmount, "Mã " + code + " không giảm được cho đơn này");
        }

        return new PromotionQuote(
                true,
                p.getId(),
                code,
                p.getTitle(),
                p.getDiscountType(),
                p.getDiscountValue(),
                orderAmount,
                discount,
                orderAmount.subtract(discount),
                "Giảm " + money(discount)
        );
    }

    private BigDecimal calculateDiscount(Promotion p, BigDecimal orderAmount) {

        BigDecimal value = p.getDiscountValue() == null ? BigDecimal.ZERO : p.getDiscountValue();

        BigDecimal discount = "PERCENTAGE".equalsIgnoreCase(p.getDiscountType())
                ? orderAmount.multiply(value).divide(BigDecimal.valueOf(100), 0, RoundingMode.HALF_UP)
                : value;

        if (p.getMaxDiscountAmount() != null && discount.compareTo(p.getMaxDiscountAmount()) > 0) {
            discount = p.getMaxDiscountAmount();
        }

        // Không giảm quá tổng tiền vé.
        return discount.min(orderAmount).max(BigDecimal.ZERO);
    }

    private static String normalizeCode(String code) {
        if (code == null || code.isBlank()) {
            return null;
        }

        return code.trim().toUpperCase(Locale.ROOT);
    }

    private static String money(BigDecimal value) {
        return NumberFormat.getIntegerInstance(new Locale("vi", "VN")).format(value) + "đ";
    }
}