package com.cinemamanagement.controller;

import com.cinemamanagement.request.CounterSalePreviewRequest;
import com.cinemamanagement.request.CounterSaleRequest;
import com.cinemamanagement.response.CounterSalePreviewResponse;
import com.cinemamanagement.response.CounterSaleResponse;
import com.cinemamanagement.service.CounterSaleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("api/counter-sales")
@RequiredArgsConstructor
public class CounterSaleController {
    private final CounterSaleService counterSaleService;

    @PostMapping
    public ResponseEntity<CounterSaleResponse> sellTickets(
            @RequestBody CounterSaleRequest request,
            @RequestParam Long employeeId
    ) {

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
