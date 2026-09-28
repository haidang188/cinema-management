package com.cinemamanagement.service;

import com.cinemamanagement.request.CounterSalePreviewRequest;
import com.cinemamanagement.request.CounterSaleRequest;
import com.cinemamanagement.response.CounterSalePreviewResponse;
import com.cinemamanagement.response.CounterSaleResponse;

public interface CounterSaleService  {
    CounterSaleResponse sellTickets(CounterSaleRequest request, Long employeeId);

    CounterSalePreviewResponse previewSale(CounterSalePreviewRequest request);
}
