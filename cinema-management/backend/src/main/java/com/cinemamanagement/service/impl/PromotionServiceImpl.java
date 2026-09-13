package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Promotion;
import com.cinemamanagement.exception.PromotionNotFoundException;
import com.cinemamanagement.exception.PromotionValidationException;
import com.cinemamanagement.repository.PromotionRepository;
import com.cinemamanagement.request.PromotionCreateRequest;
import com.cinemamanagement.response.PromotionResponse;
import com.cinemamanagement.response.PromotionStatisticsResponse;
import com.cinemamanagement.service.PromotionImageStorageService;
import com.cinemamanagement.service.PromotionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;

@Service
public class PromotionServiceImpl implements PromotionService {

    private static final Set<String> DISCOUNT_TYPES = Set.of("FIXED", "PERCENTAGE");
    private static final Set<String> FILTER_STATUSES = Set.of("ACTIVE", "UPCOMING", "EXPIRED", "INACTIVE");
    private static final BigDecimal MAX_FIXED_DISCOUNT = new BigDecimal("5000000");
    private static final BigDecimal MAX_PERCENTAGE = new BigDecimal("100");
    private static final int MAX_DESCRIPTION_LENGTH = 2000;

    private final PromotionRepository promotionRepository;
    private final PromotionImageStorageService imageStorageService;

