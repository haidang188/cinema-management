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
import com.cinemamanagement.exception.SeatConflictException;
import com.cinemamanagement.repository.CounterOrderRepository;
import com.cinemamanagement.repository.SeatHoldRepository;
import com.cinemamanagement.repository.ShowtimeRepository;
import com.cinemamanagement.repository.ShowtimeSeatRepository;
import com.cinemamanagement.repository.UserRepository;
import com.cinemamanagement.request.HoldSeatsRequest;
import com.cinemamanagement.request.UpdateSeatHoldRequest;
import com.cinemamanagement.response.SeatHoldActionResponse;
import com.cinemamanagement.response.SeatHoldResponse;
import com.cinemamanagement.response.SeatStateResponse;
import com.cinemamanagement.service.HoldPolicyService;
import com.cinemamanagement.service.SeatEventPublisher;
import com.cinemamanagement.service.SeatHoldService;
import com.cinemamanagement.util.HoldTokens;
import com.cinemamanagement.websocket.SeatStatusPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import static com.cinemamanagement.service.SeatHoldService.clearHold;
import static com.cinemamanagement.service.SeatHoldService.isActiveHold;
import static com.cinemamanagement.service.SeatHoldService.isFree;

@Slf4j
@Service
@RequiredArgsConstructor
public class SeatHoldServiceImpl implements SeatHoldService {

    public static final Duration PAID_GRACE = Duration.ofMinutes(3);
    private static final int SELLING_CUTOFF_MINUTES = 5;

    private final SeatHoldRepository seatHoldRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final UserRepository userRepository;
    private final CounterOrderRepository counterOrderRepository;
    private final BookingProperties bookingProperties;
    private final HoldPolicyService holdPolicyService;
    private final SeatStatusPublisher seatStatusPublisher;
    private final SeatEventPublisher seatEventPublisher;

    /* API giữ ghế của luồng đặt vé online hiện có. */

    @Override
    @Transactional
    public SeatHoldResponse createHold(HoldSeatsRequest request) {
        LocalDateTime now = LocalDateTime.now();
        User user = getMemberUser(request.getUserId());
        Showtime showtime = getOpenShowtime(request.getShowtimeId(), now);
        List<Long> requestedIds = normalizeRequiredIds(request.getShowtimeSeatIds());

        releaseExpiredHoldOfUser(user.getId(), showtime.getId(), now);
        List<SeatHold> existing = seatHoldRepository
                .findAllByUserIdAndShowtimeSeatShowtimeIdAndStatus(
                        user.getId(), showtime.getId(), SeatHoldStatus.ACTIVE.name());
        if (!existing.isEmpty()) {
            throw new ConflictException(
                    "Bạn đã có một lượt giữ ghế đang hoạt động cho suất chiếu này");
        }

        List<ShowtimeSeat> seats = lockRequestedSeats(requestedIds);
        validateSeats(seats, requestedIds, showtime.getId());
        List<String> conflicts = seats.stream()
                .filter(seat -> !isFree(seat, now))
                .map(this::seatCode)
                .toList();
        if (!conflicts.isEmpty()) {
            throw new SeatConflictException(conflicts);
        }

        String token = UUID.randomUUID().toString();
        String owner = HoldTokens.owner(token);
        LocalDateTime expiresAt = now.plusMinutes(
                bookingProperties.getSeatHoldDurationMinutes());
        List<SeatHold> holds = new ArrayList<>();

        for (ShowtimeSeat seat : seats) {
            markHeld(seat, owner, expiresAt);
            SeatHold hold = new SeatHold();
            hold.setHoldToken(token);
            hold.setShowtimeSeat(seat);
            hold.setUser(user);
            hold.setHeldAt(now);
            hold.setExpiresAt(expiresAt);
            hold.setStatus(SeatHoldStatus.ACTIVE.name());
            holds.add(hold);
        }

        showtimeSeatRepository.saveAll(seats);
        seatHoldRepository.saveAll(holds);
        publishOnlineHeld(showtime.getId(), seats, requestedIds, expiresAt);
        return oldResponse(token, user.getId(), showtime.getId(), requestedIds,
                now, expiresAt, SeatHoldStatus.ACTIVE);
    }

