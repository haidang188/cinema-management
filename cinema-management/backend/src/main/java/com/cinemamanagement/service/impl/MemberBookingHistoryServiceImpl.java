package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Booking;
import com.cinemamanagement.entity.BookingSeat;
import com.cinemamanagement.entity.Payment;
import com.cinemamanagement.repository.BookingRepository;
import com.cinemamanagement.repository.BookingSeatRepository;
import com.cinemamanagement.repository.PaymentRepository;
import com.cinemamanagement.response.BookingListItemResponse;
import com.cinemamanagement.service.MemberBookingHistoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MemberBookingHistoryServiceImpl implements MemberBookingHistoryService {
    private static final Comparator<String> SEAT_ORDER = Comparator.naturalOrder();

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final PaymentRepository paymentRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<BookingListItemResponse> getHistory(Long userId, LocalDate fromDate, LocalDate toDate, String timeline, Pageable pageable) {
        String normalizedTimeline = timeline == null ? null : timeline.trim().toUpperCase();
        if (!"UNPAID".equals(normalizedTimeline)
                && !"UPCOMING".equals(normalizedTimeline)
                && !"COMPLETED".equals(normalizedTimeline)) {
            normalizedTimeline = null;
        }
        Page<Booking> page = bookingRepository.findMemberHistory(
                userId,
                fromDate == null ? null : fromDate.atStartOfDay(),
                toDate == null ? null : toDate.plusDays(1).atStartOfDay(),
                normalizedTimeline,
                java.time.LocalDateTime.now(),
                pageable);
        List<Long> bookingIds = page.getContent().stream().map(Booking::getId).toList();
        if (bookingIds.isEmpty()) {
            return page.map(this::emptyItem);
        }

        Map<Long, List<String>> seatsByBooking = bookingSeatRepository.findAllWithSeatByBookingIds(bookingIds)
                .stream()
                .collect(Collectors.groupingBy(
                        seat -> seat.getBooking().getId(),
                        Collectors.mapping(this::seatName, Collectors.toList())));
        Map<Long, Payment> paymentsByBooking = paymentRepository.findAllByBookingIds(bookingIds)
                .stream()
                .collect(Collectors.toMap(payment -> payment.getBooking().getId(), Function.identity()));

        return page.map(booking -> toResponse(
                booking,
                seatsByBooking.getOrDefault(booking.getId(), List.of()),
                paymentsByBooking.get(booking.getId())));
    }

    private BookingListItemResponse emptyItem(Booking booking) {
        return toResponse(booking, List.of(), null);
    }

    private BookingListItemResponse toResponse(Booking booking, List<String> seats, Payment payment) {
        var showtime = booking.getShowtime();
        var movie = showtime.getMovie();
        return new BookingListItemResponse(
                booking.getId(), booking.getBookingCode(), booking.getBookingType(), booking.getStatus(),
                booking.getCustomerName(), booking.getCustomerPhone(), movie.getTitle(), movie.getPosterUrl(),
                showtime.getStartTime(), showtime.getRoom().getName(),
                seats.stream().sorted(SEAT_ORDER).toList(), zero(booking.getTotalAmount()),
                zero(booking.getDiscountAmount()), payment == null ? null : payment.getPaymentMethod(),
                payment == null ? null : payment.getStatus(), null, booking.getCreatedAt());
    }

    private String seatName(BookingSeat bookingSeat) {
        return bookingSeat.getSeat().getRowLabel() + bookingSeat.getSeat().getSeatNumber();
    }

    private BigDecimal zero(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}
