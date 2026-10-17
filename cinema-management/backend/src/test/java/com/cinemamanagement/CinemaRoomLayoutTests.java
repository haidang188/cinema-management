package com.cinemamanagement;

import com.cinemamanagement.entity.CinemaRoom;
import com.cinemamanagement.entity.Seat;
import com.cinemamanagement.entity.Movie;
import com.cinemamanagement.entity.Showtime;
import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.repository.MovieRepository;
import com.cinemamanagement.repository.ShowtimeRepository;
import com.cinemamanagement.repository.ShowtimeSeatRepository;
import com.cinemamanagement.repository.CinemaRoomRepository;
import com.cinemamanagement.repository.SeatRepository;
import com.cinemamanagement.request.CreateCinemaRoomRequest.SeatLayoutRequest;
import com.cinemamanagement.request.UpdateCinemaRoomRequest;
import com.cinemamanagement.service.impl.CinemaRoomServiceImpl;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;

import java.util.List;
import java.time.LocalDateTime;

import static org.junit.jupiter.api.Assertions.*;

// Uses an embedded, disposable database. Never connects to the project's MySQL database.
@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:room_layout_qa;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop",
        "spring.jpa.show-sql=false"
})
@Import(CinemaRoomServiceImpl.class)
class CinemaRoomLayoutTests {
    @Autowired CinemaRoomServiceImpl service;
    @Autowired CinemaRoomRepository rooms;
    @Autowired SeatRepository seats;
    @Autowired MovieRepository movies;
    @Autowired ShowtimeRepository showtimes;
    @Autowired ShowtimeSeatRepository showtimeSeats;
    @Autowired EntityManager entityManager;

    @Test
    void convertingShowtimeSeatToEmptyReturnsClearConflictAndKeepsReferences() {
        CinemaRoom room = room();
        Seat removed = seat(room, 1, 0);
        seat(room, 2, 1);
        Movie movie = new Movie();
        movie.setTitle("Seat deletion QA"); movie.setDurationMinutes(120);
        movies.saveAndFlush(movie);
        Showtime showtime = new Showtime();
        showtime.setMovie(movie); showtime.setRoom(room);
        showtime.setStartTime(LocalDateTime.of(2026, 10, 17, 10, 0));
        showtime.setEndTime(showtime.getStartTime().plusHours(2));
        showtimes.saveAndFlush(showtime);
        ShowtimeSeat reference = new ShowtimeSeat();
        reference.setShowtime(showtime); reference.setSeat(removed); reference.setStatus("AVAILABLE");
        showtimeSeats.saveAndFlush(reference);
        entityManager.clear();

        ConflictException error = assertThrows(ConflictException.class,
                () -> service.updateRoom(room.getId(), update(List.of(layout(1, 1)))));

        assertTrue(error.getMessage().contains("A1"));
        assertTrue(error.getMessage().contains("suất chiếu"));
        assertTrue(seats.existsById(removed.getId()));
        assertTrue(showtimeSeats.existsById(reference.getId()));
    }

    @Test
    void insertingSeatBeforeExistingSeatKeepsExistingIdWithoutUniqueCollision() {
        CinemaRoom room = room();
        Seat existing = seat(room, 1, 1);
        var result = service.updateRoom(room.getId(), update(List.of(layout(1, 0), layout(2, 1))));
        seats.flush();
        assertEquals(2, result.totalSeats());
        Seat retained = seats.findById(existing.getId()).orElseThrow();
        assertEquals(2, retained.getSeatNumber());
        assertEquals(1, retained.getGridColumn());
    }

    @Test
    void renumberingTwoExistingSeatsDoesNotCollideWithTheirOldNumbers() {
        CinemaRoom room = room();
        Seat first = seat(room, 1, 1);
        Seat second = seat(room, 2, 2);
        service.updateRoom(room.getId(), update(List.of(layout(1, 0), layout(2, 1), layout(3, 2))));
        seats.flush();
        assertEquals(2, seats.findById(first.getId()).orElseThrow().getSeatNumber());
        assertEquals(3, seats.findById(second.getId()).orElseThrow().getSeatNumber());
    }

    private CinemaRoom room() {
        CinemaRoom room = new CinemaRoom();
        room.setName("Layout QA"); room.setRoomType("2D"); room.setStatus("ACTIVE"); room.setTotalSeats(0);
        return rooms.saveAndFlush(room);
    }

    @Test
    void removingFirstSeatRenumbersRemainingSeatsWithoutReplacingTheirIds() {
        CinemaRoom room = room();
        Seat removed = seat(room, 1, 0);
        Seat retained = seat(room, 2, 1);
        Seat last = seat(room, 3, 2);
        service.updateRoom(room.getId(), update(List.of(layout(1, 1), layout(2, 2))));
        seats.flush();
        assertFalse(seats.existsById(removed.getId()));
        assertEquals(1, seats.findById(retained.getId()).orElseThrow().getSeatNumber());
        assertEquals(2, seats.findById(last.getId()).orElseThrow().getSeatNumber());
    }

    @Test
    void unchangedLayoutPreservesIdAndUpdatesSeatType() {
        CinemaRoom room = room();
        Seat existing = seat(room, 1, 0);
        SeatLayoutRequest changed = layout(1, 0);
        changed.setSeatType("VIP");
        service.updateRoom(room.getId(), update(List.of(changed)));
        seats.flush();
        assertEquals("VIP", seats.findById(existing.getId()).orElseThrow().getSeatType());
        assertEquals(1, seats.findByRoomIdOrderByRowLabelAscSeatNumberAsc(room.getId()).size());
    }

    private Seat seat(CinemaRoom room, int number, int column) {
        Seat seat = new Seat();
        seat.setRoom(room); seat.setRowLabel("A"); seat.setSeatNumber(number);
        seat.setSeatType("NORMAL"); seat.setStatus("ACTIVE"); seat.setGridRow(0); seat.setGridColumn(column);
        return seats.saveAndFlush(seat);
    }

    private SeatLayoutRequest layout(int number, int column) {
        SeatLayoutRequest seat = new SeatLayoutRequest();
        seat.setRowLabel("A"); seat.setSeatNumber(number); seat.setSeatType("NORMAL"); seat.setStatus("ACTIVE");
        seat.setGridRow(0); seat.setGridColumn(column);
        return seat;
    }

    private UpdateCinemaRoomRequest update(List<SeatLayoutRequest> layout) {
        UpdateCinemaRoomRequest request = new UpdateCinemaRoomRequest();
        request.setName("Layout QA"); request.setRoomType("2D"); request.setStatus("ACTIVE"); request.setSeats(layout);
        return request;
    }
}
