package com.cinemamanagement.controller;

import com.cinemamanagement.request.AdminShowtimeBatchRequest;
import com.cinemamanagement.request.AdminShowtimeRequest;
import com.cinemamanagement.service.AdminShowtimeService;
import com.cinemamanagement.util.AuthTokenStore;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/showtimes")
public class AdminShowtimeController {
    private final AdminShowtimeService service;
    private final AuthTokenStore authTokenStore;

    public AdminShowtimeController(AdminShowtimeService service, AuthTokenStore authTokenStore) {
        this.service = service;
        this.authTokenStore = authTokenStore;
    }

    @GetMapping("/options")
    public ResponseEntity<?> options(
            HttpServletRequest request
    ) {
        var error = denied(request);

        return error != null
                ? error
                : ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.options());
    }

    @GetMapping
    public ResponseEntity<?> list(
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,

            @RequestParam(required = false)
            Long movieId,

            @RequestParam(required = false)
            Long roomId,

            @RequestParam(required = false)
            String status,

            @RequestParam(defaultValue = "0")
            int page,

            @RequestParam(defaultValue = "10")
            int size,

            HttpServletRequest request
    ) {
        var error = denied(request);

        return error != null
                ? error
                : ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.list(
                        from, to, movieId, roomId,
                        status, page, size
                ));
    }

    @PostMapping("/preview")
    public ResponseEntity<?> preview(
            @Valid @RequestBody AdminShowtimeRequest body,
            HttpServletRequest request
    ) {
        var error = denied(request);

        return error != null
                ? error
                : ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.preview(body));
    }

    @PostMapping
    public ResponseEntity<?> create(
            @Valid @RequestBody AdminShowtimeRequest body,
            HttpServletRequest request
    ) {
        var error = denied(request);

        return error != null
                ? error
                : ResponseEntity.status(201)
                .cacheControl(CacheControl.noStore())
                .body(service.create(body));
    }

    /** Lịch trong ngày của phòng và các giờ trống cho phim đã chọn. */
    @GetMapping("/availability")
    public ResponseEntity<?> availability(
            @RequestParam Long movieId,
            @RequestParam Long roomId,
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date,
            HttpServletRequest request
    ) {
        var error = denied(request);

        return error != null
                ? error
                : ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.availability(movieId, roomId, date));
    }

    /** Kiểm tra danh sách giờ thêm nhanh, không lưu. */
    @PostMapping("/batch/preview")
    public ResponseEntity<?> previewBatch(
            @Valid @RequestBody AdminShowtimeBatchRequest body,
            HttpServletRequest request
    ) {
        var error = denied(request);

        return error != null
                ? error
                : ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.previewBatch(body));
    }

    /** Thêm nhanh nhiều suất; lỗi một suất thì không lưu suất nào. */
    @PostMapping("/batch")
    public ResponseEntity<?> createBatch(
            @Valid @RequestBody AdminShowtimeBatchRequest body,
            HttpServletRequest request
    ) {
        var error = denied(request);

        return error != null
                ? error
                : ResponseEntity.status(201)
                .cacheControl(CacheControl.noStore())
                .body(service.createBatch(body));
    }

    private ResponseEntity<?> denied(
            HttpServletRequest request
    ) {
        Long id = authTokenStore.resolveUserId(request);

        if (id == null) {
            return ResponseEntity.status(401).body(Map.of(
                    "message",
                    "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
            ));
        }

        if (!service.isAdmin(id)) {
            return ResponseEntity.status(403).body(Map.of(
                    "message",
                    "Chỉ Admin được quản lý lịch chiếu."
            ));
        }

        return null;
    }
}