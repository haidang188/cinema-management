package com.cinemamanagement.controller;

import com.cinemamanagement.response.PromotionResponse;
import com.cinemamanagement.service.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/promotions")
@RequiredArgsConstructor
@CrossOrigin(origins = {"http://localhost:5173", "http://127.0.0.1:5173"})
public class PublicPromotionController {
    private final PromotionService promotionService;

    @GetMapping
    public List<PromotionResponse> getActivePromotions() {
        return promotionService.getPromotions(
                null, "ACTIVE", null, null, null,
                PageRequest.of(0, 100, Sort.by(Sort.Direction.ASC, "endDate")))
                .getContent();
    }
}
