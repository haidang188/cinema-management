package com.cinemamanagement.controller;

import com.cinemamanagement.request.CreateCounterOrderRequest;
import com.cinemamanagement.request.ParkCounterOrderRequest;
import com.cinemamanagement.response.CounterOrderResponse;
import com.cinemamanagement.service.CounterOrderService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * POST /api/counter-orders                    tạo đơn nháp {showtimeId}
 * GET  /api/counter-orders/{code}             xem đơn
 * POST /api/counter-orders/{code}/extend      +2 phút (tối đa 2 lần)
 * POST /api/counter-orders/{code}/park        tạm gác {customerName, customerPhone}
 * POST /api/counter-orders/{code}/resume      mở lại đơn tạm gác
 * POST /api/counter-orders/{code}/cancel      huỷ đơn, trả ghế
 * POST /api/counter-orders/{code}/group       bật đơn đoàn / bao rạp
 * GET  /api/counter-orders/parked             danh sách đơn đang tạm gác
 */
@RestController
@RequestMapping("/api/counter-orders")
@RequiredArgsConstructor
public class CounterOrderController {

    // TODO: lấy từ thông tin đăng nhập của nhân viên, giống EMPLOYEE_ID ở frontend.
    private static final Long EMPLOYEE_ID = 1L;

    private final CounterOrderService counterOrderService;

    @PostMapping
    public ResponseEntity<CounterOrderResponse> create(@RequestBody CreateCounterOrderRequest request) {
        return ResponseEntity.ok(counterOrderService.create(request.showtimeId(), EMPLOYEE_ID));
    }

    @GetMapping("/parked")
    public ResponseEntity<List<CounterOrderResponse>> parked() {
        return ResponseEntity.ok(counterOrderService.listParked());
    }

    @GetMapping("/{code}")
    public ResponseEntity<CounterOrderResponse> get(@PathVariable String code) {
        return ResponseEntity.ok(counterOrderService.get(code));
    }

    @PostMapping("/{code}/extend")
    public ResponseEntity<CounterOrderResponse> extend(@PathVariable String code) {
        return ResponseEntity.ok(counterOrderService.extend(code));
    }

    @PostMapping("/{code}/park")
    public ResponseEntity<CounterOrderResponse> park(
            @PathVariable String code,
            @RequestBody ParkCounterOrderRequest request
    ) {
        return ResponseEntity.ok(counterOrderService.park(code, request.customerName(), request.customerPhone()));
    }

    @PostMapping("/{code}/resume")
    public ResponseEntity<CounterOrderResponse> resume(@PathVariable String code) {
        return ResponseEntity.ok(counterOrderService.resume(code));
    }

    @PostMapping("/{code}/cancel")
    public ResponseEntity<CounterOrderResponse> cancel(@PathVariable String code) {
        return ResponseEntity.ok(counterOrderService.cancel(code));
    }

    @PostMapping("/{code}/group")
    public ResponseEntity<CounterOrderResponse> group(@PathVariable String code) {
        return ResponseEntity.ok(counterOrderService.enableGroup(code));
    }
}