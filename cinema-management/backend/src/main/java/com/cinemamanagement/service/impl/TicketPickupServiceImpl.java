package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Booking;
import com.cinemamanagement.entity.BookingSeat;
import com.cinemamanagement.entity.Payment;
import com.cinemamanagement.entity.Ticket;
import com.cinemamanagement.repository.BookingRepository;
import com.cinemamanagement.repository.BookingSeatRepository;
import com.cinemamanagement.repository.EmployeeRepository;
import com.cinemamanagement.repository.PaymentRepository;
import com.cinemamanagement.repository.TicketRepository;
import com.cinemamanagement.repository.specification.PickupSpecifications;
import com.cinemamanagement.response.PickupBookingItemResponse;
import com.cinemamanagement.response.PickupInfoResponse;
import com.cinemamanagement.service.TicketPickupService;
import com.cinemamanagement.util.BookingCustomers;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class TicketPickupServiceImpl implements TicketPickupService {

    private static final int MAX_PHONE_RESULTS = 20;
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private static final String MEMBER_PHONE_PATH = "phone";

    private static final Set<String> PAID = Set.copyOf(PickupSpecifications.PAID_STATUSES);
    private static final Set<String> CLOSED = Set.of("CANCELLED", "CANCELED", "EXPIRED", "REFUNDED");

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final TicketRepository ticketRepository;
    private final PaymentRepository paymentRepository;
    private final EmployeeRepository employeeRepository;


    @Override
    @Transactional(readOnly = true)
    public List<PickupBookingItemResponse> search(String raw) {

        if (raw == null || raw.isBlank()) {
            return List.of();
        }

        String keyword = raw.trim();
        String upper = keyword.toUpperCase(Locale.ROOT);

        Optional<Booking> exact = bookingRepository.findByBookingCode(upper)
                .or(() -> bookingRepository.findByQrToken(keyword))
                .or(() -> ticketRepository.findByTicketCode(upper).map(t -> t.getBookingSeat().getBooking()))
                .or(() -> ticketRepository.findByQrToken(keyword).map(t -> t.getBookingSeat().getBooking()));

        if (exact.isPresent()) {
            return toItems(List.of(exact.get()));
        }

        String digits = normalizePhone(keyword);

        if (digits.length() < 9) {
            return List.of();
        }

        return toItems(findByPhone(digits));
    }

    private List<Booking> findByPhone(String digits) {
        return bookingRepository.findAll(
                PickupSpecifications.onlinePaidUpcoming(LocalDateTime.now())
                        .and(PickupSpecifications.phone(digits, MEMBER_PHONE_PATH)),
                PageRequest.of(0, MAX_PHONE_RESULTS, Sort.by(Sort.Order.asc("showtime.startTime")))
        ).getContent();
    }


    @Override
    @Transactional(readOnly = true)
    public PickupInfoResponse getInfo(Long bookingId) {
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn đặt vé #" + bookingId));

        return toInfo(booking);
    }


    @Override
    @Transactional
    public PickupInfoResponse confirm(Long bookingId, Long employeeId) {

        Booking booking = bookingRepository.lockById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn đặt vé #" + bookingId));

        String blocked = blockedReason(booking, hasTickets(booking), LocalDateTime.now());

        if (blocked != null) {
            throw new IllegalStateException(blocked);
        }

        booking.setPickedUpAt(LocalDateTime.now());
        booking.setPickedUpBy(employeeId == null ? null : employeeRepository.getReferenceById(employeeId));
        booking.setUpdatedAt(LocalDateTime.now());

        log.info("Đơn {} đã nhận vé tại quầy (nhân viên #{})", booking.getBookingCode(), employeeId);

        return toInfo(booking);
    }

    private static String blockedReason(Booking b, boolean hasTickets, LocalDateTime now) {

        String channel = upper(b.getBookingType());
        String status = upper(b.getStatus());

        if ("COUNTER".equals(channel)) {
            return "Đơn bán tại quầy: khách đã nhận vé khi mua. Cần in lại thì dùng Quản lý đặt vé.";
        }

        if (b.getPickedUpAt() != null) {
            String by = b.getPickedUpBy() == null ? "" : " bởi " + b.getPickedUpBy().getFullName();
            return "Đơn đã nhận vé lúc " + b.getPickedUpAt().format(TIME) + by + ".";
        }

        if (CLOSED.contains(status)) {
            return "Đơn đã huỷ, hết hạn hoặc đã hoàn tiền.";
        }

        if (!PAID.contains(status)) {
            return "Đơn chưa thanh toán.";
        }

        var showtime = b.getShowtime();
        LocalDateTime end = showtime.getEndTime() != null ? showtime.getEndTime() : showtime.getStartTime().plusHours(3);

        if (!now.isBefore(end)) {
            return "Suất chiếu đã kết thúc.";
        }

        if (!hasTickets) {
            return "Đơn chưa có vé được xuất. Kiểm tra lại thanh toán của đơn.";
        }

        return null;
    }

    private boolean hasTickets(Booking b) {
        return !ticketRepository.findAllByBookingId(b.getId()).isEmpty();
    }


    private List<PickupBookingItemResponse> toItems(List<Booking> bookings) {

        if (bookings.isEmpty()) {
            return List.of();
        }

        List<Long> ids = bookings.stream().map(Booking::getId).toList();
        LocalDateTime now = LocalDateTime.now();

        Map<Long, List<String>> seats = bookingSeatRepository.findAllWithSeatByBookingIds(ids).stream()
                .collect(Collectors.groupingBy(
                        bs -> bs.getBooking().getId(),
                        Collectors.mapping(TicketPickupServiceImpl::seatCode, Collectors.toList())
                ));

        return bookings.stream().map(b -> {
            var showtime = b.getShowtime();
            List<String> seatList = seats.getOrDefault(b.getId(), List.of());

            return new PickupBookingItemResponse(
                    b.getId(),
                    b.getBookingCode(),
                    b.getBookingType(),
                    BookingCustomers.name(b),
                    BookingCustomers.phone(b),
                    showtime.getMovie().getTitle(),
                    showtime.getMovie().getPosterUrl(),
                    showtime.getStartTime(),
                    showtime.getRoom().getName(),
                    seatList,
                    b.getPickedUpAt() != null,
                    blockedReason(b, !seatList.isEmpty(), now) == null
            );
        }).toList();
    }

    private PickupInfoResponse toInfo(Booking b) {

        List<BookingSeat> seats = bookingSeatRepository.findAllWithSeatByBookingIds(List.of(b.getId()));
        Map<Long, Ticket> ticketBySeat = ticketRepository.findAllByBookingId(b.getId()).stream()
                .collect(Collectors.toMap(t -> t.getBookingSeat().getId(), t -> t, (x, y) -> x));

        List<PickupInfoResponse.TicketItem> tickets = seats.stream()
                .sorted(Comparator.comparing((BookingSeat bs) -> bs.getSeat().getRowLabel())
                        .thenComparing(bs -> bs.getSeat().getSeatNumber()))
                .map(bs -> {
                    Ticket t = ticketBySeat.get(bs.getId());

                    return new PickupInfoResponse.TicketItem(
                            seatCode(bs),
                            bs.getSeat().getSeatType(),
                            t == null ? null : t.getTicketCode(),
                            t == null ? null : t.getQrToken(),
                            t == null ? null : t.getStatus()
                    );
                })
                .toList();

        Payment payment = paymentRepository.findAllByBookingIds(List.of(b.getId())).stream()
                .max(Comparator.comparing(Payment::getId))
                .orElse(null);

        var showtime = b.getShowtime();
        var movie = showtime.getMovie();
        var room = showtime.getRoom();
        boolean hasTickets = tickets.stream().anyMatch(t -> t.ticketCode() != null);
        String blocked = blockedReason(b, hasTickets, LocalDateTime.now());

        return new PickupInfoResponse(
                b.getId(),
                b.getBookingCode(),
                b.getBookingType(),
                b.getStatus(),
                b.getCreatedAt(),
                new PickupInfoResponse.Customer(
                        BookingCustomers.name(b),
                        BookingCustomers.phone(b),
                        BookingCustomers.email(b)
                ),
                new PickupInfoResponse.Showtime(
                        showtime.getId(),
                        movie.getTitle(),
                        movie.getPosterUrl(),
                        showtime.getStartTime(),
                        showtime.getEndTime(),
                        room.getName(),
                        room.getRoomType()
                ),
                tickets,
                b.getTotalAmount(),
                payment == null ? null : payment.getPaymentMethod(),
                payment == null ? null : payment.getStatus(),
                payment == null ? null : payment.getPaidAt(),
                new PickupInfoResponse.Pickup(
                        b.getPickedUpAt() != null,
                        b.getPickedUpAt(),
                        b.getPickedUpBy() == null ? null : b.getPickedUpBy().getFullName()
                ),
                blocked == null,
                blocked
        );
    }


    private static String seatCode(BookingSeat bs) {
        return bs.getSeat().getRowLabel() + bs.getSeat().getSeatNumber();
    }

    private static String upper(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT);
    }

    private static String normalizePhone(String raw) {
        String digits = raw.replaceAll("\\D", "");

        if (raw.trim().startsWith("+84") || (digits.startsWith("84") && digits.length() == 11)) {
            digits = "0" + digits.substring(2);
        }

        return digits;
    }
}