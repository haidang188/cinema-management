package com.cinemamanagement.controller;

import com.cinemamanagement.service.StatisticsService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/statistics")
public class StatisticsController {
    private final StatisticsService service;

    public StatisticsController(StatisticsService service) {
        this.service = service;
    }

    @GetMapping("/{type}")
    public ResponseEntity<?> getReport(
            @PathVariable String type,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate from,

            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate to,

            @RequestParam(defaultValue = "ALL")
            String channel,

            @RequestParam(defaultValue = "REVENUE")
            String sort,

            HttpServletRequest request
    ) {
        var session = request.getSession(false);

        Object userId = session == null
                ? null
                : session.getAttribute(AuthController.SESSION_USER_ID);

        if (!(userId instanceof Long id)) {
            return ResponseEntity.status(401).body(Map.of(
                    "message",
                    "Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại."
            ));
        }

        if (!service.isAdmin(id)) {
            return ResponseEntity.status(403).body(Map.of(
                    "message",
                    "Chỉ quản trị viên được xem thống kê."
            ));
        }

        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(service.getReport(type, from, to, channel, sort));
    }
}