    @Override
    @Transactional
    public SeatHoldResponse updateHold(String token, UpdateSeatHoldRequest request) {
        List<SeatHold> activeHolds = ownedActiveHolds(token, request.getUserId());
        SeatHold first = activeHolds.getFirst();
        LocalDateTime now = LocalDateTime.now();
        Long showtimeId = first.getShowtimeSeat().getShowtime().getId();

        if (!first.getExpiresAt().isAfter(now)) {
            releaseHoldRows(activeHolds, SeatHoldStatus.EXPIRED);
            return oldResponse(token, request.getUserId(), showtimeId, List.of(),
                    first.getHeldAt(), first.getExpiresAt(), SeatHoldStatus.EXPIRED);
        }

        String owner = HoldTokens.owner(token);
        List<Long> desiredIds = normalizeIds(request.getShowtimeSeatIds(), false);
        Map<Long, SeatHold> currentById = activeHolds.stream().collect(
                Collectors.toMap(h -> h.getShowtimeSeat().getId(), Function.identity()));
        LinkedHashSet<Long> allIds = new LinkedHashSet<>(currentById.keySet());
        allIds.addAll(desiredIds);
        List<ShowtimeSeat> locked = lockRequestedSeats(
                allIds.stream().sorted().toList());
        Map<Long, ShowtimeSeat> lockedById = locked.stream().collect(
                Collectors.toMap(ShowtimeSeat::getId, Function.identity()));

        List<Long> releasedIds = new ArrayList<>();
        List<Long> addedIds = new ArrayList<>();
        List<SeatHold> newHolds = new ArrayList<>();

        for (Map.Entry<Long, SeatHold> entry : currentById.entrySet()) {
            if (desiredIds.contains(entry.getKey())) {
                continue;
            }
            entry.getValue().setStatus(SeatHoldStatus.RELEASED.name());
            ShowtimeSeat seat = lockedById.get(entry.getKey());
            if (seat != null && owner.equals(seat.getHoldOwner())) {
                clearHold(seat);
            }
            releasedIds.add(entry.getKey());
        }

        for (Long desiredId : desiredIds) {
            if (currentById.containsKey(desiredId)) {
                continue;
            }
            ShowtimeSeat seat = lockedById.get(desiredId);
            if (seat == null) {
                throw new ResourceNotFoundException(
                        "Không tìm thấy ghế suất chiếu " + desiredId);
            }
            if (!seat.getShowtime().getId().equals(showtimeId)) {
                throw new BadRequestException(
                        "Ghế không thuộc suất chiếu đã chọn");
            }
            if (!isFree(seat, now)) {
                throw new ConflictException(
                        "Ghế " + seatCode(seat) + " không còn trống");
            }

            markHeld(seat, owner, first.getExpiresAt());
            SeatHold hold = new SeatHold();
            hold.setHoldToken(token);
            hold.setShowtimeSeat(seat);
            hold.setUser(first.getUser());
            hold.setHeldAt(first.getHeldAt());
            hold.setExpiresAt(first.getExpiresAt());
            hold.setStatus(SeatHoldStatus.ACTIVE.name());
            newHolds.add(hold);
            addedIds.add(desiredId);
        }

        seatHoldRepository.saveAll(activeHolds);
        seatHoldRepository.saveAll(newHolds);
        showtimeSeatRepository.saveAll(locked);
        publishOnlineChanges(showtimeId, lockedById, releasedIds,
                addedIds, first.getExpiresAt());

        SeatHoldStatus status = desiredIds.isEmpty()
                ? SeatHoldStatus.RELEASED : SeatHoldStatus.ACTIVE;
        return oldResponse(token, request.getUserId(), showtimeId, desiredIds,
                first.getHeldAt(), first.getExpiresAt(), status);
    }

