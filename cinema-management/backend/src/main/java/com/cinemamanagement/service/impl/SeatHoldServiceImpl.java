package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Showtime;
import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.exception.SeatConflictException;
import com.cinemamanagement.repository.CounterOrderRepository;
import com.cinemamanagement.repository.ShowtimeRepository;
import com.cinemamanagement.repository.ShowtimeSeatRepository;
import com.cinemamanagement.response.SeatHoldResponse;
import com.cinemamanagement.response.SeatStateResponse;
import com.cinemamanagement.service.HoldPolicyService;
import com.cinemamanagement.util.HoldTokens;
import com.cinemamanagement.service.SeatEventPublisher;
import com.cinemamanagement.service.SeatHoldService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

import static com.cinemamanagement.service.SeatHoldService.clearHold;
import static com.cinemamanagement.service.SeatHoldService.isActiveHold;
import static com.cinemamanagement.service.SeatHoldService.isFree;

/**
 * GIỮ GHẾ TẠM THỜI
 * - Chọn ghế = giữ ghế ngay (HELD + held_until + hold_owner).
 * - Hạn 5 phút tính từ ghế đầu tiên của phiên; chọn thêm ghế không kéo dài hạn.
 * - Hết hạn: job 5 giây/lần trả ghế về AVAILABLE và báo qua WebSocket.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SeatHoldServiceImpl implements SeatHoldService {

    /** Gia hạn khi khách đã chuyển khoản thành công để nhân viên kịp bấm "Bán vé". */
    public static final Duration PAID_GRACE = Duration.ofMinutes(3);
    private static final int SELLING_CUTOFF_MINUTES = 5;

    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final SeatEventPublisher seatEventPublisher;
    private final HoldPolicyService holdPolicyService;
    private final CounterOrderRepository counterOrderRepository;

    /* ============================ GIỮ GHẾ ============================ */

    @Override
    @Transactional
    public SeatHoldResponse hold(Long showtimeId, String holdToken, List<Long> showtimeSeatIds, boolean allowPartial) {

        String owner = HoldTokens.owner(holdToken);
        HoldPolicyService.Rule rule = holdPolicyService.resolve(owner, true);

        if (rule.isCounter() && !rule.order().getShowtimeId().equals(showtimeId)) {
            throw new IllegalArgumentException("Đơn " + rule.order().getCode() + " thuộc suất chiếu khác");
        }
        List<Long> ids = normalizeIds(showtimeSeatIds);

        if (ids.isEmpty()) {
            throw new IllegalArgumentException("Chưa chọn ghế");
        }

        validateShowtimeForSale(showtimeId);

        LocalDateTime now = LocalDateTime.now();

        List<ShowtimeSeat> mine = showtimeSeatRepository.lockHeldBy(showtimeId, owner).stream()
                .filter(seat -> isActiveHold(seat, now))
                .toList();

        // Hạn chung của cả phiên: giữ nguyên hạn cũ nếu đã có ghế đang giữ.
        LocalDateTime expiry = mine.stream()
                .map(ShowtimeSeat::getHeldUntil)
                .min(Comparator.naturalOrder())
                .orElse(now.plus(rule.duration()));

        List<ShowtimeSeat> targets = showtimeSeatRepository.lockByShowtimeAndIds(showtimeId, ids);

        if (targets.size() != ids.size()) {
            throw new IllegalArgumentException("Có ghế không thuộc suất chiếu này");
        }

        Set<Long> mineIds = mine.stream().map(ShowtimeSeat::getId).collect(Collectors.toSet());
        long newCount = targets.stream().filter(seat -> !mineIds.contains(seat.getId())).count();

        if (rule.maxSeats() != null && mineIds.size() + newCount > rule.maxSeats()) {
            throw new IllegalArgumentException(rule.isCounter()
                    ? "Đơn thường tối đa " + rule.maxSeats() + " ghế. Bật \"Đơn đoàn\" để chọn nhiều hơn."
                    : "Mỗi đơn tối đa " + rule.maxSeats() + " ghế");
        }

        List<ShowtimeSeat> changed = new ArrayList<>();
        List<String> conflicts = new ArrayList<>();

        for (ShowtimeSeat seat : targets) {
            if (mineIds.contains(seat.getId())) {
                continue; // đã là của mình
            }

            if (isFree(seat, now)) {
                seat.setStatus("HELD");
                seat.setHeldUntil(expiry);
                seat.setHoldOwner(owner);
                changed.add(seat);
            } else {
                conflicts.add(seatCode(seat));
            }
        }

        // Chọn từng ghế: có xung đột -> ném lỗi, transaction rollback.
        // Chọn cả hàng / tất cả (allowPartial): bỏ qua ghế đã có người giữ, giữ phần còn lại.
        if (!conflicts.isEmpty() && !allowPartial) {
            throw new SeatConflictException(conflicts);
        }

        showtimeSeatRepository.saveAll(changed);
        seatEventPublisher.publishAfterCommit(showtimeId, changed);

        List<Long> held = new ArrayList<>(mineIds);
        changed.forEach(seat -> held.add(seat.getId()));
        held.sort(Comparator.naturalOrder());

        holdPolicyService.syncOrderExpiry(rule, held.isEmpty() ? null : expiry);

        return new SeatHoldResponse(showtimeId, held, secondsLeft(expiry, now), conflicts);
    }

    /* ============================ NHẢ GHẾ ============================ */

    /** showtimeSeatIds rỗng / null = nhả toàn bộ ghế của phiên trong suất này. */
    @Override
    @Transactional
    public SeatHoldResponse release(Long showtimeId, String holdToken, List<Long> showtimeSeatIds) {

        String owner = HoldTokens.owner(holdToken);
        HoldPolicyService.Rule rule = holdPolicyService.resolve(owner, false);
        Set<Long> only = new HashSet<>(normalizeIds(showtimeSeatIds));
        LocalDateTime now = LocalDateTime.now();

        List<ShowtimeSeat> mine = showtimeSeatRepository.lockHeldBy(showtimeId, owner);
        List<ShowtimeSeat> released = new ArrayList<>();
        List<ShowtimeSeat> kept = new ArrayList<>();

        for (ShowtimeSeat seat : mine) {
            if (only.isEmpty() || only.contains(seat.getId())) {
                clearHold(seat);
                released.add(seat);
            } else if (isActiveHold(seat, now)) {
                kept.add(seat);
            }
        }

        showtimeSeatRepository.saveAll(released);
        seatEventPublisher.publishAfterCommit(showtimeId, released);

        LocalDateTime expiry = kept.stream()
                .map(ShowtimeSeat::getHeldUntil)
                .min(Comparator.naturalOrder())
                .orElse(now);

        holdPolicyService.syncOrderExpiry(rule, kept.isEmpty() ? null : expiry);

        return new SeatHoldResponse(
                showtimeId,
                kept.stream().map(ShowtimeSeat::getId).sorted().toList(),
                secondsLeft(expiry, now),
                List.of()
        );
    }

    /* ======================= ĐỌC TRẠNG THÁI GHẾ ======================= */

    @Override
    @Transactional(readOnly = true)
    public List<SeatStateResponse> getSeatStates(Long showtimeId) {
        LocalDateTime now = LocalDateTime.now();

        return showtimeSeatRepository.findAllByShowtimeIdWithSeat(showtimeId).stream()
                .map(seat -> SeatStateResponse.of(seat, now))
                .toList();
    }

    /* ================== DÙNG CHO BÁN VÉ / THANH TOÁN ================== */

    @Override
    @Transactional(readOnly = true)
    public LocalDateTime requireActiveHold(Long showtimeId, String holdToken, Collection<Long> showtimeSeatIds) {

        String owner = HoldTokens.owner(holdToken);
        LocalDateTime now = LocalDateTime.now();

        Map<Long, ShowtimeSeat> mine = showtimeSeatRepository.findAllByShowtimeIdWithSeat(showtimeId).stream()
                .filter(seat -> owner.equals(seat.getHoldOwner()) && isActiveHold(seat, now))
                .collect(Collectors.toMap(ShowtimeSeat::getId, seat -> seat));

        List<Long> missing = normalizeIds(new ArrayList<>(showtimeSeatIds)).stream()
                .filter(id -> !mine.containsKey(id))
                .toList();

        if (!missing.isEmpty()) {
            throw new IllegalStateException("Hết thời gian giữ ghế, vui lòng chọn lại ghế");
        }

        return mine.values().stream()
                .map(ShowtimeSeat::getHeldUntil)
                .min(Comparator.naturalOrder())
                .orElse(now);
    }

    @Override
    @Transactional
    public long extendAfterPayment(Long showtimeId, String owner) {

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime until = now.plus(PAID_GRACE);

        List<ShowtimeSeat> mine = showtimeSeatRepository.lockHeldBy(showtimeId, owner);

        mine.forEach(seat -> {
            if (seat.getHeldUntil() == null || seat.getHeldUntil().isBefore(until)) {
                seat.setHeldUntil(until);
            }
        });

        showtimeSeatRepository.saveAll(mine);
        seatEventPublisher.publishAfterCommit(showtimeId, mine);

        return secondsLeft(until, now);
    }

    /* ======================= THU HỒI GHẾ HẾT HẠN ======================= */

    @Override
    @Scheduled(fixedDelay = 5_000)
    @Transactional
    public void releaseExpiredHolds() {

        LocalDateTime now = LocalDateTime.now();

        // Đơn quầy (nháp / tạm gác) quá hạn -> EXPIRED.
        counterOrderRepository.expireOverdue(now);

        List<ShowtimeSeat> expired = showtimeSeatRepository.lockExpiredHolds(now);

        if (expired.isEmpty()) {
            return;
        }

        // clearHold là hàm static của interface -> không dùng được this::clearHold.
        expired.forEach(SeatHoldService::clearHold);
        showtimeSeatRepository.saveAll(expired);

        expired.stream()
                .collect(Collectors.groupingBy(seat -> seat.getShowtime().getId()))
                .forEach(seatEventPublisher::publishAfterCommit);

        log.info("Đã trả {} ghế hết hạn giữ về trạng thái trống", expired.size());
    }

    /* ================== GIA HẠN / TẠM GÁC (dùng cho đơn quầy) ================== */

    @Override
    @Transactional
    public List<Long> setHoldExpiry(Long showtimeId, String owner, LocalDateTime until) {

        LocalDateTime now = LocalDateTime.now();

        List<ShowtimeSeat> mine = showtimeSeatRepository.lockHeldBy(showtimeId, owner).stream()
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

        return showtimeSeatRepository.findAllByShowtimeIdWithSeat(showtimeId).stream()
                .filter(seat -> owner.equals(seat.getHoldOwner()) && isActiveHold(seat, now))
                .map(ShowtimeSeat::getId)
                .sorted()
                .toList();
    }

    /* ============================ HELPERS ============================ */

    private void validateShowtimeForSale(Long showtimeId) {

        Showtime showtime = showtimeRepository.findById(showtimeId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy suất chiếu"));

        if (!"OPEN".equalsIgnoreCase(showtime.getStatus())) {
            throw new IllegalStateException("Suất chiếu không còn mở bán");
        }

        if (!LocalDateTime.now().isBefore(showtime.getStartTime().minusMinutes(SELLING_CUTOFF_MINUTES))) {
            throw new IllegalStateException("Suất chiếu đã đóng bán vé");
        }
    }

    private static List<Long> normalizeIds(List<Long> ids) {
        if (ids == null) {
            return List.of();
        }

        return ids.stream().filter(Objects::nonNull).distinct().sorted().toList();
    }

    /**
     * Làm tròn LÊN theo giây: 299.8s -> 300 (hiện 5:00).
     * toSeconds() cắt phần lẻ nên luôn ra 299 -> quầy thấy 4:59 ngay khi vừa bấm.
     */
    private static long secondsLeft(LocalDateTime until, LocalDateTime now) {
        long millis = Duration.between(now, until).toMillis();
        return millis <= 0 ? 0 : (millis + 999) / 1000;
    }

    private static String seatCode(ShowtimeSeat seat) {
        return seat.getSeat().getRowLabel() + seat.getSeat().getSeatNumber();
    }
}