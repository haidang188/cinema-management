package com.cinemamanagement.controller;

import com.cinemamanagement.entity.Promotion;
import com.cinemamanagement.repository.CustomerPromotionRepository;
import com.cinemamanagement.response.CustomerPromotionResponse;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@RestController
@RequestMapping("/api/promotions")
@CrossOrigin(
        origins = {
                "http://localhost:5173",
                "http://127.0.0.1:5173"
        }
)
@Transactional(readOnly = true)
public class CustomerPromotionController {

    private final CustomerPromotionRepository repository;

    public CustomerPromotionController(
            CustomerPromotionRepository repository
    ) {
        this.repository = repository;
    }

    public record PromotionListResponse(
            List<CustomerPromotionResponse> content,
            int page,
            int size,
            long totalElements,
            int totalPages
    ) {
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> handleStatus(
            ResponseStatusException ex
    ) {
        String message = ex.getReason() == null
                ? "Yêu cầu không hợp lệ."
                : ex.getReason();

        return ResponseEntity
                .status(ex.getStatusCode())
                .body(Map.of("message", message));
    }

    @GetMapping
    public PromotionListResponse list(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        String filter = status == null || status.isBlank()
                ? null
                : status.trim().toUpperCase(Locale.ROOT);

        if (filter != null
                && !List.of("ACTIVE", "UPCOMING").contains(filter)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Bộ lọc không hợp lệ."
            );
        }

        String search = keyword == null || keyword.isBlank()
                ? null
                : keyword.trim();

        LocalDateTime now = LocalDateTime.now();

        var result = repository.findVisible(
                search,
                filter,
                now,
                PageRequest.of(
                        Math.max(0, page),
                        Math.min(100, Math.max(1, size)),
                        Sort.by(Sort.Direction.DESC, "id")
                )
        );

        return new PromotionListResponse(
                result.getContent()
                        .stream()
                        .map(p -> CustomerPromotionResponse.from(p, now))
                        .toList(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages()
        );
    }

    @GetMapping("/{id}")
    public CustomerPromotionResponse detail(
            @PathVariable Long id
    ) {
        LocalDateTime now = LocalDateTime.now();

        Promotion promotion = repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Không tìm thấy khuyến mãi."
                ));

        boolean inactive =
                "INACTIVE".equalsIgnoreCase(promotion.getStatus());

        boolean invalidDates =
                promotion.getStartDate() == null
                        || promotion.getEndDate() == null;

        boolean expired =
                promotion.getEndDate() != null
                        && promotion.getEndDate().isBefore(now);

        int usedCount = promotion.getUsedCount() == null
                ? 0
                : promotion.getUsedCount();

        boolean full =
                promotion.getUsageLimit() != null
                        && usedCount >= promotion.getUsageLimit();

        if (inactive || invalidDates || expired || full) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND,
                    "Khuyến mãi không còn được công bố."
            );
        }

        return CustomerPromotionResponse.from(promotion, now);
    }
}