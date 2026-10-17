package com.cinemamanagement.util;

import java.time.LocalDateTime;

public final class ShowtimeRules {
    private ShowtimeRules() {}

    public static LocalDateTime endAt(
            LocalDateTime start,
            int durationMinutes
    ) {
        if (start == null || durationMinutes <= 0) {
            throw new IllegalArgumentException(
                    "Thời gian hoặc thời lượng phim không hợp lệ"
            );
        }

        return start.plusMinutes(durationMinutes);
    }

    public static boolean overlaps(
            LocalDateTime start,
            LocalDateTime end,
            LocalDateTime otherStart,
            LocalDateTime otherEnd,
            int turnaroundMinutes
    ) {
        return otherStart.isBefore(end.plusMinutes(turnaroundMinutes))
                && otherEnd.isAfter(start.minusMinutes(turnaroundMinutes));
    }
}