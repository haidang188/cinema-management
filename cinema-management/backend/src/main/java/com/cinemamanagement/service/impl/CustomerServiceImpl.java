package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Customer;
import com.cinemamanagement.repository.CustomerRepository;
import com.cinemamanagement.response.CustomerLookupResponse;
import com.cinemamanagement.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;

    @Override
    @Transactional(readOnly = true)
    public CustomerLookupResponse lookup(String phone) {

        String normalized = CustomerService.normalizePhone(phone);

        if (normalized == null) {
            return new CustomerLookupResponse(false, null, null, null, 0);
        }

        return customerRepository.findByPhone(normalized)
                .map(c -> new CustomerLookupResponse(true, c.getId(), c.getPhone(), c.getFullName(), c.getVisitCount()))
                .orElse(new CustomerLookupResponse(false, null, normalized, null, 0));
    }

    @Override
    @Transactional
    public Customer recordPurchase(String fullName, String phone) {

        LocalDateTime now = LocalDateTime.now();

        Customer customer = customerRepository.findByPhone(phone).orElseGet(() -> {
            Customer created = new Customer();
            created.setPhone(phone);
            created.setCreatedAt(now);
            return created;
        });

        if (fullName != null) {
            customer.setFullName(fullName);
        }

        customer.setVisitCount(customer.getVisitCount() + 1);
        customer.setLastVisitAt(now);

        return customerRepository.save(customer);
    }
}