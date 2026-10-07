package com.cinemamanagement.service;

import com.cinemamanagement.request.PromotionCreateRequest;
import com.cinemamanagement.request.PromotionUpdateRequest;
import com.cinemamanagement.response.PromotionResponse;
import com.cinemamanagement.response.PromotionStatisticsResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.time.LocalDateTime;

public interface PromotionService {

    Page<PromotionResponse> getPromotions(
            String keyword,
            String status,
            String discountType,
            LocalDateTime fromDate,
            LocalDateTime toDate,
            Pageable pageable
    );

    PromotionResponse getPromotion(Long id);

    PromotionStatisticsResponse getStatistics();

    PromotionResponse createPromotion(PromotionCreateRequest request);

    PromotionResponse updatePromotion(Long id, PromotionUpdateRequest request);

    void deletePromotion(Long id);

    PromotionResponse setEnabled(Long id, boolean enabled);
}