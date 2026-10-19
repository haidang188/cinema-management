package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.CinemaRoom;
import com.cinemamanagement.entity.Seat;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.repository.BookingSeatRepository;
import com.cinemamanagement.repository.CinemaRoomRepository;
import com.cinemamanagement.repository.SeatRepository;
import com.cinemamanagement.repository.ShowtimeSeatRepository;
import com.cinemamanagement.request.CreateCinemaRoomRequest.SeatLayoutRequest;
import com.cinemamanagement.request.UpdateCinemaRoomRequest;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@DataJpaTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:room_layout_test;MODE=MySQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@Import(CinemaRoomServiceImpl.class)
class CinemaRoomLayoutTest {
    @Autowired CinemaRoomServiceImpl service;
    @Autowired CinemaRoomRepository rooms;
    @Autowired SeatRepository seats;
    @Autowired EntityManager entityManager;
    @MockitoBean BookingSeatRepository bookings;
    @MockitoBean ShowtimeSeatRepository showtimeSeats;

    @Test
    void insertingIntoGapRenumbersWithoutDuplicateKeysAndPreservesIds() {
        CinemaRoom room = room();
        Seat first = seat(room, 1, 0);
        Seat last = seat(room, 2, 2);

        update(room, layout(1, 0), layout(2, 1), layout(3, 2));

        List<Seat> saved = reload(room);
        assertThat(saved).extracting(Seat::getSeatNumber).containsExactly(1, 2, 3);
        assertThat(saved.get(0).getId()).isEqualTo(first.getId());
        assertThat(saved.get(2).getId()).isEqualTo(last.getId());
    }

    @Test
    void removingFirstSeatRenumbersRemainingSeatsWithoutChangingIds() {
        CinemaRoom room = room();
        seat(room, 1, 0);
        Seat second = seat(room, 2, 1);
        Seat third = seat(room, 3, 2);

        update(room, layout(1, 1), layout(2, 2));

        List<Seat> saved = reload(room);
        assertThat(saved).extracting(Seat::getSeatNumber).containsExactly(1, 2);
        assertThat(saved).extracting(Seat::getId).containsExactly(second.getId(), third.getId());
    }

    @Test
    void swappingSeatNumbersReleasesBothUniqueKeysBeforeUpdating() {
        CinemaRoom room = room();
        Seat first = seat(room, 1, 0);
        Seat second = seat(room, 2, 1);

        update(room, layout(2, 0), layout(1, 1));

        assertThat(reload(room)).extracting(Seat::getId).containsExactly(second.getId(), first.getId());
    }

    @Test
    void legacySeatsWithoutCoordinatesKeepTheirIdsAndBookingReferences() {
        CinemaRoom room = room();
        Seat first = seat(room, 1, null);
        Seat second = seat(room, 2, null);
        when(bookings.existsBySeatId(first.getId())).thenReturn(true);

        update(room, layout(1, 0), layout(2, 1));

        List<Seat> saved = reload(room);
        assertThat(saved).extracting(Seat::getId).containsExactly(first.getId(), second.getId());
        assertThat(saved).extracting(Seat::getGridColumn).containsExactly(0, 1);
    }

    @Test
    void bookedSeatCannotBeRemoved() {
        CinemaRoom room = room();
        Seat first = seat(room, 1, 0);
        seat(room, 2, 1);
        when(bookings.existsBySeatId(first.getId())).thenReturn(true);

        assertThatThrownBy(() -> update(room, layout(1, 1)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("đã có đặt vé");
        assertThat(reload(room)).extracting(Seat::getSeatNumber).containsExactly(1, 2);
    }

    @Test
    void seatUsedByShowtimeCannotBeRemoved() {
        CinemaRoom room = room();
        Seat first = seat(room, 1, 0);
        seat(room, 2, 1);
        when(showtimeSeats.existsBySeatId(first.getId())).thenReturn(true);

        assertThatThrownBy(() -> update(room, layout(1, 1)))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("suất chiếu");
        assertThat(reload(room)).extracting(Seat::getSeatNumber).containsExactly(1, 2);
    }

    @Test
    void unchangedLayoutCanUpdateSeatTypeAndStatus() {
        CinemaRoom room = room();
        Seat original = seat(room, 1, 0);
        SeatLayoutRequest request = layout(1, 0);
        request.setSeatType("VIP");
        request.setStatus("INACTIVE");

        update(room, request);

        Seat saved = reload(room).getFirst();
        assertThat(saved.getId()).isEqualTo(original.getId());
        assertThat(saved.getSeatType()).isEqualTo("VIP");
        assertThat(saved.getStatus()).isEqualTo("INACTIVE");
    }

    private CinemaRoom room() {
        CinemaRoom room = new CinemaRoom();
        room.setName("Phòng 18");
        room.setRoomType("2D");
        room.setStatus("ACTIVE");
        return rooms.saveAndFlush(room);
    }

    private Seat seat(CinemaRoom room, int number, Integer column) {
        Seat seat = new Seat();
        seat.setRoom(room);
        seat.setRowLabel("A");
        seat.setSeatNumber(number);
        seat.setSeatType("NORMAL");
        seat.setStatus("ACTIVE");
        seat.setGridRow(column == null ? null : 0);
        seat.setGridColumn(column);
        return seats.saveAndFlush(seat);
    }

    private SeatLayoutRequest layout(int number, int column) {
        SeatLayoutRequest seat = new SeatLayoutRequest();
        seat.setRowLabel("A");
        seat.setSeatNumber(number);
        seat.setSeatType("NORMAL");
        seat.setStatus("ACTIVE");
        seat.setGridRow(0);
        seat.setGridColumn(column);
        return seat;
    }

    private void update(CinemaRoom room, SeatLayoutRequest... layout) {
        UpdateCinemaRoomRequest request = new UpdateCinemaRoomRequest();
        request.setName(room.getName());
        request.setRoomType("2D");
        request.setStatus("ACTIVE");
        request.setSeats(Arrays.asList(layout));
        assertThat(service.updateRoom(room.getId(), request).totalSeats()).isEqualTo(layout.length);
    }

    private List<Seat> reload(CinemaRoom room) {
        entityManager.flush();
        entityManager.clear();
        return seats.findByRoomIdOrderByRowLabelAscSeatNumberAsc(room.getId());
    }
}
