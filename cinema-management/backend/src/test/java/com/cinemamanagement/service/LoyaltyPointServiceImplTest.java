package com.cinemamanagement.service;

import com.cinemamanagement.entity.Booking;
import com.cinemamanagement.entity.Member;
import com.cinemamanagement.entity.PointHistory;
import com.cinemamanagement.enums.MembershipLevel;
import com.cinemamanagement.repository.MemberRepository;
import com.cinemamanagement.repository.PointHistoryRepository;
import com.cinemamanagement.service.impl.LoyaltyPointServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.math.BigDecimal;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class LoyaltyPointServiceImplTest {
    private MemberRepository memberRepository;
    private PointHistoryRepository historyRepository;
    private LoyaltyPointServiceImpl service;

    @BeforeEach
    void setUp() {
        memberRepository = mock(MemberRepository.class);
        historyRepository = mock(PointHistoryRepository.class);
        service = new LoyaltyPointServiceImpl(memberRepository, historyRepository);
    }

    @Test
    void awardsOnePointPerTenThousandPaidAndPromotesMember() {
        Member member = new Member();
        member.setId(7L);
        member.setStatus("ACTIVE");
        member.setPointBalance(95);
        member.setMembershipLevel("BASIC");
        Booking booking = new Booking();
        booking.setId(12L);
        booking.setBookingCode("BK12");
        booking.setMember(member);
        booking.setTotalAmount(new BigDecimal("129999"));
        when(memberRepository.findByIdForUpdate(7L)).thenReturn(Optional.of(member));

        int awarded = service.awardForPaidBooking(booking);

        assertEquals(12, awarded);
        assertEquals(107, member.getPointBalance());
        assertEquals(MembershipLevel.SILVER.name(), member.getMembershipLevel());
        ArgumentCaptor<PointHistory> captor = ArgumentCaptor.forClass(PointHistory.class);
        verify(historyRepository).save(captor.capture());
        assertEquals(95, captor.getValue().getBalanceBefore());
        assertEquals(107, captor.getValue().getBalanceAfter());
    }

    @Test
    void doesNotAwardTwiceForSameBooking() {
        Booking booking = new Booking();
        booking.setId(12L);
        booking.setMember(new Member());
        booking.setTotalAmount(BigDecimal.valueOf(100000));
        when(historyRepository.existsByIdempotencyKey("BOOKING_POINT_EARN:12")).thenReturn(true);

        assertEquals(0, service.awardForPaidBooking(booking));
        verify(memberRepository, never()).save(any());
        verify(historyRepository, never()).save(any());
    }
}