    @Override
    @Transactional
    public SeatHoldResponse getActiveHold(String token, Long userId) {
        List<SeatHold> holds = ownedActiveHolds(token, userId);
        SeatHold first = holds.getFirst();
        Long showtimeId = first.getShowtimeSeat().getShowtime().getId();
        if (!first.getExpiresAt().isAfter(LocalDateTime.now())) {
            releaseHoldRows(holds, SeatHoldStatus.EXPIRED);
            return oldResponse(token, userId, showtimeId, List.of(),
                    first.getHeldAt(), first.getExpiresAt(), SeatHoldStatus.EXPIRED);
        }
        return oldResponse(token, userId, showtimeId,
                holds.stream().map(h -> h.getShowtimeSeat().getId()).sorted().toList(),
                first.getHeldAt(), first.getExpiresAt(), SeatHoldStatus.ACTIVE);
    }

    @Override
    @Transactional
    public void releaseHold(String token, Long userId) {
        releaseHoldRows(ownedActiveHolds(token, userId),
                SeatHoldStatus.RELEASED);
    }

    /* API thời gian thực dùng cho màn bán vé tại quầy. */

    @Override
    @Transactional
    public SeatHoldActionResponse hold(
            Long showtimeId,
            String token,
            List<Long> showtimeSeatIds,
            boolean allowPartial
    ) {
        LocalDateTime now = LocalDateTime.now();
        getOpenShowtime(showtimeId, now);
        List<Long> requestedIds = normalizeRequiredIds(showtimeSeatIds);
        String owner = HoldTokens.owner(token);
        HoldPolicyService.Rule rule = holdPolicyService.resolve(owner, true);

        List<ShowtimeSeat> requested = showtimeSeatRepository
                .lockByShowtimeAndIds(showtimeId, requestedIds);
        validateSeats(requested, requestedIds, showtimeId);
        List<ShowtimeSeat> mine = showtimeSeatRepository
                .lockHeldBy(showtimeId, owner).stream()
                .filter(seat -> isActiveHold(seat, now))
                .toList();
        Set<Long> mineIds = mine.stream()
                .map(ShowtimeSeat::getId)
                .collect(Collectors.toSet());

        List<ShowtimeSeat> available = new ArrayList<>();
        List<String> conflicts = new ArrayList<>();
        for (ShowtimeSeat seat : requested) {
            if (mineIds.contains(seat.getId())) {
                continue;
            }
            if (isFree(seat, now)) {
                available.add(seat);
            } else {
                conflicts.add(seatCode(seat));
            }
        }
        if (!allowPartial && !conflicts.isEmpty()) {
            throw new SeatConflictException(conflicts);
        }
        if (rule.maxSeats() != null
                && mineIds.size() + available.size() > rule.maxSeats()) {
            throw new BadRequestException(
                    "Chỉ được giữ tối đa " + rule.maxSeats() + " ghế");
        }

        LocalDateTime expiresAt = mine.stream()
                .map(ShowtimeSeat::getHeldUntil)
                .min(Comparator.naturalOrder())
                .orElseGet(() -> now.plus(rule.duration()));
        available.forEach(seat -> markHeld(seat, owner, expiresAt));
        if (!available.isEmpty()) {
            showtimeSeatRepository.saveAll(available);
            seatEventPublisher.publishAfterCommit(showtimeId, available);
        }

        List<Long> heldIds = new ArrayList<>(mineIds);
        available.stream().map(ShowtimeSeat::getId).forEach(heldIds::add);
        heldIds = heldIds.stream().distinct().sorted().toList();
        holdPolicyService.syncOrderExpiry(
                rule, heldIds.isEmpty() ? null : expiresAt);
        return actionResponse(showtimeId, heldIds,
                heldIds.isEmpty() ? null : expiresAt, now, conflicts);
    }

