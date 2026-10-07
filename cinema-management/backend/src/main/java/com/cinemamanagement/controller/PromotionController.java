package com.cinemamanagement.controller;

import com.cinemamanagement.request.PromotionCreateRequest;
import com.cinemamanagement.request.PromotionUpdateRequest;
import com.cinemamanagement.response.PromotionPageResponse;
import com.cinemamanagement.response.PromotionResponse;
import com.cinemamanagement.response.PromotionStatisticsResponse;
import com.cinemamanagement.service.PromotionService;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        }
)
@RestController
@RequestMapping("/api/admin/promotions")
public class PromotionController {

    private final PromotionService promotionService;

    public PromotionController(PromotionService promotionService) {
        this.promotionService = promotionService;
    }

    @GetMapping
    public PromotionPageResponse getPromotions(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String discountType,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime fromDate,
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
            LocalDateTime toDate,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);

        Pageable pageable = PageRequest.of(
                safePage,
                safeSize,
                Sort.by(Sort.Direction.DESC, "id")
        );

        return PromotionPageResponse.from(
                promotionService.getPromotions(
                        keyword,
                        status,
                        discountType,
                        fromDate,
                        toDate,
                        pageable
                )
        );
    }

    @GetMapping("/statistics")
    public PromotionStatisticsResponse getStatistics() {
        return promotionService.getStatistics();
    }

    @GetMapping("/{id}")
    public PromotionResponse getPromotion(@PathVariable Long id) {
        return promotionService.getPromotion(id);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public PromotionResponse createPromotion(
            @ModelAttribute PromotionCreateRequest request
    ) {
        return promotionService.createPromotion(request);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public PromotionResponse updatePromotion(
            @PathVariable Long id,
            @ModelAttribute PromotionUpdateRequest request) {
        return promotionService.updatePromotion(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePromotion(@PathVariable Long id) {
        promotionService.deletePromotion(id);
    }

    @PatchMapping("/{id}/enabled")
    public PromotionResponse setEnabled(@PathVariable Long id, @RequestParam boolean enabled) {
        return promotionService.setEnabled(id, enabled);
    }
}
