package com.cinemamanagement.exception;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.dao.OptimisticLockingFailureException;
import org.springframework.web.HttpRequestMethodNotSupportedException;
import org.springframework.web.servlet.resource.NoResourceFoundException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.HttpMediaTypeNotSupportedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.util.LinkedHashMap;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestControllerAdvice
public class GlobalExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    @ExceptionHandler(AuthValidationException.class)
    public ResponseEntity<ApiErrorResponse> handleAuthValidation(AuthValidationException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorResponse.withFieldErrors(
                        400,
                        "Bad Request",
                        exception.getMessage(),
                        exception.getFieldErrors()
                ));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<ApiErrorResponse> handleUnauthorized(UnauthorizedException exception) {
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                .body(ApiErrorResponse.of(401, "Unauthorized", exception.getMessage()));
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiErrorResponse> handleForbidden(ForbiddenException exception) {
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(ApiErrorResponse.of(403, "Forbidden", exception.getMessage()));
    }

    @ExceptionHandler(ResourceNotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(ResourceNotFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.of(404, "Not Found", exception.getMessage()));
    }

    @ExceptionHandler(BadRequestException.class)
    public ResponseEntity<ApiErrorResponse> handleBadRequest(BadRequestException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorResponse.of(400, "Bad Request", exception.getMessage()));
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(ConflictException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "Conflict", exception.getMessage()));
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
        Map<String, String> fieldErrors = new LinkedHashMap<>();
        exception.getBindingResult().getFieldErrors()
                .forEach(error -> fieldErrors.put(error.getField(), error.getDefaultMessage()));

        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorResponse.withFieldErrors(400, "Bad Request", "Validation failed", fieldErrors));
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    public ResponseEntity<ApiErrorResponse> handleMaxUploadSize(MaxUploadSizeExceededException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorResponse.of(400, "Bad Request", "Ảnh poster không được vượt quá 5MB"));
    }

    @ExceptionHandler(MissingServletRequestPartException.class)
    public ResponseEntity<ApiErrorResponse> handleMissingRequestPart(MissingServletRequestPartException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorResponse.of(400, "Bad Request", "Thiếu phần dữ liệu bắt buộc: " + exception.getRequestPartName()));
    }

    @ExceptionHandler(HttpMediaTypeNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMediaTypeNotSupported(HttpMediaTypeNotSupportedException exception) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(ApiErrorResponse.of(400, "Bad Request", "Định dạng dữ liệu gửi lên không được hỗ trợ"));
    }

    @ExceptionHandler(NoResourceFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNoResource(NoResourceFoundException exception) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(ApiErrorResponse.of(404, "Not Found", "Không tìm thấy đường dẫn API"));
    }

    @ExceptionHandler(HttpRequestMethodNotSupportedException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodNotSupported(HttpRequestMethodNotSupportedException exception) {
        return ResponseEntity.status(HttpStatus.METHOD_NOT_ALLOWED)
                .body(ApiErrorResponse.of(405, "Method Not Allowed", "Phương thức không được hỗ trợ"));
    }

    @ExceptionHandler(OptimisticLockingFailureException.class)
    public ResponseEntity<ApiErrorResponse> handleOptimisticLock(OptimisticLockingFailureException exception) {
        return ResponseEntity.status(HttpStatus.CONFLICT)
                .body(ApiErrorResponse.of(409, "Conflict", "Dữ liệu vừa được thay đổi ở nơi khác, vui lòng thử lại"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleUnexpected(Exception exception) {
        log.error("Unexpected API error", exception);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiErrorResponse.of(500, "Internal Server Error", "Đã có lỗi hệ thống, vui lòng thử lại sau"));
    }



    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<Map<String, String>> handleBadRequest(IllegalArgumentException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage());
    }

    @ExceptionHandler({MissingServletRequestParameterException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<Map<String, String>> handleBadParam(Exception ex) {
        return error(HttpStatus.BAD_REQUEST, "Tham số không hợp lệ: " + ex.getMessage());
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleConflict(DataIntegrityViolationException ex) {
        return error(HttpStatus.CONFLICT, "Dữ liệu bị trùng hoặc không hợp lệ, vui lòng thử lại.");
    }

    // Service bán vé đang ném RuntimeException cho lỗi nghiệp vụ (ghế đã bán, hết giờ bán...).
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleBusiness(RuntimeException ex) {
        return error(HttpStatus.BAD_REQUEST, ex.getMessage() != null ? ex.getMessage() : "Có lỗi xảy ra");
    }

    private ResponseEntity<Map<String, String>> error(HttpStatus status, String message) {
        return ResponseEntity.status(status).body(Map.of("message", message));
    }

    @ExceptionHandler(SeatConflictException.class)
    public ResponseEntity<Map<String, Object>> handleSeatConflict(SeatConflictException ex) {
        return ResponseEntity.status(HttpStatus.CONFLICT).body(Map.of(
                             "message", ex.getMessage(),
                             "seats", ex.getSeatCodes()
                      ));
    }
}
