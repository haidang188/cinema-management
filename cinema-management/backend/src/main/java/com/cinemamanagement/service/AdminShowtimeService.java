package com.cinemamanagement.service;

import com.cinemamanagement.entity.*;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.ShowtimeSeatRepository;
import com.cinemamanagement.repository.TicketPriceRepository;
import com.cinemamanagement.request.AdminShowtimeRequest;
import com.cinemamanagement.response.AdminShowtimeResponse;
import com.cinemamanagement.util.ShowtimeRules;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import jakarta.persistence.TypedQuery;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service
@Transactional(readOnly = true)
public class AdminShowtimeService {
    private static final ZoneId ZONE =
            ZoneId.of("Asia/Ho_Chi_Minh");

    private static final DateTimeFormatter DISPLAY =
            DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final EntityManager em;
    private final ShowtimeSeatRepository seatRepository;
    private final TicketPriceRepository priceRepository;
    private final int gap;

    public AdminShowtimeService(
            EntityManager em,
            ShowtimeSeatRepository seatRepository,
            TicketPriceRepository priceRepository,
            @Value("${cinema.showtime.turnaround-minutes:15}") int gap
    ) {
        if (gap < 0 || gap > 180) {
            throw new IllegalArgumentException(
                    "Thời gian dọn phòng phải từ 0–180 phút"
            );
        }

        this.em = em;
        this.seatRepository = seatRepository;
        this.priceRepository = priceRepository;
        this.gap = gap;
    }

    public boolean isAdmin(long userId) {
        return em.createQuery("""
                        select count(u)
                        from User u
                        where u.id = :id
                          and u.role.name = 'ADMIN'
                        """, Long.class)
                .setParameter("id", userId)
                .getSingleResult() > 0;
    }

    public AdminShowtimeResponse.Options options() {
        var movies = em.createQuery("""
                        select m from Movie m
                        order by m.title, m.id
                        """, Movie.class)
                .getResultList()
                .stream()
                .map(m -> new AdminShowtimeResponse.MovieOption(
                        m.getId(),
                        m.getTitle(),
                        m.getDurationMinutes(),
                        m.getReleaseDate(),
                        m.getStatus()
                ))
                .toList();

        var rooms = em.createQuery("""
                        select r from CinemaRoom r
                        order by r.name, r.id
                        """, CinemaRoom.class)
                .getResultList()
                .stream()
                .map(r -> new AdminShowtimeResponse.RoomOption(
                        r.getId(),
                        r.getName(),
                        r.getRoomType(),
                        r.getStatus()
                ))
                .toList();

        var statuses = em.createQuery("""
                        select distinct s.status
                        from Showtime s
                        where s.status is not null
                        order by s.status
                        """, String.class)
                .getResultList();

        return new AdminShowtimeResponse.Options(
                movies,
                rooms,
                statuses,
                gap
        );
    }

