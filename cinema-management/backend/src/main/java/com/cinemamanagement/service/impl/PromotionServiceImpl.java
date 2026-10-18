package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Promotion;
import com.cinemamanagement.exception.PromotionNotFoundException;
import com.cinemamanagement.exception.PromotionValidationException;
import com.cinemamanagement.repository.PromotionRepository;
import com.cinemamanagement.request.PromotionCreateRequest;
import com.cinemamanagement.response.PromotionResponse;
import com.cinemamanagement.response.PromotionStatisticsResponse;
import com.cinemamanagement.service.CloudinaryService;
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

    private static final String PROMOTION_IMAGE_FOLDER = "cinema/promotions";
    private static final long MAX_IMAGE_SIZE = 5L * 1024L * 1024L;
    private static final Set<String> DISCOUNT_TYPES = Set.of("FIXED", "PERCENTAGE");
    private static final Set<String> FILTER_STATUSES = Set.of("ACTIVE", "UPCOMING", "EXPIRED", "INACTIVE");
    private static final Set<String> IMAGE_CONTENT_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private static final BigDecimal MAX_FIXED_DISCOUNT = new BigDecimal("5000000");
    private static final BigDecimal MAX_PERCENTAGE = new BigDecimal("100");
    private static final int MAX_DESCRIPTION_LENGTH = 2000;

    private final PromotionRepository promotionRepository;
    private final CloudinaryService cloudinaryService;

    public PromotionServiceImpl(
            PromotionRepository promotionRepository,
            CloudinaryService cloudinaryService) {
        this.promotionRepository = promotionRepository;
        this.cloudinaryService = cloudinaryService;
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
                        "Không tìm thấy khuyến mãi có ID " + id));

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

        String imageUrl = cloudinaryService.uploadImage(request.getImage(), PROMOTION_IMAGE_FOLDER);
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
    }

    private void validate(PromotionCreateRequest request) {
        Map<String, String> errors = new TreeMap<>();

        if (request == null) {
            errors.put("promotion", "Dữ liệu khuyến mãi không được để trống");
        } else {
            String title = trimToNull(request.getTitle());
            String code = trimToNull(request.getCode());
            String description = trimToNull(request.getDescription());
            String discountType = normalizeUpper(request.getDiscountType());

            if (title == null) {
                errors.put("title", "Tiêu đề không được để trống");
            } else if (title.length() > 150) {
                errors.put("title", "Tiêu đề không được vượt quá 150 ký tự");
            }

            if (code == null) {
                errors.put("code", "Mã khuyến mãi không được để trống");
            } else if (code.length() > 50) {
                errors.put("code", "Mã khuyến mãi không được vượt quá 50 ký tự");
            } else if (!code.matches("[A-Za-z0-9_-]+")) {
                errors.put("code", "Mã khuyến mãi chỉ gồm chữ, số, dấu gạch ngang hoặc gạch dưới");
            } else if (promotionRepository.existsByCodeIgnoreCase(code)) {
                errors.put("code", "Mã khuyến mãi đã tồn tại");
            }

            if (description == null) {
                errors.put("description", "Chi tiết không được để trống");
            } else if (description.length() > MAX_DESCRIPTION_LENGTH) {
                errors.put("description", "Chi tiết không được vượt quá 2000 ký tự");
            }

            if (request.getStartDate() == null) {
                errors.put("startDate", "Thời gian bắt đầu không được để trống");
            } else if (request.getStartDate().isBefore(LocalDateTime.now().minusMinutes(1))) {
                errors.put("startDate", "Thời gian bắt đầu không được nằm trong quá khứ");
            }

            if (request.getEndDate() == null) {
                errors.put("endDate", "Thời gian kết thúc không được để trống");
            }

            if (request.getStartDate() != null
                    && request.getEndDate() != null
                    && !request.getEndDate().isAfter(request.getStartDate())) {
                errors.put("endDate", "Thời gian kết thúc phải sau thời gian bắt đầu");
            }

            if (discountType == null || !DISCOUNT_TYPES.contains(discountType)) {
                errors.put("discountType", "Vui lòng chọn loại giảm giá hợp lệ");
            }

            BigDecimal discountValue = request.getDiscountValue();
            if (discountValue == null) {
                errors.put("discountValue", "Mức giảm giá không được để trống");
            } else if (discountValue.compareTo(BigDecimal.ZERO) <= 0) {
                errors.put("discountValue", "Mức giảm giá phải lớn hơn 0");
            } else if ("PERCENTAGE".equals(discountType)
                    && discountValue.compareTo(MAX_PERCENTAGE) > 0) {
                errors.put("discountValue", "Mức giảm theo phần trăm không được vượt quá 100%");
            } else if ("FIXED".equals(discountType)
                    && discountValue.compareTo(MAX_FIXED_DISCOUNT) > 0) {
                errors.put("discountValue", "Muc giam co dinh khong duoc vuot qua 5.000.000 VNĐ");
            }

            BigDecimal minOrderAmount = request.getMinOrderAmount();
            if (minOrderAmount != null && minOrderAmount.compareTo(BigDecimal.ZERO) < 0) {
                errors.put("minOrderAmount", "Giá trị đơn tối thiểu không được âm");
            }

            BigDecimal maxDiscountAmount = request.getMaxDiscountAmount();
            if (maxDiscountAmount != null && maxDiscountAmount.compareTo(BigDecimal.ZERO) <= 0) {
                errors.put("maxDiscountAmount", "Mức giảm tối đa phải lớn hơn 0");
            }

            if (request.getUsageLimit() != null && request.getUsageLimit() <= 0) {
                errors.put("usageLimit", "Giới hạn sử dụng phải lớn hơn 0");
            }

            if (request.getImage() == null || request.getImage().isEmpty()) {
                errors.put("image", "Vui lòng chọn ảnh khuyến mãi");
            } else if (request.getImage().getSize() > MAX_IMAGE_SIZE) {
                errors.put("image", "Ảnh khuyến mãi không được vượt quá 5MB");
            } else if (!IMAGE_CONTENT_TYPES.contains(request.getImage().getContentType())) {
                errors.put("image", "Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP");
            }
        }

        if (!errors.isEmpty()) {
            throw new PromotionValidationException("Dữ liệu không hợp lệ", errors);
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
