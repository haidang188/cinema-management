package com.cinemamanagement.request;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
public class CounterSalePreviewRequest {

    private Long showtimeId;

    private List<Long> showtimeSeatIds;
}