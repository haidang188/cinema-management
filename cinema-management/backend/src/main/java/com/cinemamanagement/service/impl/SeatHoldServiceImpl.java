package com.cinemamanagement.service.impl;

import com.cinemamanagement.config.properties.BookingProperties;
import com.cinemamanagement.entity.SeatHold;
import com.cinemamanagement.entity.Showtime;
import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.entity.User;
import com.cinemamanagement.enums.SeatHoldStatus;
import com.cinemamanagement.enums.ShowtimeSeatStatus;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.SeatHoldRepository;
import com.cinemamanagement.repository.ShowtimeRepository;
import com.cinemamanagement.repository.ShowtimeSeatRepository;
import com.cinemamanagement.repository.UserRepository;
import com.cinemamanagement.request.HoldSeatsRequest;
import com.cinemamanagement.request.UpdateSeatHoldRequest;
import com.cinemamanagement.response.SeatHoldResponse;
import com.cinemamanagement.service.SeatHoldService;
import com.cinemamanagement.websocket.SeatStatusPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SeatHoldServiceImpl
        implements SeatHoldService {

    private final SeatHoldRepository seatHoldRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final BookingProperties bookingProperties;
    private final SeatStatusPublisher seatStatusPublisher;

    @Override
    @Transactional
    public SeatHoldResponse createHold(
            HoldSeatsRequest request
    ) {
        LocalDateTime now = LocalDateTime.now();

        User user = getMemberUser(request.getUserId());
        Showtime showtime = getOpenShowtime(
                request.getShowtimeId(),
                now
        );

        List<Long> requestedIds = normalizeSeatIds(
                request.getShowtimeSeatIds()
        );

        releaseExpiredHoldOfUser(
                user.getId(),
                showtime.getId(),
                now
        );

        List<SeatHold> existingHolds =
                seatHoldRepository
                        .findAllByUserIdAndShowtimeSeatShowtimeIdAndStatus(
                                user.getId(),
                                showtime.getId(),
                                SeatHoldStatus.ACTIVE.name()
                        );

        if (!existingHolds.isEmpty()) {
            throw new ConflictException(
                    "Bạn đã có một lượt giữ ghế đang hoạt động "
                            + "cho suất chiếu này"
            );
        }

        List<ShowtimeSeat> seats =
                lockRequestedSeats(requestedIds);

        validateSeatsForShowtime(
                seats,
                requestedIds,
                showtime.getId()
        );

        for (ShowtimeSeat seat : seats) {
            if (!ShowtimeSeatStatus.AVAILABLE.name()
                    .equalsIgnoreCase(seat.getStatus())) {
                throw new ConflictException(
                        "Ghế "
                                + formatSeatName(seat)
                                + " không còn trống"
                );
            }
        }

        String holdToken = UUID.randomUUID().toString();
        LocalDateTime expiresAt = now.plusMinutes(
                bookingProperties
                        .getSeatHoldDurationMinutes()
        );

        List<SeatHold> holds = new ArrayList<>();

        for (ShowtimeSeat seat : seats) {
            seat.setStatus(
                    ShowtimeSeatStatus.HELD.name()
            );
            seat.setHeldUntil(expiresAt);

            SeatHold hold = new SeatHold();
            hold.setHoldToken(holdToken);
            hold.setShowtimeSeat(seat);
            hold.setUser(user);
            hold.setHeldAt(now);
            hold.setExpiresAt(expiresAt);
            hold.setStatus(
                    SeatHoldStatus.ACTIVE.name()
            );

            holds.add(hold);
        }

        showtimeSeatRepository.saveAll(seats);
        seatHoldRepository.saveAll(holds);

        seatStatusPublisher.publishHeld(
                showtime.getId(),
                requestedIds,
                expiresAt
        );

        return toResponse(
                holdToken,
                user.getId(),
                showtime.getId(),
                requestedIds,
                now,
                expiresAt,
                SeatHoldStatus.ACTIVE
        );
    }

    @Override
    @Transactional
    public SeatHoldResponse updateHold(
            String holdToken,
            UpdateSeatHoldRequest request
    ) {
        List<SeatHold> activeHolds =
                getOwnedActiveHolds(
                        holdToken,
                        request.getUserId()
                );

        SeatHold firstHold = activeHolds.getFirst();
        LocalDateTime now = LocalDateTime.now();

        if (!firstHold.getExpiresAt().isAfter(now)) {
            expireHoldRows(activeHolds);

            return toResponse(
                    holdToken,
                    request.getUserId(),
                    firstHold.getShowtimeSeat()
                            .getShowtime().getId(),
                    List.of(),
                    firstHold.getHeldAt(),
                    firstHold.getExpiresAt(),
                    SeatHoldStatus.EXPIRED
            );
        }

        Long showtimeId = firstHold
                .getShowtimeSeat()
                .getShowtime()
                .getId();

        List<Long> desiredIds = normalizeSeatIdsAllowEmpty(
                request.getShowtimeSeatIds()
        );

        Map<Long, SeatHold> currentBySeatId =
                activeHolds.stream()
                        .collect(Collectors.toMap(
                                hold -> hold
                                        .getShowtimeSeat()
                                        .getId(),
                                Function.identity()
                        ));

        LinkedHashSet<Long> allIds =
                new LinkedHashSet<>(
                        currentBySeatId.keySet()
                );
        allIds.addAll(desiredIds);

        List<Long> allSortedIds = allIds.stream()
                .sorted()
                .toList();

        List<ShowtimeSeat> lockedSeats =
                lockRequestedSeats(allSortedIds);

        Map<Long, ShowtimeSeat> lockedById =
                lockedSeats.stream()
                        .collect(Collectors.toMap(
                                ShowtimeSeat::getId,
                                Function.identity()
                        ));

        List<Long> releasedIds = new ArrayList<>();
        List<Long> newlyHeldIds = new ArrayList<>();

        for (Map.Entry<Long, SeatHold> entry
                : currentBySeatId.entrySet()) {

            Long seatId = entry.getKey();

            if (!desiredIds.contains(seatId)) {
                SeatHold hold = entry.getValue();
                ShowtimeSeat seat =
                        lockedById.get(seatId);

                hold.setStatus(
                        SeatHoldStatus.RELEASED.name()
                );

                if (seat != null
                        && ShowtimeSeatStatus.HELD.name()
                        .equalsIgnoreCase(
                                seat.getStatus()
                        )) {
                    seat.setStatus(
                            ShowtimeSeatStatus.AVAILABLE.name()
                    );
                    seat.setHeldUntil(null);
                }

                releasedIds.add(seatId);
            }
        }

        List<SeatHold> newHolds = new ArrayList<>();

        for (Long desiredId : desiredIds) {
            if (currentBySeatId.containsKey(desiredId)) {
                continue;
            }

            ShowtimeSeat seat = lockedById.get(desiredId);

            if (seat == null) {
                throw new ResourceNotFoundException(
                        "Không tìm thấy ghế suất chiếu "
                                + desiredId
                );
            }

            if (!seat.getShowtime().getId()
                    .equals(showtimeId)) {
                throw new BadRequestException(
                        "Ghế không thuộc suất chiếu đã chọn"
                );
            }

            if (!ShowtimeSeatStatus.AVAILABLE.name()
                    .equalsIgnoreCase(seat.getStatus())) {
                throw new ConflictException(
                        "Ghế "
                                + formatSeatName(seat)
                                + " không còn trống"
                );
            }

            seat.setStatus(
                    ShowtimeSeatStatus.HELD.name()
            );
            seat.setHeldUntil(
                    firstHold.getExpiresAt()
            );

            SeatHold newHold = new SeatHold();
            newHold.setHoldToken(holdToken);
            newHold.setShowtimeSeat(seat);
            newHold.setUser(firstHold.getUser());
            newHold.setHeldAt(
                    firstHold.getHeldAt()
            );
            newHold.setExpiresAt(
                    firstHold.getExpiresAt()
            );
            newHold.setStatus(
                    SeatHoldStatus.ACTIVE.name()
            );

            newHolds.add(newHold);
            newlyHeldIds.add(desiredId);
        }

        seatHoldRepository.saveAll(activeHolds);
        seatHoldRepository.saveAll(newHolds);
        showtimeSeatRepository.saveAll(lockedSeats);

        if (!releasedIds.isEmpty()) {
            seatStatusPublisher.publishReleased(
                    showtimeId,
                    releasedIds
            );
        }

        if (!newlyHeldIds.isEmpty()) {
            seatStatusPublisher.publishHeld(
                    showtimeId,
                    newlyHeldIds,
                    firstHold.getExpiresAt()
            );
        }

        if (desiredIds.isEmpty()) {
            return toResponse(
                    holdToken,
                    request.getUserId(),
                    showtimeId,
                    List.of(),
                    firstHold.getHeldAt(),
                    firstHold.getExpiresAt(),
                    SeatHoldStatus.RELEASED
            );
        }

        return toResponse(
                holdToken,
                request.getUserId(),
                showtimeId,
                desiredIds,
                firstHold.getHeldAt(),
                firstHold.getExpiresAt(),
                SeatHoldStatus.ACTIVE
        );
    }

    @Override
    @Transactional
    public SeatHoldResponse getActiveHold(
            String holdToken,
            Long userId
    ) {
        List<SeatHold> activeHolds =
                getOwnedActiveHolds(
                        holdToken,
                        userId
                );

        SeatHold firstHold = activeHolds.getFirst();
        LocalDateTime now = LocalDateTime.now();

        if (!firstHold.getExpiresAt().isAfter(now)) {
            expireHoldRows(activeHolds);

            return toResponse(
                    holdToken,
                    userId,
                    firstHold.getShowtimeSeat()
                            .getShowtime().getId(),
                    List.of(),
                    firstHold.getHeldAt(),
                    firstHold.getExpiresAt(),
                    SeatHoldStatus.EXPIRED
            );
        }

        return buildActiveResponse(activeHolds);
    }

    @Override
    @Transactional
    public void releaseHold(
            String holdToken,
            Long userId
    ) {
        List<SeatHold> activeHolds =
                getOwnedActiveHolds(
                        holdToken,
                        userId
                );

        releaseHoldRows(
                activeHolds,
                SeatHoldStatus.RELEASED
        );
    }

    @Override
    @Transactional
    public void expireHolds() {
        LocalDateTime now = LocalDateTime.now();

        List<SeatHold> expiredRows =
                seatHoldRepository
                        .findAllByExpiresAtLessThanEqualAndStatus(
                                now,
                                SeatHoldStatus.ACTIVE.name()
                        );

        Map<String, List<SeatHold>> groups =
                expiredRows.stream()
                        .collect(Collectors.groupingBy(
                                SeatHold::getHoldToken
                        ));

        for (List<SeatHold> group : groups.values()) {
            expireHoldRows(group);
        }
    }

    private User getMemberUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new ResourceNotFoundException(
                                "Không tìm thấy người dùng"
                        )
                );

        if (user.getRole() == null
                || !"MEMBER".equalsIgnoreCase(
                user.getRole().getName()
        )) {
            throw new BadRequestException(
                    "Chỉ tài khoản thành viên "
                            + "mới được đặt vé online"
            );
        }

        return user;
    }

    private Showtime getOpenShowtime(
            Long showtimeId,
            LocalDateTime now
    ) {
        Showtime showtime =
                showtimeRepository.findById(showtimeId)
                        .orElseThrow(() ->
                                new ResourceNotFoundException(
                                        "Không tìm thấy suất chiếu"
                                )
                        );

        if (!"OPEN".equalsIgnoreCase(
                showtime.getStatus()
        )) {
            throw new BadRequestException(
                    "Suất chiếu không còn mở bán"
            );
        }

        if (!now.isBefore(
                showtime.getStartTime().minusMinutes(5)
        )) {
            throw new BadRequestException(
                    "Suất chiếu đã đóng bán vé"
            );
        }

        return showtime;
    }

    private List<Long> normalizeSeatIds(
            List<Long> ids
    ) {
        List<Long> normalized =
                normalizeSeatIdsAllowEmpty(ids);

        if (normalized.isEmpty()) {
            throw new BadRequestException(
                    "Vui lòng chọn ít nhất một ghế"
            );
        }

        return normalized;
    }

    private List<Long> normalizeSeatIdsAllowEmpty(
            List<Long> ids
    ) {
        if (ids == null) {
            throw new BadRequestException(
                    "Danh sách ghế không được để trống"
            );
        }

        return ids.stream()
                .distinct()
                .sorted()
                .toList();
    }

    private List<ShowtimeSeat> lockRequestedSeats(
            List<Long> ids
    ) {
        if (ids.isEmpty()) {
            return new ArrayList<>();
        }

        return new ArrayList<>(
                showtimeSeatRepository
                        .findAllByIdsForUpdate(ids)
        );
    }

    private void validateSeatsForShowtime(
            List<ShowtimeSeat> seats,
            List<Long> requestedIds,
            Long showtimeId
    ) {
        if (seats.size() != requestedIds.size()) {
            throw new ResourceNotFoundException(
                    "Một hoặc nhiều ghế không tồn tại"
            );
        }

        boolean invalidShowtime = seats.stream()
                .anyMatch(seat ->
                        !seat.getShowtime().getId()
                                .equals(showtimeId)
                );

        if (invalidShowtime) {
            throw new BadRequestException(
                    "Một hoặc nhiều ghế không thuộc "
                            + "suất chiếu đã chọn"
            );
        }
    }

    private List<SeatHold> getOwnedActiveHolds(
            String holdToken,
            Long userId
    ) {
        List<SeatHold> holds =
                seatHoldRepository
                        .findAllByHoldTokenAndStatusOrderByIdAsc(
                                holdToken,
                                SeatHoldStatus.ACTIVE.name()
                        );

        if (holds.isEmpty()) {
            if (seatHoldRepository
                    .existsByHoldToken(holdToken)) {
                throw new ConflictException(
                        "Lượt giữ ghế không còn hoạt động"
                );
            }

            throw new ResourceNotFoundException(
                    "Không tìm thấy lượt giữ ghế"
            );
        }

        boolean invalidOwner = holds.stream()
                .anyMatch(hold ->
                        !hold.getUser().getId()
                                .equals(userId)
                );

        if (invalidOwner) {
            throw new BadRequestException(
                    "Lượt giữ ghế không thuộc người dùng này"
            );
        }

        return holds;
    }

    private void releaseExpiredHoldOfUser(
            Long userId,
            Long showtimeId,
            LocalDateTime now
    ) {
        List<SeatHold> holds =
                seatHoldRepository
                        .findAllByUserIdAndShowtimeSeatShowtimeIdAndStatus(
                                userId,
                                showtimeId,
                                SeatHoldStatus.ACTIVE.name()
                        );

        if (holds.isEmpty()) {
            return;
        }

        if (!holds.getFirst().getExpiresAt()
                .isAfter(now)) {
            expireHoldRows(holds);
        }
    }

    private void expireHoldRows(
            List<SeatHold> holds
    ) {
        releaseHoldRows(
                holds,
                SeatHoldStatus.EXPIRED
        );
    }

    private void releaseHoldRows(
            List<SeatHold> holds,
            SeatHoldStatus finalStatus
    ) {
        if (holds.isEmpty()) {
            return;
        }

        List<Long> seatIds = holds.stream()
                .map(hold ->
                        hold.getShowtimeSeat().getId()
                )
                .distinct()
                .sorted()
                .toList();

        List<ShowtimeSeat> seats =
                lockRequestedSeats(seatIds);

        Long showtimeId = holds.getFirst()
                .getShowtimeSeat()
                .getShowtime()
                .getId();

        for (SeatHold hold : holds) {
            hold.setStatus(finalStatus.name());
        }

        for (ShowtimeSeat seat : seats) {
            if (ShowtimeSeatStatus.HELD.name()
                    .equalsIgnoreCase(seat.getStatus())) {
                seat.setStatus(
                        ShowtimeSeatStatus.AVAILABLE.name()
                );
                seat.setHeldUntil(null);
            }
        }

        seatHoldRepository.saveAll(holds);
        showtimeSeatRepository.saveAll(seats);

        seatStatusPublisher.publishReleased(
                showtimeId,
                seatIds
        );
    }

    private SeatHoldResponse buildActiveResponse(
            List<SeatHold> holds
    ) {
        SeatHold first = holds.getFirst();

        List<Long> seatIds = holds.stream()
                .map(hold ->
                        hold.getShowtimeSeat().getId()
                )
                .sorted()
                .toList();

        return toResponse(
                first.getHoldToken(),
                first.getUser().getId(),
                first.getShowtimeSeat()
                        .getShowtime().getId(),
                seatIds,
                first.getHeldAt(),
                first.getExpiresAt(),
                SeatHoldStatus.ACTIVE
        );
    }

    private SeatHoldResponse toResponse(
            String holdToken,
            Long userId,
            Long showtimeId,
            List<Long> seatIds,
            LocalDateTime heldAt,
            LocalDateTime expiresAt,
            SeatHoldStatus status
    ) {
        return new SeatHoldResponse(
                holdToken,
                userId,
                showtimeId,
                List.copyOf(seatIds),
                heldAt,
                expiresAt,
                status.name()
        );
    }

    private String formatSeatName(
            ShowtimeSeat showtimeSeat
    ) {
        return showtimeSeat.getSeat().getRowLabel()
                + showtimeSeat.getSeat().getSeatNumber();
    }
}