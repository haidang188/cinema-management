package com.cinemamanagement.request;

import lombok.Getter;
import lombok.Setter;
import org.springframework.format.annotation.DateTimeFormat;

import java.time.LocalDate;

@Getter
@Setter
public class BookingSearchRequest {

    private String keyword;

    private String channel;

    private String status;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate showFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate showTo;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate createdFrom;

    @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
    private LocalDate createdTo;

    private Long movieId;

    private Long showtimeId;

    private String sort;

    private Integer page;

    private Integer size;
}