    @Override
    @Transactional
    public SeatHoldActionResponse release(
            Long showtimeId,
            String token,
            List<Long> showtimeSeatIds
    ) {
        String owner = HoldTokens.owner(token);
        Set<Long> selectedIds = new HashSet<>(
                normalizeNullableIds(showtimeSeatIds));
        LocalDateTime now = LocalDateTime.now();
        List<ShowtimeSeat> mine = showtimeSeatRepository
                .lockHeldBy(showtimeId, owner);
        List<ShowtimeSeat> released = new ArrayList<>();
        List<ShowtimeSeat> kept = new ArrayList<>();

        for (ShowtimeSeat seat : mine) {
            if (selectedIds.isEmpty() || selectedIds.contains(seat.getId())) {
                clearHold(seat);
                released.add(seat);
            } else if (isActiveHold(seat, now)) {
                kept.add(seat);
            }
        }
        if (!released.isEmpty()) {
            showtimeSeatRepository.saveAll(released);
            seatEventPublisher.publishAfterCommit(showtimeId, released);
        }

        LocalDateTime expiry = kept.stream()
                .map(ShowtimeSeat::getHeldUntil)
                .min(Comparator.naturalOrder())
                .orElse(null);
        HoldPolicyService.Rule rule = holdPolicyService.resolve(owner, false);
        holdPolicyService.syncOrderExpiry(rule, expiry);
        return actionResponse(showtimeId,
                kept.stream().map(ShowtimeSeat::getId).sorted().toList(),
                expiry, now, List.of());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SeatStateResponse> getSeatStates(Long showtimeId) {
        LocalDateTime now = LocalDateTime.now();
        return showtimeSeatRepository
                .findAllByShowtimeIdWithSeat(showtimeId).stream()
                .map(seat -> SeatStateResponse.of(seat, now))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public LocalDateTime requireActiveHold(
            Long showtimeId,
            String token,
            Collection<Long> showtimeSeatIds
    ) {
        String owner = HoldTokens.owner(token);
        LocalDateTime now = LocalDateTime.now();
        Map<Long, ShowtimeSeat> mine = showtimeSeatRepository
                .findAllByShowtimeIdWithSeat(showtimeId).stream()
                .filter(seat -> owner.equals(seat.getHoldOwner())
                        && isActiveHold(seat, now))
                .collect(Collectors.toMap(
                        ShowtimeSeat::getId, Function.identity()));
        List<Long> requested = normalizeNullableIds(
                showtimeSeatIds == null
                        ? null : new ArrayList<>(showtimeSeatIds));
        if (requested.isEmpty()
                || requested.stream().anyMatch(id -> !mine.containsKey(id))) {
            throw new ConflictException(
                    "Hết thời gian giữ ghế, vui lòng chọn lại ghế");
        }
        return requested.stream().map(mine::get)
                .map(ShowtimeSeat::getHeldUntil)
                .min(Comparator.naturalOrder())
                .orElseThrow();
    }

    @Override
    @Transactional
    public long extendAfterPayment(Long showtimeId, String owner) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime until = now.plus(PAID_GRACE);
        List<ShowtimeSeat> mine = showtimeSeatRepository
                .lockHeldBy(showtimeId, owner);
        mine.forEach(seat -> {
            if (seat.getHeldUntil() == null
                    || seat.getHeldUntil().isBefore(until)) {
                seat.setHeldUntil(until);
            }
        });
        showtimeSeatRepository.saveAll(mine);
        seatEventPublisher.publishAfterCommit(showtimeId, mine);
        return secondsLeft(until, now);
    }

    @Override
    @Transactional
    public List<Long> setHoldExpiry(
            Long showtimeId,
            String owner,
            LocalDateTime until
    ) {
        LocalDateTime now = LocalDateTime.now();
        List<ShowtimeSeat> mine = showtimeSeatRepository
                .lockHeldBy(showtimeId, owner).stream()
                .filter(seat -> isActiveHold(seat, now))
                .toList();
        mine.forEach(seat -> seat.setHeldUntil(until));
        showtimeSeatRepository.saveAll(mine);
        seatEventPublisher.publishAfterCommit(showtimeId, mine);
        return mine.stream().map(ShowtimeSeat::getId).sorted().toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<Long> heldSeatIds(Long showtimeId, String owner) {
        LocalDateTime now = LocalDateTime.now();
        return showtimeSeatRepository
                .findAllByShowtimeIdWithSeat(showtimeId).stream()
                .filter(seat -> owner.equals(seat.getHoldOwner())
                        && isActiveHold(seat, now))
                .map(ShowtimeSeat::getId)
                .sorted()
                .toList();
    }

    @Override
    @Transactional
    public void expireHolds() {
        LocalDateTime now = LocalDateTime.now();
        seatHoldRepository.findAllByExpiresAtLessThanEqualAndStatus(
                        now, SeatHoldStatus.ACTIVE.name()).stream()
                .collect(Collectors.groupingBy(SeatHold::getHoldToken))
                .values()
                .forEach(holds -> releaseHoldRows(
                        holds, SeatHoldStatus.EXPIRED));

        List<ShowtimeSeat> expired = showtimeSeatRepository
                .lockExpiredHolds(now);
        if (!expired.isEmpty()) {
            expired.forEach(SeatHoldService::clearHold);
            showtimeSeatRepository.saveAll(expired);
            expired.stream().collect(Collectors.groupingBy(
                            seat -> seat.getShowtime().getId()))
                    .forEach(seatEventPublisher::publishAfterCommit);
            log.info("Đã trả {} ghế hết hạn giữ về trạng thái trống",
                    expired.size());
        }
        counterOrderRepository.expireOverdue(now);
    }

    private User getMemberUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy người dùng"));
        if (user.getRole() == null
                || !"MEMBER".equalsIgnoreCase(user.getRole().getName())) {
            throw new BadRequestException(
                    "Chỉ tài khoản thành viên mới được đặt vé online");
        }
        return user;
    }

    private Showtime getOpenShowtime(Long showtimeId, LocalDateTime now) {
        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Không tìm thấy suất chiếu"));
        if (!"OPEN".equalsIgnoreCase(showtime.getStatus())) {
            throw new BadRequestException("Suất chiếu không còn mở bán");
        }
        if (!now.isBefore(showtime.getStartTime()
                .minusMinutes(SELLING_CUTOFF_MINUTES))) {
            throw new BadRequestException("Suất chiếu đã đóng bán vé");
        }
        return showtime;
    }

    private List<Long> normalizeRequiredIds(List<Long> ids) {
        List<Long> normalized = normalizeIds(ids, true);
        if (normalized.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn ít nhất một ghế");
        }
        return normalized;
    }

    private List<Long> normalizeIds(List<Long> ids, boolean rejectNull) {
        if (ids == null) {
            if (rejectNull) {
                throw new BadRequestException(
                        "Danh sách ghế không được để trống");
            }
            return List.of();
        }
        return ids.stream().filter(Objects::nonNull)
                .distinct().sorted().toList();
    }

    private List<Long> normalizeNullableIds(List<Long> ids) {
        return normalizeIds(ids, false);
    }

    private List<ShowtimeSeat> lockRequestedSeats(List<Long> ids) {
        return ids.isEmpty()
                ? new ArrayList<>()
                : new ArrayList<>(
                        showtimeSeatRepository.findAllByIdsForUpdate(ids));
    }

    private void validateSeats(
            List<ShowtimeSeat> seats,
            List<Long> requestedIds,
            Long showtimeId
    ) {
        if (seats.size() != requestedIds.size()) {
            throw new ResourceNotFoundException(
                    "Một hoặc nhiều ghế không tồn tại");
        }
        if (seats.stream().anyMatch(
                seat -> !seat.getShowtime().getId().equals(showtimeId))) {
            throw new BadRequestException(
                    "Một hoặc nhiều ghế không thuộc suất chiếu đã chọn");
        }
    }

    private List<SeatHold> ownedActiveHolds(String token, Long userId) {
        List<SeatHold> holds = seatHoldRepository
                .findAllByHoldTokenAndStatusOrderByIdAsc(
                        token, SeatHoldStatus.ACTIVE.name());
        if (holds.isEmpty()) {
            if (seatHoldRepository.existsByHoldToken(token)) {
                throw new ConflictException(
                        "Lượt giữ ghế không còn hoạt động");
            }
            throw new ResourceNotFoundException(
                    "Không tìm thấy lượt giữ ghế");
        }
        if (holds.stream().anyMatch(
                hold -> !hold.getUser().getId().equals(userId))) {
            throw new BadRequestException(
                    "Lượt giữ ghế không thuộc người dùng này");
        }
        return holds;
    }

    private void releaseExpiredHoldOfUser(
            Long userId,
            Long showtimeId,
            LocalDateTime now
    ) {
        List<SeatHold> holds = seatHoldRepository
                .findAllByUserIdAndShowtimeSeatShowtimeIdAndStatus(
                        userId, showtimeId, SeatHoldStatus.ACTIVE.name());
        if (!holds.isEmpty()
                && !holds.getFirst().getExpiresAt().isAfter(now)) {
            releaseHoldRows(holds, SeatHoldStatus.EXPIRED);
        }
    }

    private void releaseHoldRows(
            List<SeatHold> holds,
            SeatHoldStatus finalStatus
    ) {
        if (holds.isEmpty()) {
            return;
        }
        List<Long> ids = holds.stream()
                .map(hold -> hold.getShowtimeSeat().getId())
                .distinct().sorted().toList();
        List<ShowtimeSeat> seats = lockRequestedSeats(ids);
        SeatHold first = holds.getFirst();
        Long showtimeId = first.getShowtimeSeat()
                .getShowtime().getId();
        String owner = HoldTokens.owner(first.getHoldToken());

        holds.forEach(hold -> hold.setStatus(finalStatus.name()));
        List<ShowtimeSeat> released = new ArrayList<>();
        for (ShowtimeSeat seat : seats) {
            boolean legacyOwned = seat.getHoldOwner() == null
                    && Objects.equals(
                            seat.getHeldUntil(), first.getExpiresAt());
            if (owner.equals(seat.getHoldOwner()) || legacyOwned) {
                clearHold(seat);
                released.add(seat);
            }
        }
        seatHoldRepository.saveAll(holds);
        showtimeSeatRepository.saveAll(released);
        List<Long> releasedIds = released.stream()
                .map(ShowtimeSeat::getId).toList();
        if (!releasedIds.isEmpty()) {
            seatStatusPublisher.publishReleased(
                    showtimeId, releasedIds);
            seatEventPublisher.publishAfterCommit(
                    showtimeId, released);
        }
    }

    private SeatHoldResponse oldResponse(
            String token,
            Long userId,
            Long showtimeId,
            List<Long> ids,
            LocalDateTime heldAt,
            LocalDateTime expiresAt,
            SeatHoldStatus status
    ) {
        return new SeatHoldResponse(token, userId, showtimeId,
                List.copyOf(ids), heldAt, expiresAt, status.name());
    }

    private SeatHoldActionResponse actionResponse(
            Long showtimeId,
            List<Long> ids,
            LocalDateTime expiresAt,
            LocalDateTime now,
            List<String> skipped
    ) {
        return new SeatHoldActionResponse(showtimeId, List.copyOf(ids),
                expiresAt == null ? 0 : secondsLeft(expiresAt, now),
                List.copyOf(skipped));
    }

    private void publishOnlineHeld(
            Long showtimeId,
            List<ShowtimeSeat> seats,
            List<Long> ids,
            LocalDateTime expiresAt
    ) {
        seatStatusPublisher.publishHeld(showtimeId, ids, expiresAt);
        seatEventPublisher.publishAfterCommit(showtimeId, seats);
    }

    private void publishOnlineChanges(
            Long showtimeId,
            Map<Long, ShowtimeSeat> byId,
            List<Long> released,
            List<Long> added,
            LocalDateTime expiresAt
    ) {
        if (!released.isEmpty()) {
            seatStatusPublisher.publishReleased(showtimeId, released);
        }
        if (!added.isEmpty()) {
            seatStatusPublisher.publishHeld(
                    showtimeId, added, expiresAt);
        }
        List<ShowtimeSeat> changed = new ArrayList<>();
        released.stream().map(byId::get).filter(Objects::nonNull)
                .forEach(changed::add);
        added.stream().map(byId::get).filter(Objects::nonNull)
                .forEach(changed::add);
        seatEventPublisher.publishAfterCommit(showtimeId, changed);
    }

    private void markHeld(
            ShowtimeSeat seat,
            String owner,
            LocalDateTime expiresAt
    ) {
        seat.setStatus(ShowtimeSeatStatus.HELD.name());
        seat.setHoldOwner(owner);
        seat.setHeldUntil(expiresAt);
    }

    private String seatCode(ShowtimeSeat seat) {
        return seat.getSeat().getRowLabel()
                + seat.getSeat().getSeatNumber();
    }

    private static long secondsLeft(
            LocalDateTime until,
            LocalDateTime now
    ) {
        long millis = Duration.between(now, until).toMillis();
        return millis <= 0 ? 0 : (millis + 999) / 1000;
    }
}
