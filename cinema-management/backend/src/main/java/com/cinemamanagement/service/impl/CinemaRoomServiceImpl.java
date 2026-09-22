package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.CinemaRoom;
import com.cinemamanagement.entity.Seat;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.CinemaRoomRepository;
import com.cinemamanagement.repository.SeatRepository;
import com.cinemamanagement.request.CreateCinemaRoomRequest;
import com.cinemamanagement.request.SeatTypeUpdateRequest;
import com.cinemamanagement.request.UpdateCinemaRoomRequest;
import com.cinemamanagement.request.UpdateSeatTypesRequest;
import com.cinemamanagement.response.CinemaRoomDetailResponse;
import com.cinemamanagement.response.CinemaRoomListResponse;
import com.cinemamanagement.service.CinemaRoomService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
public class CinemaRoomServiceImpl implements CinemaRoomService {
    private static final Set<String> ALLOWED_SEAT_TYPES = Set.of("NORMAL", "VIP");
    private static final Set<String> ALLOWED_SEAT_STATUSES = Set.of("ACTIVE", "INACTIVE");
    private static final Set<String> ALLOWED_ROOM_STATUSES = Set.of("ACTIVE", "MAINTENANCE", "INACTIVE");

    private final CinemaRoomRepository cinemaRoomRepository;
    private final SeatRepository seatRepository;

