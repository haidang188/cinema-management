package com.cinemamanagement.service;

import com.cinemamanagement.entity.*;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.ShowtimeSeatRepository;
import com.cinemamanagement.repository.TicketPriceRepository;
import com.cinemamanagement.request.AdminShowtimeBatchRequest;
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

    private static final DateTimeFormatter HOUR =
            DateTimeFormatter.ofPattern("HH:mm");

    private static final DateTimeFormatter DATE =
            DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /** Giờ bắt đầu gợi ý được làm tròn lên bội số của 5 phút. */
    private static final int SLOT_STEP_MINUTES = 5;

    private final EntityManager em;
    private final ShowtimeSeatRepository seatRepository;
    private final TicketPriceRepository priceRepository;
    private final int gap;
    private final LocalTime openTime;
    private final LocalTime lastStartTime;

    public AdminShowtimeService(
            EntityManager em,
            ShowtimeSeatRepository seatRepository,
            TicketPriceRepository priceRepository,
            @Value("${cinema.showtime.turnaround-minutes:15}") int gap,
            @Value("${cinema.showtime.open-time:08:00}") LocalTime openTime,
            @Value("${cinema.showtime.last-start-time:23:30}") LocalTime lastStartTime
    ) {
        if (gap < 0 || gap > 180) {
            throw new IllegalArgumentException(
                    "Thời gian dọn phòng phải từ 0–180 phút"
            );
        }

        if (!lastStartTime.isAfter(openTime)) {
            throw new IllegalArgumentException(
                    "Giờ bắt đầu suất cuối phải sau giờ mở cửa"
            );
        }

        this.em = em;
        this.seatRepository = seatRepository;
        this.priceRepository = priceRepository;
        this.gap = gap;
        this.openTime = openTime;
        this.lastStartTime = lastStartTime;
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

    /* ================= Giờ trống của phòng & thêm nhanh nhiều suất ================= */

    /**
     * Lịch trong ngày của một phòng cho một phim: các suất đang chiếm phòng, các khoảng trống
     * đủ dài cho phim (đã tính thời gian dọn phòng) và danh sách giờ bắt đầu gợi ý xếp liền nhau.
     */
    public AdminShowtimeResponse.Availability availability(
            Long movieId,
            Long roomId,
            LocalDate date
    ) {
        if (date == null || date.getYear() < 1000 || date.getYear() > 9998) {
            throw new BadRequestException("Ngày chiếu không hợp lệ");
        }

        CinemaRoom room = findRoom(roomId, false);
        Movie movie = findMovie(movieId);
        int duration = movie.getDurationMinutes() == null ? 0 : movie.getDurationMinutes();

        LocalDateTime dayStart = date.atTime(openTime);
        LocalDateTime lastStart = date.atTime(lastStartTime);
        List<Showtime> shows = roomShowsAround(room.getId(), dayStart, lastStart.plusMinutes(Math.max(duration, 0)));
        List<AdminShowtimeResponse.BusySlot> busy = shows.stream()
                .map(show -> new AdminShowtimeResponse.BusySlot(
                        show.getId(),
                        show.getMovie().getTitle(),
                        show.getStartTime(),
                        show.getEndTime(),
                        show.getEndTime().plusMinutes(gap)
                ))
                .toList();

        String blocker = availabilityBlocker(room, movie, date, lastStart);
        if (blocker != null) {
            return availabilityResult(room, movie, duration, date, dayStart, lastStart,
                    false, blocker, busy, List.of(), List.of());
        }

        LocalDateTime earliestAllowed = ceilToStep(LocalDateTime.now(ZONE).plusMinutes(6));
        LocalDateTime cursor = dayStart.isAfter(earliestAllowed) ? dayStart : earliestAllowed;
        List<AdminShowtimeResponse.FreeSlot> freeSlots = new ArrayList<>();

        for (Showtime show : shows) {
            LocalDateTime latest = show.getStartTime().minusMinutes(gap + duration);
            addFreeSlot(freeSlots, cursor, latest, lastStart, show.getStartTime().minusMinutes(gap), duration);
            LocalDateTime ready = show.getEndTime().plusMinutes(gap);
            if (ready.isAfter(cursor)) {
                cursor = ready;
            }
        }
        addFreeSlot(freeSlots, cursor, lastStart, lastStart, null, duration);

        List<LocalDateTime> suggestions = new ArrayList<>();
        for (AdminShowtimeResponse.FreeSlot slot : freeSlots) {
            LocalDateTime start = ceilToStep(slot.earliestStart());
            while (!start.isAfter(slot.latestStart())) {
                suggestions.add(start);
                start = ceilToStep(start.plusMinutes(duration + gap));
            }
        }

        boolean available = !suggestions.isEmpty();
        String message = available
                ? room.getName() + " còn " + freeSlots.size() + " khoảng trống, xếp được tối đa "
                        + suggestions.size() + " suất " + duration + " phút liền nhau."
                : room.getName() + " đã kín lịch ngày " + DATE.format(date)
                        + " cho phim dài " + duration + " phút. Hãy chọn phòng hoặc ngày khác.";

        return availabilityResult(room, movie, duration, date, dayStart, lastStart,
                available, message, busy, freeSlots, suggestions);
    }

    /** Kiểm tra từng giờ trong danh sách thêm nhanh, không lưu. */
    public List<AdminShowtimeResponse.BatchPreviewItem> previewBatch(
            AdminShowtimeBatchRequest request
    ) {
        List<LocalDateTime> times = sortedStartTimes(request);
        Movie movie = em.find(Movie.class, request.movieId());
        Integer duration = movie == null ? null : movie.getDurationMinutes();

        List<AdminShowtimeResponse.BatchPreviewItem> items = new ArrayList<>();
        List<LocalDateTime[]> accepted = new ArrayList<>();

        for (LocalDateTime start : times) {
            LocalDateTime end = duration == null || duration <= 0 ? null : start.plusMinutes(duration);
            LocalDateTime readyAt = end == null ? null : end.plusMinutes(gap);
            try {
                Plan plan = plan(single(request, start), false);
                String clash = clashWithin(accepted, start, plan.end());
                if (clash != null) {
                    items.add(new AdminShowtimeResponse.BatchPreviewItem(start, plan.end(),
                            plan.end().plusMinutes(gap), false, clash));
                    continue;
                }
                accepted.add(new LocalDateTime[]{start, plan.end()});
                items.add(new AdminShowtimeResponse.BatchPreviewItem(start, plan.end(),
                        plan.end().plusMinutes(gap), true, "Hợp lệ"));
            } catch (BadRequestException | ConflictException | ResourceNotFoundException ex) {
                items.add(new AdminShowtimeResponse.BatchPreviewItem(start, end, readyAt, false, ex.getMessage()));
            }
        }

        return items;
    }

    /**
     * Thêm nhiều suất trong một giao dịch: một giờ không hợp lệ thì không lưu giờ nào,
     * tránh tình trạng thêm được một nửa lịch.
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public AdminShowtimeResponse.BatchResult createBatch(
            AdminShowtimeBatchRequest request
    ) {
        List<LocalDateTime> times = sortedStartTimes(request);
        Movie movie = findMovie(request.movieId());

        if (movie.getDurationMinutes() != null && movie.getDurationMinutes() > 0) {
            List<LocalDateTime[]> accepted = new ArrayList<>();
            for (LocalDateTime start : times) {
                LocalDateTime end = start.plusMinutes(movie.getDurationMinutes());
                String clash = clashWithin(accepted, start, end);
                if (clash != null) {
                    throw new ConflictException(clash);
                }
                accepted.add(new LocalDateTime[]{start, end});
            }
        }

        List<AdminShowtimeResponse> created = new ArrayList<>();
        for (LocalDateTime start : times) {
            try {
                created.add(create(single(request, start)));
            } catch (BadRequestException ex) {
                throw new BadRequestException(prefix(start) + ex.getMessage());
            } catch (ConflictException ex) {
                throw new ConflictException(prefix(start) + ex.getMessage());
            }
        }

        return new AdminShowtimeResponse.BatchResult(created);
    }

    private Plan plan(
            AdminShowtimeRequest request,
            boolean lockRoom
    ) {
        LocalDateTime start = request.startTime();
        validateStart(start);

        // Các lệnh tạo lịch cho cùng phòng phải chờ nhau trước khi kiểm tra trùng.
        CinemaRoom room = findRoom(request.roomId(), lockRoom);

        if (!"ACTIVE".equals(room.getStatus())) {
            throw new BadRequestException(
                    "Phòng chiếu không hoạt động"
            );
        }

        Movie movie = findMovie(request.movieId());
        String movieProblem = movieProblem(movie, start.toLocalDate());

        if (movieProblem != null) {
            throw new BadRequestException(movieProblem);
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

        Showtime existing = findConflict(room.getId(), start, end);

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

        List<Seat> seats = activeSeats(room);

        if (seats.isEmpty()) {
            throw new BadRequestException(
                    "Phòng chưa có ghế đang hoạt động"
            );
        }

        String priceProblem = missingPrice(room, seats, start.toLocalDate());

        if (priceProblem != null) {
            throw new BadRequestException(priceProblem);
        }

        return new Plan(movie, room, end, seats);
    }

    private void validateStart(LocalDateTime start) {
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

        if (start.getSecond() != 0 || start.getNano() != 0) {
            throw new BadRequestException(
                    "Giờ bắt đầu phải có độ chính xác đến phút"
            );
        }

        LocalTime time = start.toLocalTime();
        if (time.isBefore(openTime) || time.isAfter(lastStartTime)) {
            throw new BadRequestException(
                    "Giờ bắt đầu phải trong khung " + HOUR.format(openTime)
                            + "–" + HOUR.format(lastStartTime)
            );
        }
    }

    private CinemaRoom findRoom(Long roomId, boolean lock) {
        CinemaRoom room = lock
                ? em.find(CinemaRoom.class, roomId, LockModeType.PESSIMISTIC_WRITE)
                : em.find(CinemaRoom.class, roomId);

        if (room == null) {
            throw new ResourceNotFoundException(
                    "Không tìm thấy phòng chiếu"
            );
        }

        return room;
    }

    private Movie findMovie(Long movieId) {
        Movie movie = em.find(Movie.class, movieId);

        if (movie == null) {
            throw new ResourceNotFoundException(
                    "Không tìm thấy phim"
            );
        }

        return movie;
    }

    /** Lý do phim không xếp lịch được vào ngày đó, hoặc null nếu hợp lệ. */
    private String movieProblem(Movie movie, LocalDate date) {
        if (!Set.of("SHOWING", "UPCOMING").contains(
                Objects.toString(movie.getStatus(), "")
        )) {
            return "Chỉ xếp lịch cho phim đang chiếu hoặc sắp chiếu";
        }

        if (movie.getDurationMinutes() == null
                || movie.getDurationMinutes() <= 0) {
            return "Phim chưa có thời lượng hợp lệ";
        }

        if (movie.getReleaseDate() != null
                && date.isBefore(movie.getReleaseDate())) {
            return "Ngày chiếu không được trước ngày khởi chiếu của phim ("
                    + DATE.format(movie.getReleaseDate()) + ")";
        }

        return null;
    }

    private Showtime findConflict(
            Long roomId,
            LocalDateTime start,
            LocalDateTime end
    ) {
        return roomShowsAround(roomId, start, end)
                .stream()
                .filter(s -> ShowtimeRules.overlaps(
                        start,
                        end,
                        s.getStartTime(),
                        s.getEndTime(),
                        gap
                ))
                .findFirst()
                .orElse(null);
    }

    /** Các suất (chưa hủy) của phòng có thể ảnh hưởng tới khung giờ [from, to], tính cả thời gian dọn phòng. */
    private List<Showtime> roomShowsAround(
            Long roomId,
            LocalDateTime from,
            LocalDateTime to
    ) {
        return em.createQuery("""
                        select s from Showtime s
                        join fetch s.movie
                        where s.room.id = :roomId
                          and (
                              s.status is null
                              or upper(s.status) <> 'CANCELLED'
                          )
                          and s.startTime < :toWithGap
                          and s.endTime > :fromMinusGap
                        order by s.startTime, s.id
                        """, Showtime.class)
                .setParameter("roomId", roomId)
                .setParameter("toWithGap", to.plusMinutes(gap))
                .setParameter("fromMinusGap", from.minusMinutes(gap))
                .getResultList();
    }

    private List<Seat> activeSeats(CinemaRoom room) {
        return em.createQuery("""
                        select s from Seat s
                        where s.room.id = :id
                          and s.status = 'ACTIVE'
                        order by s.id
                        """, Seat.class)
                .setParameter("id", room.getId())
                .getResultList();
    }

    /** Thông báo thiếu giá vé cho loại phòng/ghế/ngày, hoặc null nếu đủ giá. */
    private String missingPrice(
            CinemaRoom room,
            List<Seat> seats,
            LocalDate date
    ) {
        DayOfWeek day = date.getDayOfWeek();

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
                return "Chưa có giá vé hợp lệ: "
                        + room.getRoomType() + " / "
                        + seatType + " / " + dayType;
            }
        }

        return null;
    }

    /** Lý do không thể xếp lịch cho phòng/phim/ngày đã chọn, hoặc null nếu xếp được. */
    private String availabilityBlocker(
            CinemaRoom room,
            Movie movie,
            LocalDate date,
            LocalDateTime lastStart
    ) {
        if (!"ACTIVE".equals(room.getStatus())) {
            return room.getName() + " đang không hoạt động, không thể xếp lịch.";
        }

        String movieProblem = movieProblem(movie, date);
        if (movieProblem != null) {
            return movieProblem;
        }

        if (!lastStart.isAfter(LocalDateTime.now(ZONE).plusMinutes(5))) {
            return "Ngày " + DATE.format(date) + " đã qua giờ xếp suất cuối ("
                    + HOUR.format(lastStartTime) + ").";
        }

        List<Seat> seats = activeSeats(room);
        if (seats.isEmpty()) {
            return room.getName() + " chưa có ghế đang hoạt động.";
        }

        return missingPrice(room, seats, date);
    }

    private void addFreeSlot(
            List<AdminShowtimeResponse.FreeSlot> slots,
            LocalDateTime earliest,
            LocalDateTime latest,
            LocalDateTime lastStart,
            LocalDateTime freeUntil,
            int duration
    ) {
        LocalDateTime cappedLatest = latest.isAfter(lastStart) ? lastStart : latest;
        if (ceilToStep(earliest).isAfter(cappedLatest)) {
            return;
        }

        LocalDateTime to = freeUntil != null ? freeUntil : cappedLatest.plusMinutes(duration);
        slots.add(new AdminShowtimeResponse.FreeSlot(earliest, to, earliest, cappedLatest));
    }

    private AdminShowtimeResponse.Availability availabilityResult(
            CinemaRoom room,
            Movie movie,
            int duration,
            LocalDate date,
            LocalDateTime dayStart,
            LocalDateTime lastStart,
            boolean available,
            String message,
            List<AdminShowtimeResponse.BusySlot> busy,
            List<AdminShowtimeResponse.FreeSlot> freeSlots,
            List<LocalDateTime> suggestions
    ) {
        return new AdminShowtimeResponse.Availability(
                room.getId(),
                room.getName(),
                movie.getId(),
                movie.getTitle(),
                duration,
                date,
                dayStart,
                lastStart,
                gap,
                available,
                message,
                busy,
                freeSlots,
                suggestions
        );
    }

    private List<LocalDateTime> sortedStartTimes(AdminShowtimeBatchRequest request) {
        List<LocalDateTime> times = request.startTimes().stream().sorted().toList();

        for (int i = 1; i < times.size(); i++) {
            if (times.get(i).equals(times.get(i - 1))) {
                throw new BadRequestException("Giờ " + DISPLAY.format(times.get(i)) + " bị chọn hai lần");
            }
        }

        return times;
    }

    /** Kiểm tra trùng giữa các giờ trong cùng danh sách thêm nhanh (kể cả thời gian dọn phòng). */
    private String clashWithin(
            List<LocalDateTime[]> accepted,
            LocalDateTime start,
            LocalDateTime end
    ) {
        for (LocalDateTime[] other : accepted) {
            if (ShowtimeRules.overlaps(start, end, other[0], other[1], gap)) {
                return "Giờ " + HOUR.format(start) + " trùng với suất " + HOUR.format(other[0])
                        + " trong danh sách (cần cách nhau ít nhất " + gap + " phút sau khi kết thúc).";
            }
        }

        return null;
    }

    private AdminShowtimeRequest single(AdminShowtimeBatchRequest request, LocalDateTime start) {
        return new AdminShowtimeRequest(request.movieId(), request.roomId(), start, request.format());
    }

    private String prefix(LocalDateTime start) {
        return "Suất " + DISPLAY.format(start) + ": ";
    }

    private static LocalDateTime ceilToStep(LocalDateTime value) {
        LocalDateTime minute = value.truncatedTo(ChronoUnit.MINUTES);
        if (minute.isBefore(value)) {
            minute = minute.plusMinutes(1);
        }

        int remainder = minute.getMinute() % SLOT_STEP_MINUTES;
        return remainder == 0 ? minute : minute.plusMinutes(SLOT_STEP_MINUTES - remainder);
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