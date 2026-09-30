package com.cinemamanagement.controller;

import com.cinemamanagement.response.CustomerLookupResponse;
import com.cinemamanagement.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/** GET /api/customers/lookup?phone=0901234567 -> khách cũ (tự điền tên) hoặc found=false. */
@RestController
@RequestMapping("/api/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping("/lookup")
    public ResponseEntity<CustomerLookupResponse> lookup(@RequestParam String phone) {
        return ResponseEntity.ok(customerService.lookup(phone));
    }
}