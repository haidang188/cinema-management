package com.cinemamanagement.service;

import com.cinemamanagement.repository.StatisticsRepository;
import com.cinemamanagement.response.StatisticsResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Locale;
import java.util.Set;

@Service
@Transactional(readOnly = true)
public class StatisticsService {
    private final StatisticsRepository repository;

    public StatisticsService(StatisticsRepository repository) {
        this.repository = repository;
    }

    public boolean isAdmin(long userId) {
        return repository.isAdmin(userId);
    }

    public StatisticsResponse getReport(
            String type,
            LocalDate from,
            LocalDate to,
            String channel,
            String sort
    ) {
        if (!Set.of("movies", "members", "genres").contains(type)) {
            throw new IllegalArgumentException(
                    "Loại thống kê không hợp lệ"
            );
        }

        if ((from != null
                && (from.getYear() < 1000 || from.getYear() > 9998))
                || (to != null
                && (to.getYear() < 1000 || to.getYear() > 9998))) {
            throw new IllegalArgumentException(
                    "Năm phải nằm trong khoảng 1000–9998"
            );
        }

        if (from != null && to != null && from.isAfter(to)) {
            throw new IllegalArgumentException(
                    "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc"
            );
        }

        channel = channel.trim().toUpperCase(Locale.ROOT);
        sort = sort.trim().toUpperCase(Locale.ROOT);

        if (!Set.of("ALL", "ONLINE", "COUNTER").contains(channel)) {
            throw new IllegalArgumentException(
                    "Kênh bán không hợp lệ"
            );
        }

        if (!Set.of("REVENUE", "TICKETS").contains(sort)) {
            throw new IllegalArgumentException(
                    "Cách sắp xếp không hợp lệ"
            );
        }

        return repository.load(
                type,
                from,
                to,
                channel,
                "genres".equals(type) ? "TICKETS" : sort
        );
    }
}