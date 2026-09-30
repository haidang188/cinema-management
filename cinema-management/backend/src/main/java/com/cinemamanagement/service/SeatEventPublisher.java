package com.cinemamanagement.service;

import com.cinemamanagement.entity.ShowtimeSeat;

import java.util.Collection;

public interface SeatEventPublisher {

    void publishAfterCommit(Long showtimeId, Collection<ShowtimeSeat> seats);

    static String topic(Long showtimeId) {
        return "/topic/showtimes/" + showtimeId + "/seats";
    }
}
