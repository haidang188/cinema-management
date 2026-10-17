package com.cinemamanagement.repository;

import com.cinemamanagement.response.StatisticsResponse;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.Timestamp;
import java.time.LocalDate;

@Repository
public class StatisticsRepository {
    private final NamedParameterJdbcTemplate jdbc;

    public StatisticsRepository(NamedParameterJdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    public boolean isAdmin(long userId) {
        Long count = jdbc.queryForObject("""
                SELECT COUNT(*)
                FROM users u
                JOIN roles r ON r.id = u.role_id
                WHERE u.id = :id AND r.name = 'ADMIN'
                """,
                new MapSqlParameterSource("id", userId),
                Long.class);

        return count != null && count > 0;
    }

    public StatisticsResponse load(
            String type,
            LocalDate from,
            LocalDate to,
            String channel,
            String sort
    ) {
        var parameters = new MapSqlParameterSource();
        var filter = new StringBuilder();

        if (from != null) {
            filter.append(" AND p.paid_at >= :fromTime");
            parameters.addValue(
                    "fromTime",
                    Timestamp.valueOf(from.atStartOfDay())
            );
        }

        if (to != null) {
            filter.append(" AND p.paid_at < :toTime");
            parameters.addValue(
                    "toTime",
                    Timestamp.valueOf(to.plusDays(1).atStartOfDay())
            );
        }

        if (!"ALL".equals(channel)) {
            filter.append(" AND b.booking_type = :channel");
            parameters.addValue("channel", channel);
        }

        // Tổng hợp vé trước: mỗi booking chỉ còn một dòng khi cộng doanh thu.
        String base = """
                WITH ticket_counts AS (
                    SELECT bs.booking_id, COUNT(t.id) AS ticket_count
                    FROM booking_seats bs
                    JOIN tickets t ON t.booking_seat_id = bs.id
                    WHERE bs.status = 'ACTIVE'
                      AND t.status IN (
                          'ACTIVE', 'REDEEMED', 'USED', 'CHECKED_IN'
                      )
                    GROUP BY bs.booking_id
                ), valid_bookings AS (
                    SELECT b.id,
                           b.member_id,
                           s.movie_id,
                           p.amount,
                           tc.ticket_count
                    FROM bookings b
                    JOIN payments p ON p.booking_id = b.id
                    JOIN showtimes s ON s.id = b.showtime_id
                    JOIN ticket_counts tc ON tc.booking_id = b.id
                    WHERE b.status = 'CONFIRMED'
                      AND p.status = 'PAID'
                      AND p.paid_at IS NOT NULL
                """ + filter + ") ";

        String memberFilter = "members".equals(type)
                ? " WHERE v.member_id IS NOT NULL"
                : "";

        var summary = jdbc.queryForObject(base + """
                SELECT COALESCE(SUM(v.amount), 0) AS revenue,
                       COALESCE(SUM(v.ticket_count), 0) AS tickets,
                       COUNT(*) AS bookings,
                       COUNT(DISTINCT v.member_id) AS members,
                       (
                           SELECT COUNT(*)
                           FROM valid_bookings
                           WHERE member_id IS NULL
                       ) AS unlinked_bookings
                FROM valid_bookings v
                """ + memberFilter,
                parameters,
                (rs, index) -> new StatisticsResponse.Summary(
                        rs.getBigDecimal("revenue"),
                        rs.getLong("tickets"),
                        rs.getLong("bookings"),
                        rs.getLong("members"),
                        rs.getLong("unlinked_bookings")
                ));

        String group = switch (type) {
            case "movies" -> """
                    SELECT m.id AS id,
                           m.title AS name,
                           SUM(v.ticket_count) AS tickets,
                           SUM(v.amount) AS revenue,
                           0 AS points,
                           0 AS movie_count
                    FROM valid_bookings v
                    JOIN movies m ON m.id = v.movie_id
                    GROUP BY m.id, m.title
                    """;

            case "members" -> """
                    SELECT m.id AS id,
                           m.full_name AS name,
                           SUM(v.ticket_count) AS tickets,
                           SUM(v.amount) AS revenue,
                           COALESCE(m.point_balance, 0) AS points,
                           0 AS movie_count
                    FROM valid_bookings v
                    JOIN members m ON m.id = v.member_id
                    GROUP BY m.id, m.full_name, m.point_balance
                    """;

            case "genres" -> """
                    SELECT g.id AS id,
                           g.name,
                           SUM(v.ticket_count) AS tickets,
                           0 AS revenue,
                           0 AS points,
                           COUNT(DISTINCT v.movie_id) AS movie_count
                    FROM valid_bookings v
                    JOIN movie_genres mg ON mg.movie_id = v.movie_id
                    JOIN genres g ON g.id = mg.genre_id
                    GROUP BY g.id, g.name
                    """;

            default -> throw new IllegalArgumentException(
                    "Loại thống kê không hợp lệ"
            );
        };

        String order = "TICKETS".equals(sort)
                ? " ORDER BY tickets DESC, id ASC LIMIT 100"
                : " ORDER BY revenue DESC, tickets DESC, id ASC LIMIT 100";

        var rows = jdbc.query(
                base + group + order,
                parameters,
                (rs, index) -> new StatisticsResponse.Row(
                        rs.getLong("id"),
                        "members".equals(type)
                                ? "MB%06d".formatted(rs.getLong("id"))
                                : null,
                        rs.getString("name"),
                        rs.getLong("tickets"),
                        rs.getBigDecimal("revenue"),
                        "members".equals(type)
                                ? rs.getInt("points")
                                : null,
                        "genres".equals(type)
                                ? rs.getLong("movie_count")
                                : null
                )
        );

        return new StatisticsResponse(type, sort, summary, rows);
    }
}