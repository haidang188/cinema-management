package com.cinemamanagement.controller;

import com.cinemamanagement.request.CounterSalePreviewRequest;
import com.cinemamanagement.request.CounterSaleRequest;
import com.cinemamanagement.response.CounterSalePreviewResponse;
import com.cinemamanagement.response.CounterSaleResponse;
import com.cinemamanagement.service.CounterSaleService;
import com.cinemamanagement.util.SessionEmployeeResolver;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/counter-sales")
@RequiredArgsConstructor
public class CounterSaleController {
    private final CounterSaleService counterSaleService;
    private final SessionEmployeeResolver sessionEmployeeResolver;

    @PostMapping
    public ResponseEntity<CounterSaleResponse> sellTickets(
            @RequestBody CounterSaleRequest request,
            HttpServletRequest httpRequest
    ) {
        Long employeeId = sessionEmployeeResolver.requireEmployeeId(httpRequest);
        CounterSaleResponse response = counterSaleService.sellTickets(request, employeeId);

        return ResponseEntity.ok(response);
    }

    @PostMapping("/preview")
    public ResponseEntity<CounterSalePreviewResponse> previewSale(
            @RequestBody CounterSalePreviewRequest request
    ) {
        return ResponseEntity.ok(counterSaleService.previewSale(request));
    }
}
