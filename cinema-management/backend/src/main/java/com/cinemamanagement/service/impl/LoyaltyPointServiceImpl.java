package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Booking;
import com.cinemamanagement.entity.Member;
import com.cinemamanagement.entity.PointHistory;
import com.cinemamanagement.enums.MemberStatus;
import com.cinemamanagement.enums.MembershipLevel;
import com.cinemamanagement.enums.PointTransactionType;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.MemberRepository;
import com.cinemamanagement.repository.PointHistoryRepository;
import com.cinemamanagement.response.PointHistoryResponse;
import com.cinemamanagement.response.PointSummaryResponse;
import com.cinemamanagement.service.LoyaltyPointService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class LoyaltyPointServiceImpl implements LoyaltyPointService {
    private static final BigDecimal VND_PER_POINT = BigDecimal.valueOf(10_000);

    private final MemberRepository memberRepository;
    private final PointHistoryRepository pointHistoryRepository;

    @Override
    @Transactional
    public int awardForPaidBooking(Booking booking) {
        if (booking == null || booking.getMember() == null || booking.getTotalAmount() == null) return 0;

        String key = "BOOKING_POINT_EARN:" + booking.getId();
        if (pointHistoryRepository.existsByIdempotencyKey(key)
                || pointHistoryRepository.existsByBookingIdAndType(booking.getId(), PointTransactionType.EARN.name())) {
            return 0;
        }

        Member member = memberRepository.findByIdForUpdate(booking.getMember().getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy thành viên"));
        if (!MemberStatus.ACTIVE.name().equals(member.getStatus())) return 0;

        int earned = booking.getTotalAmount()
                .divide(VND_PER_POINT, 0, RoundingMode.DOWN)
                .intValue();
        if (earned <= 0) return 0;

        int before = member.getPointBalance() == null ? 0 : member.getPointBalance();
        int after = before + earned;
        member.setPointBalance(after);
        member.setMembershipLevel(MembershipLevel.fromPoints(after).name());
        member.setUpdatedAt(LocalDateTime.now());
        memberRepository.save(member);

        PointHistory history = new PointHistory();
        history.setMember(member);
        history.setBooking(booking);
        history.setPoints(earned);
        history.setBalanceBefore(before);
        history.setBalanceAfter(after);
        history.setType(PointTransactionType.EARN.name());
        history.setDescription("Tích điểm từ đơn " + booking.getBookingCode());
        history.setIdempotencyKey(key);
        history.setCreatedAt(LocalDateTime.now());
        pointHistoryRepository.save(history);
        return earned;
    }

    @Override
    @Transactional(readOnly = true)
    public Page<PointHistoryResponse> getHistory(Long userId, Pageable pageable) {
        Member member = findByUserId(userId);
        return pointHistoryRepository.findAllByMemberIdOrderByCreatedAtDesc(member.getId(), pageable)
                .map(PointHistoryResponse::from);
    }

    @Override
    @Transactional(readOnly = true)
    public PointSummaryResponse getSummary(Long userId) {
        Member member = findByUserId(userId);
        int points = member.getPointBalance() == null ? 0 : member.getPointBalance();
        MembershipLevel level = MembershipLevel.fromPoints(points);
        return switch (level) {
            case BASIC -> new PointSummaryResponse(points, level.name(), 100 - points, MembershipLevel.SILVER.name());
            case SILVER -> new PointSummaryResponse(points, level.name(), 300 - points, MembershipLevel.GOLD.name());
            case GOLD -> new PointSummaryResponse(points, level.name(), 600 - points, MembershipLevel.PLATINUM.name());
            case PLATINUM -> new PointSummaryResponse(points, level.name(), 0, null);
        };
    }

    private Member findByUserId(Long userId) {
        return memberRepository.findByUserId(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy hồ sơ thành viên"));
    }
}
