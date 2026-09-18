package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.CinemaRoom;
import com.cinemamanagement.entity.Seat;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.CinemaRoomRepository;
import com.cinemamanagement.repository.SeatRepository;
import com.cinemamanagement.request.SeatTypeUpdateRequest;
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
        validateSeatTypes(request.getSeats());

        Set<Long> requestedSeatIds = new HashSet<>();
        for (SeatTypeUpdateRequest item : request.getSeats()) {
            requestedSeatIds.add(item.getSeatId());
        }

        List<Seat> seats = seatRepository.findByRoomIdAndIdIn(roomId, requestedSeatIds);
        if (seats.size() != requestedSeatIds.size()) {
            validateMissingOrForeignSeats(roomId, requestedSeatIds);
        }

        Map<Long, String> seatTypesById = new HashMap<>();
        for (SeatTypeUpdateRequest item : request.getSeats()) {
            seatTypesById.put(item.getSeatId(), item.getSeatType().trim().toUpperCase());
        }

        for (Seat seat : seats) {
            if (!"ACTIVE".equalsIgnoreCase(seat.getStatus())) {
                throw new BadRequestException("Inactive seat cannot be updated: " + seat.getRowLabel() + seat.getSeatNumber());
            }
            seat.setSeatType(seatTypesById.get(seat.getId()));
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

    private void validateSeatTypes(List<SeatTypeUpdateRequest> seats) {
        for (SeatTypeUpdateRequest seat : seats) {
            if (seat == null || seat.getSeatType() == null || seat.getSeatType().isBlank()) {
                throw new BadRequestException("Seat type is required");
            }
            String seatType = seat.getSeatType().trim().toUpperCase();
            if (!ALLOWED_SEAT_TYPES.contains(seatType)) {
                throw new BadRequestException("Invalid seatType: " + seat.getSeatType());
            }
        }
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
}
