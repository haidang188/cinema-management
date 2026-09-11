package com.cinemamanagement.response;

import org.springframework.data.domain.Page;

import java.util.List;

public record PromotionPageResponse(
        List<PromotionResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages,
        boolean first,
        boolean last
) {

    public static PromotionPageResponse from(Page<PromotionResponse> result) {
        return new PromotionPageResponse(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.isFirst(),
                result.isLast()
        );
    }
}