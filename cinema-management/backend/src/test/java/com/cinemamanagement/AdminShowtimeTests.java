package com.cinemamanagement;

import com.cinemamanagement.entity.*;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.repository.*;
import com.cinemamanagement.request.ScheduleShowtimeRequest;
import com.cinemamanagement.service.impl.AdminShowtimeService;
import com.cinemamanagement.service.impl.ShowtimeServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import java.time.*;
import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest(properties = { "spring.datasource.url=jdbc:h2:mem:scheduling_qa;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false" })
@Import({AdminShowtimeService.class, ShowtimeServiceImpl.class})
class AdminShowtimeTests {
    @Autowired AdminShowtimeService service;
    @Autowired MovieRepository movies;
    @Autowired CinemaRoomRepository rooms;
    @Autowired SeatRepository seats;
    @Autowired ShowtimeRepository showtimes;
    @Autowired ShowtimeSeatRepository showtimeSeats;
    @Autowired BookingRepository bookings;
    Movie movie;
    CinemaRoom room;
    LocalDateTime start;

    @BeforeEach
    void fixture() {
        start = LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh")).plusDays(2).atTime(10, 0);
        movie = new Movie(); movie.setTitle("Scheduling QA"); movie.setDurationMinutes(120); movie.setStatus("SHOWING");
        movies.saveAndFlush(movie);
        room = room("Scheduling room");
        Seat inactive = seat(room, 2); inactive.setStatus("INACTIVE"); seats.saveAndFlush(inactive);
    }

    @Test
    void createsShowtimeWithComputedEndAndOnlyActiveSeats() {
        var result = service.create(request(room, start));
        assertEquals(start.plusHours(2), result.getEndTime());
        assertEquals("OPEN", result.getStatus());
        assertEquals(1L, result.getTotalSeats());
        assertEquals(1L, result.getAvailableSeats());
    }

    @Test
    void rejectsOverlapAndShortCleanupButAcceptsExactlyFifteenMinutes() {
        service.create(request(room, start));
        assertThrows(ConflictException.class, () -> service.create(request(room, start.plusHours(1))));
        assertThrows(ConflictException.class, () -> service.create(request(room, start.plusHours(2).plusMinutes(14))));
        assertNotNull(service.create(request(room, start.plusHours(2).plusMinutes(15))).getId());
    }

    @Test
    void checksOverlapAcrossMidnightAndAllowsDifferentRooms() {
        LocalDateTime late = start.toLocalDate().atTime(23, 30);
        service.create(request(room, late));
        assertThrows(ConflictException.class, () -> service.create(request(room, late.plusHours(2).plusMinutes(14))));
        assertNotNull(service.create(request(room("Other room"), late)).getId());
    }

    @Test
    void updateKeepsSeatIdsAndExcludesOwnSlotFromConflictCheck() {
        var created = service.create(request(room, start));
        Long seatId = showtimeSeats.findByShowtimeId(created.getId()).getFirst().getId();
        var updated = service.update(created.getId(), request(room, start.plusMinutes(30)));
        assertEquals(start.plusMinutes(30), updated.getStartTime());
        assertEquals(seatId, showtimeSeats.findByShowtimeId(created.getId()).getFirst().getId());
    }

    @Test
    void cancellationKeepsHistoryDisablesSeatsAndFreesTimeSlot() {
        var created = service.create(request(room, start));
        // Cancellation must still work when the room was put into maintenance.
        room.setStatus("MAINTENANCE"); rooms.saveAndFlush(room);
        service.cancel(created.getId());
        assertEquals("CANCELLED", showtimes.findById(created.getId()).orElseThrow().getStatus());
        assertEquals("CANCELLED", showtimeSeats.findByShowtimeId(created.getId()).getFirst().getStatus());
        room.setStatus("ACTIVE"); rooms.saveAndFlush(room);
        assertNotNull(service.create(request(room, start)).getId());
        assertEquals(2, service.list(start.toLocalDate()).size());
    }

    @Test
    void rejectsChangesWhileSeatHeld() {
        var created = service.create(request(room, start));
        ShowtimeSeat seat = showtimeSeats.findByShowtimeId(created.getId()).getFirst();
        seat.setStatus("HELD"); showtimeSeats.saveAndFlush(seat);
        assertThrows(ConflictException.class, () -> service.cancel(created.getId()));
        assertThrows(ConflictException.class, () -> service.update(created.getId(), request(room, start.plusHours(1))));
        assertEquals("OPEN", showtimes.findById(created.getId()).orElseThrow().getStatus());
    }

    @Test
    void rejectsChangesWithExistingBooking() {
        var created = service.create(request(room, start));
        Booking booking = new Booking(); booking.setBookingCode("QA-BOOKING"); booking.setShowtime(showtimes.findById(created.getId()).orElseThrow());
        booking.setStatus("CONFIRMED"); bookings.saveAndFlush(booking);
        assertThrows(ConflictException.class, () -> service.cancel(created.getId()));
        assertThrows(ConflictException.class, () -> service.update(created.getId(), request(room, start.plusHours(1))));
    }

    @Test
    void validatesTimeReleaseRoomAndFormat() {
        assertThrows(BadRequestException.class, () -> service.create(request(room, start.minusYears(1))));
        movie.setReleaseDate(start.toLocalDate().plusDays(1)); movies.saveAndFlush(movie);
        assertThrows(BadRequestException.class, () -> service.create(request(room, start)));
        movie.setReleaseDate(null); movies.saveAndFlush(movie);
        room.setStatus("MAINTENANCE"); rooms.saveAndFlush(room);
        assertThrows(BadRequestException.class, () -> service.create(request(room, start)));
        room.setStatus("ACTIVE"); rooms.saveAndFlush(room);
        assertThrows(BadRequestException.class, () -> service.create(new ScheduleShowtimeRequest(movie.getId(), room.getId(), start, "IMAX")));
    }

    @Test
    void rejectsInactiveMovieAndRoomWithoutActiveSeats() {
        movie.setStatus("INACTIVE"); movies.saveAndFlush(movie);
        assertThrows(BadRequestException.class, () -> service.create(request(room, start)));
        movie.setStatus("SHOWING"); movies.saveAndFlush(movie);
        seats.findByRoomIdOrderByRowLabelAscSeatNumberAsc(room.getId()).forEach(s -> s.setStatus("INACTIVE"));
        seats.flush();
        assertThrows(BadRequestException.class, () -> service.create(request(room, start)));
    }

    private ScheduleShowtimeRequest request(CinemaRoom selected, LocalDateTime time) {
        return new ScheduleShowtimeRequest(movie.getId(), selected.getId(), time, "2D");
    }
    private CinemaRoom room(String name) {
        CinemaRoom result = new CinemaRoom(); result.setName(name); result.setRoomType("2D"); result.setStatus("ACTIVE"); result.setTotalSeats(1);
        rooms.saveAndFlush(result); seat(result, 1); return result;
    }
    private Seat seat(CinemaRoom target, int number) {
        Seat result = new Seat(); result.setRoom(target); result.setRowLabel("A"); result.setSeatNumber(number);
        result.setSeatType("NORMAL"); result.setStatus("ACTIVE"); result.setGridRow(0); result.setGridColumn(number - 1);
        return seats.saveAndFlush(result);
    }
}
