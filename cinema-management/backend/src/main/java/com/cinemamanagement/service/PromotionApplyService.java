package com.cinemamanagement.service;

import com.cinemamanagement.response.PromotionQuote;

import java.math.BigDecimal;
import java.util.List;

public interface PromotionApplyService {


    PromotionQuote quote(String code, BigDecimal orderAmount);

    PromotionQuote redeem(String code, BigDecimal orderAmount);

    List<PromotionQuote> listApplicable(BigDecimal orderAmount);
}