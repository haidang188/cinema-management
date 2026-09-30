package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Showtime;
import com.cinemamanagement.repository.ShowtimeRepository;
import com.cinemamanagement.repository.ShowtimeSeatRepository;
import com.cinemamanagement.response.CounterShowtimeResponse;
import com.cinemamanagement.response.SeatSummaryResponse;
import com.cinemamanagement.service.CounterSaleShowtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CounterSaleShowtimeServiceImpl implements CounterSaleShowtimeService {

    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CounterShowtimeResponse> getShowtimesInRange(LocalDate from, LocalDate to) {

        if (from == null || to == null) {
            throw new IllegalArgumentException("Thiếu ngày bắt đầu hoặc ngày kết thúc");
        }

        if (to.isBefore(from)) {
            throw new IllegalArgumentException("Ngày kết thúc phải sau hoặc bằng ngày bắt đầu");
        }

        if (ChronoUnit.DAYS.between(from, to) + 1 > MAX_RANGE_DAYS) {
            throw new IllegalArgumentException("Chỉ xem tối đa " + MAX_RANGE_DAYS + " ngày mỗi lần");
        }

        return showtimeRepository
                .findAllStartingBetween(from.atStartOfDay(), to.plusDays(1).atStartOfDay())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<SeatSummaryResponse> getSeatSummaries(List<Long> showtimeIds) {

        if (showtimeIds == null || showtimeIds.isEmpty()) {
            return List.of();
        }

        Set<Long> ids = new LinkedHashSet<>(showtimeIds);
        ids.remove(null);

        if (ids.size() > MAX_SUMMARY_IDS) {
            throw new IllegalArgumentException("Tối đa " + MAX_SUMMARY_IDS + " suất chiếu mỗi lần");
        }

        Map<Long, SeatSummaryResponse> byId = new HashMap<>();

        showtimeSeatRepository.summarizeByShowtimeIds(ids).forEach(row -> byId.put(
                row.getShowtimeId(),
                new SeatSummaryResponse(
                        row.getShowtimeId(),
                        row.getTotal() == null ? 0 : row.getTotal(),
                        row.getAvailable() == null ? 0 : row.getAvailable()
                )
        ));

        return ids.stream()
                .map(id -> byId.getOrDefault(id, new SeatSummaryResponse(id, 0, 0)))
                .toList();
    }

    private CounterShowtimeResponse toResponse(Showtime showtime) {

        var movie = showtime.getMovie();
        var room = showtime.getRoom();

        return new CounterShowtimeResponse(
                showtime.getId(),
                movie.getId(),
                movie.getTitle(),
                movie.getPosterUrl(),
                movie.getAgeRating(),
                movie.getDurationMinutes(),
                movie.getLanguage(),
                room.getId(),
                room.getName(),
                room.getRoomType(),
                showtime.getFormat(),
                showtime.getStatus(),
                showtime.getStartTime(),
                showtime.getEndTime()
        );
    }
}