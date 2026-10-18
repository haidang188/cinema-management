package com.cinemamanagement.exception;

import com.cinemamanagement.controller.PromotionController;
import com.cinemamanagement.response.PromotionErrorResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

// Phải chạy trước GlobalExceptionHandler (vốn bắt RuntimeException) để giữ được map "errors"
// theo từng trường mà form khuyến mãi cần. Các lỗi khác để GlobalExceptionHandler xử lý.
@Order(Ordered.HIGHEST_PRECEDENCE)
@RestControllerAdvice(assignableTypes = PromotionController.class)
public class PromotionExceptionHandler {

    @ExceptionHandler(PromotionValidationException.class)
    public ResponseEntity<PromotionErrorResponse> handleValidation(
            PromotionValidationException ex
    ) {
        return ResponseEntity.badRequest().body(
                new PromotionErrorResponse(
                        ex.getMessage(),
                        ex.getErrors(),
                        LocalDateTime.now()
                )
        );
    }

    @ExceptionHandler(PromotionNotFoundException.class)
    public ResponseEntity<PromotionErrorResponse> handleNotFound(
            PromotionNotFoundException ex
    ) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                new PromotionErrorResponse(
                        ex.getMessage(),
                        Map.of("promotion", ex.getMessage()),
                        LocalDateTime.now()
                )
        );
    }
}