    public CinemaRoomServiceImpl(CinemaRoomRepository cinemaRoomRepository, SeatRepository seatRepository) {
        this.cinemaRoomRepository = cinemaRoomRepository;
        this.seatRepository = seatRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<CinemaRoomListResponse> getRooms(String keyword, String status, Pageable pageable) {
        return cinemaRoomRepository.searchRooms(normalize(keyword), normalizeStatus(status), pageable)
                .map(CinemaRoomListResponse::fromEntity);
    }

    @Override
    @Transactional
    public CinemaRoomDetailResponse createRoom(CreateCinemaRoomRequest request) {
        String name = requiredTrim(request.getName());
        if (cinemaRoomRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("Cinema room name already exists");
        }

        CinemaRoom room = new CinemaRoom();
        room.setName(name);
        room.setRoomType(defaultIfBlank(request.getRoomType(), "2D"));
        room.setStatus(normalizeRoomStatus(defaultIfBlank(request.getStatus(), "ACTIVE")));
        room.setTotalSeats(request.getRows() * request.getSeatsPerRow());

        CinemaRoom savedRoom = cinemaRoomRepository.save(room);
        seatRepository.saveAll(buildSeats(savedRoom, request.getRows(), request.getSeatsPerRow()));

        return mapDetail(savedRoom);
    }

    @Override
    @Transactional
    public CinemaRoomDetailResponse updateRoom(Long roomId, UpdateCinemaRoomRequest request) {
        CinemaRoom room = findRoom(roomId);
        String name = requiredTrim(request.getName());
        if (cinemaRoomRepository.existsByNameIgnoreCaseAndIdNot(name, roomId)) {
            throw new ConflictException("Cinema room name already exists");
        }

        room.setName(name);
        room.setRoomType(defaultIfBlank(request.getRoomType(), "2D"));
        room.setStatus(normalizeRoomStatus(defaultIfBlank(request.getStatus(), "ACTIVE")));

        return mapDetail(cinemaRoomRepository.save(room));
    }

    @Override
    @Transactional(readOnly = true)
    public CinemaRoomDetailResponse getRoomDetail(Long roomId) {
        CinemaRoom room = findRoom(roomId);
        return mapDetail(room);
    }

    @Override
    @Transactional
    public CinemaRoomDetailResponse updateSeatTypes(Long roomId, UpdateSeatTypesRequest request) {
        CinemaRoom room = findRoom(roomId);
        if (request == null || request.getSeats() == null || request.getSeats().isEmpty()) {
            throw new BadRequestException("Seats must not be empty");
        }
        validateDuplicateSeatIds(request.getSeats());
        validateSeatUpdates(request.getSeats());

        Set<Long> requestedSeatIds = new HashSet<>();
        for (SeatTypeUpdateRequest item : request.getSeats()) {
            requestedSeatIds.add(item.getSeatId());
        }

        List<Seat> seats = seatRepository.findByRoomIdAndIdIn(roomId, requestedSeatIds);
        if (seats.size() != requestedSeatIds.size()) {
            validateMissingOrForeignSeats(roomId, requestedSeatIds);
        }

        Map<Long, SeatTypeUpdateRequest> updatesBySeatId = new HashMap<>();
        for (SeatTypeUpdateRequest item : request.getSeats()) {
            updatesBySeatId.put(item.getSeatId(), item);
        }

        for (Seat seat : seats) {
            SeatTypeUpdateRequest update = updatesBySeatId.get(seat.getId());
            seat.setSeatType(update.getSeatType().trim().toUpperCase());
            seat.setStatus(update.getStatus().trim().toUpperCase());
        }
        seatRepository.saveAll(seats);

        return mapDetail(room);
    }

    private CinemaRoom findRoom(Long roomId) {
        return cinemaRoomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Cinema room not found with id " + roomId));
    }

    private CinemaRoomDetailResponse mapDetail(CinemaRoom room) {
        List<Seat> seats = seatRepository.findByRoomIdOrderByRowLabelAscSeatNumberAsc(room.getId());
        return CinemaRoomDetailResponse.fromEntity(room, seats);
    }

    private void validateDuplicateSeatIds(List<SeatTypeUpdateRequest> seats) {
        Set<Long> ids = new HashSet<>();
        for (SeatTypeUpdateRequest seat : seats) {
            if (seat == null || seat.getSeatId() == null) {
                throw new BadRequestException("Seat id is required");
            }
            if (!ids.add(seat.getSeatId())) {
                throw new BadRequestException("Duplicate seatId: " + seat.getSeatId());
            }
        }
    }

    private void validateSeatUpdates(List<SeatTypeUpdateRequest> seats) {
        for (SeatTypeUpdateRequest seat : seats) {
            if (seat == null || seat.getSeatType() == null || seat.getSeatType().isBlank()) {
                throw new BadRequestException("Seat type is required");
            }
            String seatType = seat.getSeatType().trim().toUpperCase();
            if (!ALLOWED_SEAT_TYPES.contains(seatType)) {
                throw new BadRequestException("Invalid seatType: " + seat.getSeatType());
            }
            if (seat.getStatus() == null || seat.getStatus().isBlank()) {
                throw new BadRequestException("Seat status is required");
            }
            String status = seat.getStatus().trim().toUpperCase();
            if (!ALLOWED_SEAT_STATUSES.contains(status)) {
                throw new BadRequestException("Invalid seat status: " + seat.getStatus());
            }
        }
    }

    private List<Seat> buildSeats(CinemaRoom room, int rows, int seatsPerRow) {
        List<Seat> seats = new java.util.ArrayList<>(rows * seatsPerRow);
        for (int rowIndex = 0; rowIndex < rows; rowIndex++) {
            String rowLabel = String.valueOf((char) ('A' + rowIndex));
            for (int seatNumber = 1; seatNumber <= seatsPerRow; seatNumber++) {
                Seat seat = new Seat();
                seat.setRoom(room);
                seat.setRowLabel(rowLabel);
                seat.setSeatNumber(seatNumber);
                seat.setSeatType("NORMAL");
                seat.setStatus("ACTIVE");
                seats.add(seat);
            }
        }
        return seats;
    }

    private void validateMissingOrForeignSeats(Long roomId, Set<Long> requestedSeatIds) {
        for (Long seatId : requestedSeatIds) {
            if (!seatRepository.existsById(seatId)) {
                throw new ResourceNotFoundException("Seat not found with id " + seatId);
            }
            if (!seatRepository.existsByIdAndRoomId(seatId, roomId)) {
                throw new BadRequestException("Seat " + seatId + " does not belong to room " + roomId);
            }
        }
    }

    private String normalize(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private String normalizeStatus(String value) {
        String normalized = normalize(value);
        return normalized == null ? null : normalized.toUpperCase();
    }

    private String normalizeRoomStatus(String value) {
        String normalized = value.trim().toUpperCase();
        if (!ALLOWED_ROOM_STATUSES.contains(normalized)) {
            throw new BadRequestException("Invalid room status: " + value);
        }
        return normalized;
    }

    private String requiredTrim(String value) {
        return value == null ? "" : value.trim();
    }

    private String defaultIfBlank(String value, String defaultValue) {
        return value == null || value.trim().isEmpty() ? defaultValue : value.trim();
    }
}
