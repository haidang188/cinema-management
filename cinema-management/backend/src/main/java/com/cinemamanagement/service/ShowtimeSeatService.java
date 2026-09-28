package com.cinemamanagement.service;

import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.response.ShowtimeSeatResponse;

import java.util.List;

public interface ShowtimeSeatService {

    List<ShowtimeSeatResponse> getSeatsByShowtime(Long showtimeId);

    ShowtimeSeat getShowtimeSeat(Long showtimeId, Long seatId);

    ShowtimeSeat getShowtimeSeatForUpdate(Long showtimeSeatId);

    ShowtimeSeat updateStatus(Long showtimeSeatId, String status);
}
