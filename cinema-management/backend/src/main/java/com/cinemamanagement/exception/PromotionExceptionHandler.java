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