    public AdminShowtimeResponse.Page list(
            LocalDate from,
            LocalDate to,
            Long movieId,
            Long roomId,
            String status,
            int page,
            int size
    ) {
        if (from == null
                || to == null
                || from.isAfter(to)
                || from.getYear() < 1000
                || to.getYear() > 9998
                || ChronoUnit.DAYS.between(from, to) > 365) {
            throw new BadRequestException(
                    "Khoảng ngày không hợp lệ; chọn tối đa 366 ngày"
            );
        }

        if (page < 0
                || page > 100000
                || !Set.of(10, 20, 50, 100).contains(size)) {
            throw new BadRequestException(
                    "Thông tin phân trang không hợp lệ"
            );
        }

        if ((movieId != null && movieId <= 0)
                || (roomId != null && roomId <= 0)) {
            throw new BadRequestException(
                    "Mã phim hoặc phòng không hợp lệ"
            );
        }

        Map<String, Object> params = new HashMap<>();
        params.put("fromTime", from.atStartOfDay());
        params.put("toTime", to.plusDays(1).atStartOfDay());

        String where = """
                 where s.startTime >= :fromTime
                   and s.startTime < :toTime
                """;

        if (movieId != null) {
            where += " and s.movie.id = :movieId";
            params.put("movieId", movieId);
        }

        if (roomId != null) {
            where += " and s.room.id = :roomId";
            params.put("roomId", roomId);
        }

        if (status != null && !status.isBlank()) {
            if (status.length() > 30) {
                throw new BadRequestException(
                        "Trạng thái không hợp lệ"
                );
            }

            where += " and s.status = :status";
            params.put("status", status.trim());
        }

        long total = bind(
                em.createQuery(
                        "select count(s) from Showtime s" + where,
                        Long.class
                ),
                params
        ).getSingleResult();

        int actualPage = total == 0
                ? 0
                : Math.min(page, (int) ((total - 1) / size));

        var shows = bind(
                em.createQuery("""
                        select s from Showtime s
                        join fetch s.movie
                        join fetch s.room
                        """ + where + " order by s.startTime, s.id",
                        Showtime.class),
                params
        )
                .setFirstResult(actualPage * size)
                .setMaxResults(size)
                .getResultList();

        Map<Long, Long> counts = new HashMap<>();

        if (!shows.isEmpty()) {
            seatRepository.summarizeByShowtimeIds(
                    shows.stream().map(Showtime::getId).toList()
            ).forEach(s -> counts.put(
                    s.getShowtimeId(),
                    s.getTotal() == null ? 0L : s.getTotal()
            ));
        }

        return new AdminShowtimeResponse.Page(
                shows.stream()
                        .map(s -> row(
                                s,
                                counts.getOrDefault(s.getId(), 0L)
                        ))
                        .toList(),
                total,
                actualPage,
                size,
                (int) Math.ceil((double) total / size)
        );
    }

