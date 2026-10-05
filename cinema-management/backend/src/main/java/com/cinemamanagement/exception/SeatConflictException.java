package com.cinemamanagement.exception;

import java.util.List;

/** Ghế đã bị người khác giữ / bán. Trả HTTP 409 kèm danh sách ghế. */
public class SeatConflictException extends RuntimeException {

    private final List<String> seatCodes;

    public SeatConflictException(List<String> seatCodes) {
        super("Ghế " + String.join(", ", seatCodes) + " vừa được nơi khác chọn hoặc bán");
        this.seatCodes = seatCodes;
    }

    public List<String> getSeatCodes() {
        return seatCodes;
    }
}