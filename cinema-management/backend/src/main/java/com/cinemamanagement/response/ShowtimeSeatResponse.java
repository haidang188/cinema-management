package com.cinemamanagement.response;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ShowtimeSeatResponse {

    private Long id;
    private Long seatId;
    private String rowLabel;
    private Integer seatNumber;
    private String seatType;
    private String status;
}
