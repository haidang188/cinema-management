package com.cinemamanagement.exception;

import com.cinemamanagement.controller.PromotionController;
import com.cinemamanagement.response.PromotionErrorResponse;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.Map;

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

    @ExceptionHandler(PromotionConflictException.class)
    public ResponseEntity<PromotionErrorResponse> handleConflict(PromotionConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                new PromotionErrorResponse(ex.getMessage(), Map.of("system", ex.getMessage()), LocalDateTime.now()));
    }

    @ExceptionHandler(org.springframework.dao.DataIntegrityViolationException.class)
    public ResponseEntity<PromotionErrorResponse> handleIntegrityConflict() {
        String message = "Không thể lưu hoặc xóa: mã khuyến mãi bị trùng hoặc khuyến mãi đang được tham chiếu. Vui lòng tải lại dữ liệu.";
        return ResponseEntity.status(HttpStatus.CONFLICT).body(
                new PromotionErrorResponse(message, Map.of("system", message), LocalDateTime.now()));
    }

    @ExceptionHandler(org.springframework.validation.BindException.class)
    public ResponseEntity<PromotionErrorResponse> handleBinding(org.springframework.validation.BindException ex) {
        Map<String, String> errors = new java.util.TreeMap<>();
        ex.getFieldErrors().forEach(error -> errors.put(error.getField(), "Giá trị không hợp lệ"));
        return ResponseEntity.badRequest().body(
                new PromotionErrorResponse("Dữ liệu không hợp lệ", errors, LocalDateTime.now()));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<PromotionErrorResponse> handleUnexpected(
            Exception ex
    ) {
        return ResponseEntity
                .status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(
                        new PromotionErrorResponse(
                                "Xu ly khuyen mai that bai",
                                Map.of(
                                        "system",
                                        "He thong khong the xu ly yeu cau luc nay"
                                ),
                                LocalDateTime.now()
                        )
                );
    }
}
