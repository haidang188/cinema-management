package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Showtime;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.MovieRepository;
import com.cinemamanagement.repository.ShowtimeRepository;
import com.cinemamanagement.response.ShowtimeResponse;
import com.cinemamanagement.service.ShowtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ShowtimeServiceImpl implements ShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final MovieRepository movieRepository;

    @Override
    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimeByDate(LocalDate date) {
        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        List<Showtime> showtimes = showtimeRepository.findByStartTimeGreaterThanEqualAndStartTimeLessThan(
                startOfDay, endOfDay
        );
        return showtimes.stream().map(this::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ShowtimeResponse> getShowtimesByMovieAndDate(Long movieId, LocalDate date) {
        if (!movieRepository.existsById(movieId)) {
            throw new ResourceNotFoundException("Movie not found with id " + movieId);
        }

        LocalDateTime startOfDay = date.atStartOfDay();
        LocalDateTime endOfDay = date.plusDays(1).atStartOfDay();

        return showtimeRepository.findByMovieIdAndStartTimeBetween(movieId, startOfDay, endOfDay)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private ShowtimeResponse toResponse(Showtime showtime) {
        return new ShowtimeResponse(
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
