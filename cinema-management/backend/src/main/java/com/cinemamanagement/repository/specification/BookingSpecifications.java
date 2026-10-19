package com.cinemamanagement.repository.specification;

import com.cinemamanagement.entity.Booking;
import com.cinemamanagement.entity.Ticket;
import com.cinemamanagement.request.BookingSearchRequest;
import jakarta.persistence.criteria.Expression;
import jakarta.persistence.criteria.Predicate;
import jakarta.persistence.criteria.Root;
import jakarta.persistence.criteria.Subquery;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public final class BookingSpecifications {

    private BookingSpecifications() {
    }

    public static Specification<Booking> fromRequest(BookingSearchRequest request) {
        List<Specification<Booking>> specs = new ArrayList<>();

        add(specs, keyword(request.getKeyword()));
        add(specs, channel(request.getChannel()));
        add(specs, status(request.getStatus()));
        add(specs, showBetween(request.getShowFrom(), request.getShowTo()));
        add(specs, createdBetween(request.getCreatedFrom(), request.getCreatedTo()));
        add(specs, movie(request.getMovieId()));
        add(specs, showtime(request.getShowtimeId()));

        return Specification.allOf(specs);
    }

    public static Specification<Booking> keyword(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }

        String keyword = raw.trim();
        String upper = keyword.toUpperCase(Locale.ROOT);
        String lower = keyword.toLowerCase(Locale.ROOT);
        String digits = normalizePhoneDigits(keyword);

        return (root, query, cb) -> {
            List<Predicate> any = new ArrayList<>();

            any.add(cb.like(cb.upper(root.get("bookingCode")), "%" + upper + "%"));
            any.add(cb.like(cb.lower(root.get("customerName")), "%" + lower + "%"));

            if (digits.length() >= 3) {
                any.add(cb.like(root.get("customerPhone"), "%" + digits + "%"));
            }

            // Mã vé: chỉ tìm khi từ khoá đủ dài để tránh quét cả bảng vé.
            if (upper.length() >= 4) {
                Subquery<Long> ticket = query.subquery(Long.class);
                Root<Ticket> t = ticket.from(Ticket.class);
                ticket.select(t.get("id")).where(
                        cb.equal(t.get("bookingSeat").get("booking"), root),
                        cb.like(cb.upper(t.get("ticketCode")), upper + "%")
                );
                any.add(cb.exists(ticket));
            }

            return cb.or(any.toArray(Predicate[]::new));
        };
    }

    public static Specification<Booking> channel(String channel) {
        if (channel == null || channel.isBlank() || "ALL".equalsIgnoreCase(channel)) {
            return null;
        }

        String value = channel.trim().toUpperCase(Locale.ROOT);
        return (root, query, cb) -> cb.equal(cb.upper(root.get("bookingType")), value);
    }

    public static Specification<Booking> status(String status) {
        if (status == null || status.isBlank() || "ALL".equalsIgnoreCase(status)) {
            return null;
        }

        String value = status.trim().toUpperCase(Locale.ROOT);
        return (root, query, cb) -> cb.equal(cb.upper(root.get("status")), value);
    }

    public static Specification<Booking> showBetween(LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            return null;
        }

        return (root, query, cb) -> {
            Expression<LocalDateTime> start = root.get("showtime").get("startTime");
            List<Predicate> range = new ArrayList<>();

            if (from != null) {
                range.add(cb.greaterThanOrEqualTo(start, from.atStartOfDay()));
            }

            if (to != null) {
                range.add(cb.lessThan(start, to.plusDays(1).atStartOfDay()));
            }

            return cb.and(range.toArray(Predicate[]::new));
        };
    }

    public static Specification<Booking> orderUpcomingFirst(LocalDateTime now) {
        return (root, query, cb) -> {
            Class<?> resultType = query.getResultType();

            if (resultType != Long.class && resultType != long.class) {
                Expression<LocalDateTime> start = root.get("showtime").get("startTime");
                Expression<Integer> isPast = cb.<Integer>selectCase()
                        .when(cb.lessThan(start, now), 1)
                        .otherwise(0);
                Expression<LocalDateTime> upcomingStart = cb.<LocalDateTime>selectCase()
                        .when(cb.greaterThanOrEqualTo(start, now), start)
                        .otherwise(cb.nullLiteral(LocalDateTime.class));

                query.orderBy(
                        cb.asc(isPast),
                        cb.asc(upcomingStart),
                        cb.desc(start),
                        cb.desc(root.get("id"))
                );
            }

            return null;
        };
    }

    public static Specification<Booking> createdBetween(LocalDate from, LocalDate to) {
        if (from == null && to == null) {
            return null;
        }

        return (root, query, cb) -> {
            List<Predicate> range = new ArrayList<>();

            if (from != null) {
                range.add(cb.greaterThanOrEqualTo(root.get("createdAt"), from.atStartOfDay()));
            }

            if (to != null) {
                range.add(cb.lessThan(root.get("createdAt"), to.plusDays(1).atStartOfDay()));
            }

            return cb.and(range.toArray(Predicate[]::new));
        };
    }

    public static Specification<Booking> movie(Long movieId) {
        if (movieId == null) {
            return null;
        }

        return (root, query, cb) -> cb.equal(root.get("showtime").get("movie").get("id"), movieId);
    }

    public static Specification<Booking> showtime(Long showtimeId) {
        if (showtimeId == null) {
            return null;
        }

        return (root, query, cb) -> cb.equal(root.get("showtime").get("id"), showtimeId);
    }


    private static void add(List<Specification<Booking>> specs, Specification<Booking> spec) {
        if (spec != null) {
            specs.add(spec);
        }
    }
    private static String normalizePhoneDigits(String raw) {
        String digits = raw.replaceAll("\\D", "");

        if (raw.trim().startsWith("+84") || (digits.startsWith("84") && digits.length() == 11)) {
            digits = "0" + digits.substring(2);
        }

        return digits;
    }
}