package com.cinemamanagement.service;

import com.cinemamanagement.dto.ShowtimeDTO;
import com.cinemamanagement.entity.Showtime;
import com.cinemamanagement.repository.ShowtimeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShowtimeService {

    private final ShowtimeRepository showtimeRepository;

    public List<ShowtimeDTO> getShowtimeByDate(LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        List<Showtime> showtimes = showtimeRepository.findByStartTimeGreaterThanEqualAndStartTimeLessThan(
                startOfDay, endOfDay
        );
        return showtimes.stream().map(this::convertToDTO).toList();

    }
    private ShowtimeDTO convertToDTO(Showtime showtime) {
        return new ShowtimeDTO(
                showtime.getId(),

                showtime.getMovie().getId(),
                showtime.getMovie().getTitle(),
                showtime.getMovie().getPosterUrl(),
                showtime.getMovie().getDurationMinutes(),
                showtime.getMovie().getAgeRating(),

                showtime.getRoom().getId(),
                showtime.getRoom().getName(),
                showtime.getRoom().getRoomType(),
                showtime.getFormat(),

                showtime.getStartTime(),
                showtime.getEndTime(),
                showtime.getStatus()
        );
    }
}