    public AdminShowtimeResponse.Preview preview(
            AdminShowtimeRequest request
    ) {
        Plan plan = plan(request, false);

        return new AdminShowtimeResponse.Preview(
                plan.end(),
                plan.end().plusMinutes(gap),
                gap,
                plan.seats().size()
        );
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AdminShowtimeResponse create(
            AdminShowtimeRequest request
    ) {
        Plan plan = plan(request, true);

        Showtime show = new Showtime();
        show.setMovie(plan.movie());
        show.setRoom(plan.room());
        show.setStartTime(request.startTime());
        show.setEndTime(plan.end());

        show.setFormat(
                request.format() == null || request.format().isBlank()
                        ? null
                        : request.format().trim()
        );

        show.setStatus("OPEN");
        show.setCreatedAt(LocalDateTime.now(ZONE));

        em.persist(show);

        for (Seat seat : plan.seats()) {
            ShowtimeSeat item = new ShowtimeSeat();
            item.setShowtime(show);
            item.setSeat(seat);
            item.setStatus("AVAILABLE");

            em.persist(item);
        }

        em.flush();

        return row(show, plan.seats().size());
    }

    private Plan plan(
            AdminShowtimeRequest request,
            boolean lockRoom
    ) {
        LocalDateTime start = request.startTime();

        if (start == null
                || start.getYear() < 1000
                || start.getYear() > 9998
                || !start.isAfter(
                LocalDateTime.now(ZONE).plusMinutes(5)
        )) {
            throw new BadRequestException(
                    "Suất mới phải bắt đầu sau hiện tại ít nhất 5 phút, theo giờ Việt Nam"
            );
        }

        // Các lệnh tạo lịch cho cùng phòng phải chờ nhau trước khi kiểm tra trùng.
        CinemaRoom room = lockRoom
                ? em.find(
                CinemaRoom.class,
                request.roomId(),
                LockModeType.PESSIMISTIC_WRITE
        )
                : em.find(CinemaRoom.class, request.roomId());

        if (room == null) {
            throw new ResourceNotFoundException(
                    "Không tìm thấy phòng chiếu"
            );
        }

        if (!"ACTIVE".equals(room.getStatus())) {
            throw new BadRequestException(
                    "Phòng chiếu không hoạt động"
            );
        }

        Movie movie = em.find(Movie.class, request.movieId());

        if (movie == null) {
            throw new ResourceNotFoundException(
                    "Không tìm thấy phim"
            );
        }

        if (!Set.of("SHOWING", "UPCOMING").contains(
                Objects.toString(movie.getStatus(), "")
        )) {
            throw new BadRequestException(
                    "Chỉ xếp lịch cho phim đang chiếu hoặc sắp chiếu"
            );
        }

        if (movie.getDurationMinutes() == null
                || movie.getDurationMinutes() <= 0) {
            throw new BadRequestException(
                    "Phim chưa có thời lượng hợp lệ"
            );
        }

        if (movie.getReleaseDate() != null
                && start.toLocalDate().isBefore(
                movie.getReleaseDate()
        )) {
            throw new BadRequestException(
                    "Ngày chiếu không được trước ngày khởi chiếu của phim"
            );
        }

        if (start.getSecond() != 0 || start.getNano() != 0) {
            throw new BadRequestException(
                    "Giờ bắt đầu phải có độ chính xác đến phút"
            );
        }

        LocalDateTime end = ShowtimeRules.endAt(
                start,
                movie.getDurationMinutes()
        );

        if (end.getYear() > 9998) {
            throw new BadRequestException(
                    "Giờ kết thúc vượt giới hạn cho phép"
            );
        }

        var conflicts = em.createQuery("""
                        select s from Showtime s
                        join fetch s.movie
                        where s.room.id = :roomId
                          and (
                              s.status is null
                              or upper(s.status) <> 'CANCELLED'
                          )
                          and s.startTime < :endWithGap
                          and s.endTime > :startMinusGap
                        order by s.startTime, s.id
                        """, Showtime.class)
                .setParameter("roomId", room.getId())
                .setParameter("endWithGap", end.plusMinutes(gap))
                .setParameter("startMinusGap", start.minusMinutes(gap))
                .setMaxResults(1)
                .getResultList();

        Showtime existing = conflicts.stream()
                .filter(s -> ShowtimeRules.overlaps(
                        start,
                        end,
                        s.getStartTime(),
                        s.getEndTime(),
                        gap
                ))
                .findFirst()
                .orElse(null);

        if (existing != null) {
            throw new ConflictException(
                    "Trùng lịch tại " + room.getName()
                            + ", suất #" + existing.getId()
                            + " (" + existing.getMovie().getTitle() + "), "
                            + DISPLAY.format(existing.getStartTime())
                            + "–" + DISPLAY.format(existing.getEndTime())
                            + ". Cần cách nhau ít nhất " + gap + " phút."
            );
        }

        List<Seat> seats = em.createQuery("""
                        select s from Seat s
                        where s.room.id = :id
                          and s.status = 'ACTIVE'
                        order by s.id
                        """, Seat.class)
                .setParameter("id", room.getId())
                .getResultList();

        if (seats.isEmpty()) {
            throw new BadRequestException(
                    "Phòng chưa có ghế đang hoạt động"
            );
        }

        DayOfWeek day = start.getDayOfWeek();

        String dayType =
                day == DayOfWeek.SATURDAY || day == DayOfWeek.SUNDAY
                        ? "WEEKEND"
                        : "WEEKDAY";

        for (String seatType : seats.stream()
                .map(Seat::getSeatType)
                .distinct()
                .toList()) {
            var price = priceRepository
                    .findByRoomTypeAndSeatTypeAndDayTypeAndStatus(
                            room.getRoomType(),
                            seatType,
                            dayType,
                            "ACTIVE"
                    );

            if (price.isEmpty()
                    || price.get().getPrice() == null
                    || price.get().getPrice().signum() < 0) {
                throw new BadRequestException(
                        "Chưa có giá vé hợp lệ: "
                                + room.getRoomType() + " / "
                                + seatType + " / " + dayType
                );
            }
        }

        return new Plan(movie, room, end, seats);
    }

    private AdminShowtimeResponse row(
            Showtime s,
            long total
    ) {
        return new AdminShowtimeResponse(
                s.getId(),
                s.getMovie().getId(),
                s.getMovie().getTitle(),
                s.getRoom().getId(),
                s.getRoom().getName(),
                s.getRoom().getRoomType(),
                s.getFormat(),
                s.getStartTime(),
                s.getEndTime(),
                s.getStatus(),
                total
        );
    }

    private <T> TypedQuery<T> bind(
            TypedQuery<T> query,
            Map<String, Object> params
    ) {
        params.forEach(query::setParameter);
        return query;
    }

    private record Plan(
            Movie movie,
            CinemaRoom room,
            LocalDateTime end,
            List<Seat> seats
    ) {}
}