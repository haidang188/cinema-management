package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.CinemaRoom;
import com.cinemamanagement.entity.Seat;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.BookingSeatRepository;
import com.cinemamanagement.repository.CinemaRoomRepository;
import com.cinemamanagement.repository.SeatRepository;
import com.cinemamanagement.request.CreateCinemaRoomRequest;
import com.cinemamanagement.request.SeatTypeUpdateRequest;
import com.cinemamanagement.request.UpdateCinemaRoomRequest;
import com.cinemamanagement.request.UpdateSeatTypesRequest;
import com.cinemamanagement.response.CinemaRoomDetailResponse;
import com.cinemamanagement.response.CinemaRoomListResponse;
import com.cinemamanagement.service.CinemaRoomService;
import org.springframework.dao.DataIntegrityViolationException;
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
    private final BookingSeatRepository bookingSeatRepository;

    public CinemaRoomServiceImpl(
            CinemaRoomRepository cinemaRoomRepository,
            SeatRepository seatRepository,
            BookingSeatRepository bookingSeatRepository
    ) {
        this.cinemaRoomRepository = cinemaRoomRepository;
        this.seatRepository = seatRepository;
        this.bookingSeatRepository = bookingSeatRepository;
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
        if (name.isBlank()) {
            throw new BadRequestException("Room name is required");
        }
        if (cinemaRoomRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("Cinema room name already exists");
        }
        String roomType = requiredTrim(request.getRoomType());
        if (roomType.isBlank()) {
            throw new BadRequestException("Room type is required");
        }
        String status = requiredTrim(request.getStatus());
        if (status.isBlank()) {
            throw new BadRequestException("Room status is required");
        }
        List<CreateCinemaRoomRequest.SeatLayoutRequest> requestedSeats = validateCreateSeats(request.getSeats());
        int totalSeats = requestedSeats.size();

        CinemaRoom room = new CinemaRoom();
        room.setName(name);
        room.setRoomType(roomType);
        room.setStatus(normalizeRoomStatus(status));
        room.setTotalSeats(totalSeats);

        CinemaRoom savedRoom = cinemaRoomRepository.save(room);
        seatRepository.saveAll(buildSeats(savedRoom, requestedSeats));

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
        if (request.getSeats() != null) {
            List<CreateCinemaRoomRequest.SeatLayoutRequest> requestedSeats = validateCreateSeats(request.getSeats());
            syncRoomSeats(room, requestedSeats);
            room.setTotalSeats(requestedSeats.size());
        }

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

    @Override
    @Transactional
    public void deleteRoom(Long roomId) {
        CinemaRoom room = findRoom(roomId);
        try {
            seatRepository.deleteByRoomId(roomId);
            cinemaRoomRepository.delete(room);
            cinemaRoomRepository.flush();
        } catch (DataIntegrityViolationException exception) {
            throw new BadRequestException("Cannot delete cinema room because it is being used by showtimes or bookings");
        }
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

    private List<CreateCinemaRoomRequest.SeatLayoutRequest> validateCreateSeats(
            List<CreateCinemaRoomRequest.SeatLayoutRequest> seats
    ) {
        if (seats == null || seats.isEmpty()) {
            throw new BadRequestException("Seats are required");
        }

        Set<String> seatKeys = new HashSet<>();
        Set<String> gridKeys = new HashSet<>();
        for (CreateCinemaRoomRequest.SeatLayoutRequest seat : seats) {
            if (seat == null) {
                throw new BadRequestException("Seat layout is required");
            }

            String rowLabel = requiredTrim(seat.getRowLabel()).toUpperCase();
            if (rowLabel.isBlank()) {
                throw new BadRequestException("Row label is required");
            }
            if (rowLabel.length() > 5) {
                throw new BadRequestException("Row label must be at most 5 characters");
            }

            Integer seatNumber = seat.getSeatNumber();
            if (seatNumber == null || seatNumber <= 0) {
                throw new BadRequestException("Seat number must be greater than 0 for row " + rowLabel);
            }
            String seatKey = rowLabel + "-" + seatNumber;
            if (!seatKeys.add(seatKey)) {
                throw new BadRequestException("Duplicate seat: " + rowLabel + seatNumber);
            }

            Integer gridRow = seat.getGridRow();
            if (gridRow == null || gridRow < 0) {
                throw new BadRequestException("gridRow must be greater than or equal to 0 for seat " + rowLabel + seatNumber);
            }
            Integer gridColumn = seat.getGridColumn();
            if (gridColumn == null || gridColumn < 0) {
                throw new BadRequestException("gridColumn must be greater than or equal to 0 for seat " + rowLabel + seatNumber);
            }
            String gridKey = gridRow + "-" + gridColumn;
            if (!gridKeys.add(gridKey)) {
                throw new BadRequestException("Duplicate grid position: row " + gridRow + ", column " + gridColumn);
            }

            String seatType = defaultIfBlank(seat.getSeatType(), "NORMAL").toUpperCase();
            validateSeatType(seatType);

            String status = defaultIfBlank(seat.getStatus(), "ACTIVE").toUpperCase();
            if (!ALLOWED_SEAT_STATUSES.contains(status)) {
                throw new BadRequestException("Invalid seat status: " + seat.getStatus());
            }

            seat.setRowLabel(rowLabel);
            seat.setSeatType(seatType);
            seat.setStatus(status);
        }

        return seats;
    }

    private void validateSeatType(String seatType) {
        if (!ALLOWED_SEAT_TYPES.contains(seatType)) {
            throw new BadRequestException("Invalid seatType: " + seatType);
        }
    }

    private List<Seat> buildSeats(
            CinemaRoom room,
            List<CreateCinemaRoomRequest.SeatLayoutRequest> requestedSeats
    ) {
        List<Seat> seats = new java.util.ArrayList<>(requestedSeats.size());
        for (CreateCinemaRoomRequest.SeatLayoutRequest requestedSeat : requestedSeats) {
            Seat seat = new Seat();
            seat.setRoom(room);
            seat.setRowLabel(requestedSeat.getRowLabel());
            seat.setSeatNumber(requestedSeat.getSeatNumber());
            seat.setSeatType(requestedSeat.getSeatType());
            seat.setStatus(requestedSeat.getStatus());
            seat.setGridRow(requestedSeat.getGridRow());
            seat.setGridColumn(requestedSeat.getGridColumn());
            seats.add(seat);
        }
        return seats;
    }

    private void syncRoomSeats(
            CinemaRoom room,
            List<CreateCinemaRoomRequest.SeatLayoutRequest> requestedSeats
    ) {
        List<Seat> existingSeats = seatRepository.findByRoomIdOrderByRowLabelAscSeatNumberAsc(room.getId());
        Map<String, Seat> existingByGridPosition = new HashMap<>();
        for (Seat seat : existingSeats) {
            if (seat.getGridRow() != null && seat.getGridColumn() != null) {
                existingByGridPosition.put(gridKey(seat.getGridRow(), seat.getGridColumn()), seat);
            }
        }

        Set<String> requestedGridPositions = new HashSet<>();
        for (CreateCinemaRoomRequest.SeatLayoutRequest requestedSeat : requestedSeats) {
            requestedGridPositions.add(gridKey(requestedSeat.getGridRow(), requestedSeat.getGridColumn()));
        }

        List<Seat> seatsToDelete = new java.util.ArrayList<>();
        for (Seat existingSeat : existingSeats) {
            String existingGridKey = existingSeat.getGridRow() == null || existingSeat.getGridColumn() == null
                    ? null
                    : gridKey(existingSeat.getGridRow(), existingSeat.getGridColumn());
            if (existingGridKey == null || !requestedGridPositions.contains(existingGridKey)) {
                if (bookingSeatRepository.existsBySeatId(existingSeat.getId())) {
                    throw new BadRequestException("Cannot remove booked seat " + existingSeat.getRowLabel() + existingSeat.getSeatNumber());
                }
                seatsToDelete.add(existingSeat);
            }
        }

        if (!seatsToDelete.isEmpty()) {
            seatRepository.deleteAll(seatsToDelete);
            seatRepository.flush();
        }

        List<Seat> seatsToSave = new java.util.ArrayList<>(requestedSeats.size());
        for (CreateCinemaRoomRequest.SeatLayoutRequest requestedSeat : requestedSeats) {
            String requestedGridKey = gridKey(requestedSeat.getGridRow(), requestedSeat.getGridColumn());
            Seat seat = existingByGridPosition.getOrDefault(requestedGridKey, new Seat());
            seat.setRoom(room);
            seat.setRowLabel(requestedSeat.getRowLabel());
            seat.setSeatNumber(requestedSeat.getSeatNumber());
            seat.setSeatType(requestedSeat.getSeatType());
            seat.setStatus(requestedSeat.getStatus());
            seat.setGridRow(requestedSeat.getGridRow());
            seat.setGridColumn(requestedSeat.getGridColumn());
            seatsToSave.add(seat);
        }
        seatRepository.saveAll(seatsToSave);
    }

    private String gridKey(Integer gridRow, Integer gridColumn) {
        return gridRow + "-" + gridColumn;
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
