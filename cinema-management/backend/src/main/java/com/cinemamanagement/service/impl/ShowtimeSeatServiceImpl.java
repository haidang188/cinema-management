package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.repository.ShowtimeSeatRepository;
import com.cinemamanagement.response.ShowtimeSeatResponse;
import com.cinemamanagement.service.ShowtimeSeatService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ShowtimeSeatServiceImpl implements ShowtimeSeatService {
    private final ShowtimeSeatRepository showtimeSeatRepository;
    @Override
    @Transactional(readOnly = true)
    public List<ShowtimeSeatResponse> getSeatsByShowtime(Long showtimeId) {
        return showtimeSeatRepository.findByShowtimeId(showtimeId)
                .stream()
                .map(showtimeSeat -> new ShowtimeSeatResponse(
                        showtimeSeat.getId(),
                        showtimeSeat.getSeat().getId(),
                        showtimeSeat.getSeat().getRowLabel(),
                        showtimeSeat.getSeat().getSeatNumber(),
                        showtimeSeat.getSeat().getSeatType(),
                        showtimeSeat.getStatus()
                ))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public ShowtimeSeat getShowtimeSeat(
            Long showtimeId,
            Long seatId
    ) {
        return showtimeSeatRepository.findByShowtimeIdAndSeatId(showtimeId, seatId).orElseThrow(() ->
                        new RuntimeException("Không tìm thấy ghế trong suất chiếu"));
    }

    @Override
    @Transactional
    public ShowtimeSeat getShowtimeSeatForUpdate(Long showtimeSeatId) {
        return showtimeSeatRepository.findByIdForUpdate(showtimeSeatId).orElseThrow(() ->
                        new RuntimeException("Không tìm thấy ghế suất chiếu"));
    }

    @Override
    @Transactional
    public ShowtimeSeat updateStatus(Long showtimeSeatId, String status) {
        ShowtimeSeat showtimeSeat = getShowtimeSeatForUpdate(showtimeSeatId);

        showtimeSeat.setStatus(status);

        return showtimeSeatRepository.save(showtimeSeat);
    }
}
