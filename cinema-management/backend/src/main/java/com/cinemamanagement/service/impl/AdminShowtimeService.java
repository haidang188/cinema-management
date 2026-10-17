package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.*;
import com.cinemamanagement.exception.*;
import com.cinemamanagement.repository.*;
import com.cinemamanagement.request.ScheduleShowtimeRequest;
import com.cinemamanagement.response.ShowtimeResponse;
import com.cinemamanagement.service.ShowtimeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminShowtimeService {
    private static final int CLEANUP_MINUTES = 15;
    private final ShowtimeRepository showtimes;
    private final CinemaRoomRepository rooms;
    private final MovieRepository movies;
    private final SeatRepository seats;
    private final ShowtimeSeatRepository showtimeSeats;
    private final BookingRepository bookings;
    private final ShowtimeService publicShowtimes;

    @Transactional(readOnly = true)
    public List<ShowtimeResponse> list(LocalDate date) {
        return showtimes.findAllStartingBetween(date.atStartOfDay(), date.plusDays(1).atStartOfDay())
                .stream().map(s -> publicShowtimes.getShowtimeById(s.getId())).toList();
    }

    @Transactional
    public ShowtimeResponse create(ScheduleShowtimeRequest request) {
        CinemaRoom room = lockRoom(request.roomId());
        List<Seat> activeSeats = seats.findByRoomIdOrderByRowLabelAscSeatNumberAsc(room.getId()).stream()
                .filter(s -> "ACTIVE".equalsIgnoreCase(s.getStatus())).toList();
        if (activeSeats.isEmpty()) throw new BadRequestException("Phòng chưa có ghế hoạt động để xếp lịch.");
        Showtime showtime = new Showtime();
        showtime.setRoom(room);
        apply(showtime, request);
        showtime.setStatus("OPEN");
        showtime.setCreatedAt(now());
        showtimes.saveAndFlush(showtime);
        showtimeSeats.saveAll(activeSeats.stream().map(seat -> {
            ShowtimeSeat item = new ShowtimeSeat();
            item.setShowtime(showtime); item.setSeat(seat); item.setStatus("AVAILABLE");
            return item;
        }).toList());
        return publicShowtimes.getShowtimeById(showtime.getId());
    }

    @Transactional
    public ShowtimeResponse update(Long id, ScheduleShowtimeRequest request) {
        // Lock the room before reading the showtime so concurrent schedule changes serialize.
        lockRoom(request.roomId());
        Showtime showtime = find(id);
        if (!showtime.getRoom().getId().equals(request.roomId()))
            throw new BadRequestException("Không thể đổi phòng của suất đã tạo. Hãy hủy và xếp suất mới.");
        requireEditable(showtime);
        apply(showtime, request);
        showtimes.flush();
        return publicShowtimes.getShowtimeById(id);
    }

    @Transactional
    public void cancel(Long id) {
        Long roomId = showtimes.findRoomIdById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy suất chiếu."));
        lockRoom(roomId);
        Showtime showtime = find(id);
        List<ShowtimeSeat> lockedSeats = requireEditable(showtime);
        showtime.setStatus("CANCELLED");
        lockedSeats.forEach(seat -> seat.setStatus("CANCELLED"));
        showtimes.flush();
    }

    private void apply(Showtime showtime, ScheduleShowtimeRequest request) {
        if (!"ACTIVE".equalsIgnoreCase(showtime.getRoom().getStatus()))
            throw new BadRequestException("Phòng đang bảo trì hoặc ngừng hoạt động, không thể xếp lịch.");
        String roomType = showtime.getRoom().getRoomType();
        if (!"2D".equals(request.format()) && !request.format().equalsIgnoreCase(roomType)
                && !("3D".equals(request.format()) && "IMAX".equalsIgnoreCase(roomType)))
            throw new BadRequestException("Phòng đã chọn không hỗ trợ định dạng chiếu này.");
        if (request.startTime() == null || !request.startTime().isAfter(now()))
            throw new BadRequestException("Giờ bắt đầu phải ở tương lai (giờ Việt Nam).");
        Movie movie = movies.findById(request.movieId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phim đã chọn."));
        if (!List.of("SHOWING", "UPCOMING").contains(movie.getStatus()))
            throw new BadRequestException("Chỉ xếp lịch cho phim đang chiếu hoặc sắp chiếu.");
        if (movie.getDurationMinutes() == null || movie.getDurationMinutes() <= 0)
            throw new BadRequestException("Phim chưa có thời lượng hợp lệ.");
        if (movie.getReleaseDate() != null && request.startTime().toLocalDate().isBefore(movie.getReleaseDate()))
            throw new BadRequestException("Không thể xếp lịch trước ngày phát hành phim.");
        LocalDateTime end = request.startTime().plusMinutes(movie.getDurationMinutes());
        if (showtimes.hasSchedulingConflict(request.roomId(), showtime.getId(),
                request.startTime().minusMinutes(CLEANUP_MINUTES), end.plusMinutes(CLEANUP_MINUTES)))
            throw new ConflictException("Phòng đã có suất chiếu trong khung giờ này. Cần cách nhau ít nhất 15 phút để dọn phòng.");
        showtime.setMovie(movie); showtime.setStartTime(request.startTime());
        showtime.setEndTime(end); showtime.setFormat(request.format());
    }

    private CinemaRoom lockRoom(Long id) {
        CinemaRoom room = rooms.findByIdForScheduling(id)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy phòng chiếu."));
        return room;
    }

    private List<ShowtimeSeat> requireEditable(Showtime showtime) {
        List<ShowtimeSeat> lockedSeats = showtimeSeats.lockAllForScheduling(showtime.getId());
        if (!"OPEN".equalsIgnoreCase(showtime.getStatus()) || !showtime.getStartTime().isAfter(now()))
            throw new ConflictException("Chỉ sửa hoặc hủy suất đang mở và chưa bắt đầu.");
        if (bookings.existsByShowtimeId(showtime.getId())
                || lockedSeats.stream().anyMatch(s -> List.of("HELD", "BOOKED", "SOLD").contains(s.getStatus())))
            throw new ConflictException("Suất chiếu đã có đặt vé hoặc ghế đang giữ. Không thể sửa hoặc hủy.");
        return lockedSeats;
    }

    private Showtime find(Long id) {
        return showtimes.findByIdForScheduling(id).orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy suất chiếu."));
    }

    private LocalDateTime now() { return LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")); }
}