    public PromotionServiceImpl(
            PromotionRepository promotionRepository,
            PromotionImageStorageService imageStorageService) {
        this.promotionRepository = promotionRepository;
        this.imageStorageService = imageStorageService;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PromotionResponse> getPromotions(
            String keyword,
            String status,
            String discountType,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable) {
        String normalizedKeyword = trimToNull(keyword);
        String normalizedStatus = normalizeUpper(status);
        String normalizedDiscountType = normalizeUpper(discountType);

        if (normalizedStatus != null && !FILTER_STATUSES.contains(normalizedStatus)) {
            normalizedStatus = null;
        }

        if (normalizedDiscountType != null && !DISCOUNT_TYPES.contains(normalizedDiscountType)) {
            normalizedDiscountType = null;
        }

        return promotionRepository
                .search(
                        normalizedKeyword,
                        normalizedStatus,
                        normalizedDiscountType,
                        fromDate,
                        toDate,
                        LocalDateTime.now(),
                        pageable)
                .map(this::toResponse);
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionResponse getPromotion(Long id) {
        Promotion promotion = promotionRepository.findById(id)
                .orElseThrow(() -> new PromotionNotFoundException(
                        "Khong tim thay khuyen mai co ID " + id));

        return toResponse(promotion);
    }

    @Override
    @Transactional(readOnly = true)
    public PromotionStatisticsResponse getStatistics() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime sevenDaysLater = now.plusDays(7);

        return new PromotionStatisticsResponse(
                promotionRepository.count(),
                promotionRepository.countActive(now),
                promotionRepository.countUpcoming(now),
                promotionRepository.countExpired(now),
                promotionRepository.countInactive(),
                promotionRepository.countExpiringSoon(now, sevenDaysLater));
    }

    @Override
    @Transactional
    public PromotionResponse createPromotion(PromotionCreateRequest request) {
        validate(request);

        String imageUrl = imageStorageService.save(request.getImage());

        try {
            Promotion promotion = new Promotion();

            promotion.setTitle(request.getTitle().trim());
            promotion.setDescription(request.getDescription().trim());
            promotion.setImageUrl(imageUrl);
            promotion.setCode(request.getCode().trim().toUpperCase(Locale.ROOT));
            promotion.setStartDate(request.getStartDate());
            promotion.setEndDate(request.getEndDate());
            promotion.setDiscountType(request.getDiscountType().trim().toUpperCase(Locale.ROOT));
            promotion.setDiscountValue(request.getDiscountValue());
            promotion.setMinOrderAmount(defaultZero(request.getMinOrderAmount()));
            promotion.setMaxDiscountAmount(request.getMaxDiscountAmount());
            promotion.setUsageLimit(request.getUsageLimit());
            promotion.setUsedCount(0);

            // Status được suy ra động từ thời gian và giới hạn sử dụng.
            // Chỉ giá trị INACTIVE trong DB mới được xem là trạng thái tắt thủ công.
            promotion.setStatus(null);

            return toResponse(promotionRepository.save(promotion));

        } catch (RuntimeException ex) {
            imageStorageService.deleteQuietly(imageUrl);
            throw ex;
        }
    }

    private void validate(PromotionCreateRequest request) {
        Map<String, String> errors = new TreeMap<>();

        if (request == null) {
            errors.put("promotion", "Du lieu khuyen mai khong duoc de trong");
        } else {
            String title = trimToNull(request.getTitle());
            String code = trimToNull(request.getCode());
            String description = trimToNull(request.getDescription());
            String discountType = normalizeUpper(request.getDiscountType());

            if (title == null) {
                errors.put("title", "Tieu de khong duoc de trong");
            } else if (title.length() > 150) {
                errors.put("title", "Tieu de khong duoc vuot qua 150 ky tu");
            }

            if (code == null) {
                errors.put("code", "Ma khuyen mai khong duoc de trong");
            } else if (code.length() > 50) {
                errors.put("code", "Ma khuyen mai khong duoc vuot qua 50 ky tu");
            } else if (!code.matches("[A-Za-z0-9_-]+")) {
                errors.put("code", "Ma khuyen mai chi gom chu, so, dau gach ngang hoac gach duoi");
            } else if (promotionRepository.existsByCodeIgnoreCase(code)) {
                errors.put("code", "Ma khuyen mai da ton tai");
            }

            if (description == null) {
                errors.put("description", "Chi tiet khong duoc de trong");
            } else if (description.length() > MAX_DESCRIPTION_LENGTH) {
                errors.put("description", "Chi tiet khong duoc vuot qua 2000 ky tu");
            }

            if (request.getStartDate() == null) {
                errors.put("startDate", "Thoi gian bat dau khong duoc de trong");
            } else if (request.getStartDate().isBefore(LocalDateTime.now().minusMinutes(1))) {
                errors.put("startDate", "Thoi gian bat dau khong duoc nam trong qua khu");
            }

            if (request.getEndDate() == null) {
                errors.put("endDate", "Thoi gian ket thuc khong duoc de trong");
            }

            if (request.getStartDate() != null
                    && request.getEndDate() != null
                    && !request.getEndDate().isAfter(request.getStartDate())) {
                errors.put("endDate", "Thoi gian ket thuc phai sau thoi gian bat dau");
            }

            if (discountType == null || !DISCOUNT_TYPES.contains(discountType)) {
                errors.put("discountType", "Vui long chon loai giam gia hop le");
            }

            BigDecimal discountValue = request.getDiscountValue();
            if (discountValue == null) {
                errors.put("discountValue", "Muc giam gia khong duoc de trong");
            } else if (discountValue.compareTo(BigDecimal.ZERO) <= 0) {
                errors.put("discountValue", "Muc giam gia phai lon hon 0");
            } else if ("PERCENTAGE".equals(discountType)
                    && discountValue.compareTo(MAX_PERCENTAGE) > 0) {
                errors.put("discountValue", "Muc giam theo phan tram khong duoc vuot qua 100%");
            } else if ("FIXED".equals(discountType)
                    && discountValue.compareTo(MAX_FIXED_DISCOUNT) > 0) {
                errors.put("discountValue", "Muc giam co dinh khong duoc vuot qua 5.000.000 VNĐ");
            }

            BigDecimal minOrderAmount = request.getMinOrderAmount();
            if (minOrderAmount != null && minOrderAmount.compareTo(BigDecimal.ZERO) < 0) {
                errors.put("minOrderAmount", "Gia tri don toi thieu khong duoc am");
            }

            BigDecimal maxDiscountAmount = request.getMaxDiscountAmount();
            if (maxDiscountAmount != null && maxDiscountAmount.compareTo(BigDecimal.ZERO) <= 0) {
                errors.put("maxDiscountAmount", "Muc giam toi da phai lon hon 0");
            }

            if (request.getUsageLimit() != null && request.getUsageLimit() <= 0) {
                errors.put("usageLimit", "Gioi han su dung phai lon hon 0");
            }

            if (request.getImage() == null || request.getImage().isEmpty()) {
                errors.put("image", "Vui long chon anh khuyen mai");
            }
        }

        if (!errors.isEmpty()) {
            throw new PromotionValidationException("Du lieu khong hop le", errors);
        }
    }

    private PromotionResponse toResponse(Promotion promotion) {
        return new PromotionResponse(
                promotion.getId(),
                promotion.getTitle(),
                promotion.getDescription(),
                promotion.getImageUrl(),
                promotion.getCode(),
                promotion.getDiscountType(),
                promotion.getDiscountValue(),
                promotion.getMinOrderAmount(),
                promotion.getMaxDiscountAmount(),
                promotion.getUsageLimit(),
                promotion.getUsedCount(),
                promotion.getStartDate(),
                promotion.getEndDate(),
                calculateStatus(promotion));
    }

    private String calculateStatus(Promotion promotion) {
        if ("INACTIVE".equalsIgnoreCase(promotion.getStatus())) {
            return "INACTIVE";
        }

        int usedCount = promotion.getUsedCount() == null ? 0 : promotion.getUsedCount();
        if (promotion.getUsageLimit() != null && usedCount >= promotion.getUsageLimit()) {
            return "INACTIVE";
        }

        LocalDateTime now = LocalDateTime.now();

        if (promotion.getStartDate() != null && now.isBefore(promotion.getStartDate())) {
            return "UPCOMING";
        }

        if (promotion.getEndDate() != null && now.isAfter(promotion.getEndDate())) {
            return "EXPIRED";
        }

        return "ACTIVE";
    }

    private BigDecimal defaultZero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }

    private String normalizeUpper(String value) {
        String normalized = trimToNull(value);
        return normalized == null ? null : normalized.toUpperCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }
        return value.trim();
    }
}
