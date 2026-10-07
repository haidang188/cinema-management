package com.cinemamanagement.controller;

import com.cinemamanagement.response.PromotionQuote;
import com.cinemamanagement.service.PromotionApplyService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/counter-sales/promotions")
@RequiredArgsConstructor
public class CounterPromotionController {

    private final PromotionApplyService promotionApplyService;

    @GetMapping
    public ResponseEntity<List<PromotionQuote>> applicable(@RequestParam BigDecimal orderAmount) {
        return ResponseEntity.ok(promotionApplyService.listApplicable(orderAmount));
    }

    @GetMapping("/check")
    public ResponseEntity<PromotionQuote> check(
            @RequestParam String code,
            @RequestParam BigDecimal orderAmount
    ) {
        return ResponseEntity.ok(promotionApplyService.quote(code, orderAmount));
    }
}