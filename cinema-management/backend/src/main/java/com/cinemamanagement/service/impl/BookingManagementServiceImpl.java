package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Booking;
import com.cinemamanagement.entity.BookingSeat;
import com.cinemamanagement.entity.Payment;
import com.cinemamanagement.entity.Ticket;
import com.cinemamanagement.repository.BookingRepository;
import com.cinemamanagement.repository.BookingSeatRepository;
import com.cinemamanagement.repository.PaymentRepository;
import com.cinemamanagement.repository.TicketRepository;
import com.cinemamanagement.repository.specification.BookingSpecifications;
import com.cinemamanagement.request.BookingSearchRequest;
import com.cinemamanagement.response.BookingDetailResponse;
import com.cinemamanagement.response.BookingListItemResponse;
import com.cinemamanagement.response.PageResponse;
import com.cinemamanagement.service.BookingManagementService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingManagementServiceImpl implements BookingManagementService {

    private static final int DEFAULT_PAGE_SIZE = 20;
    private static final int MAX_PAGE_SIZE = 100;

    private static final Set<String> PAID_STATUSES = Set.of("CONFIRMED", "PAID", "COMPLETED", "CHECKED_IN", "PICKED_UP");
    private static final Set<String> CLOSED_STATUSES = Set.of("CANCELLED", "CANCELED", "REFUNDED", "EXPIRED");

    private static final Set<String> BLOCKED_TICKET_STATUSES = Set.of("USED", "CHECKED_IN", "CANCELLED", "CANCELED", "REFUNDED");

    private static final long FALLBACK_SHOW_HOURS = 3;

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;



    @Override
    @Transactional(readOnly = true)
    public PageResponse<BookingListItemResponse> search(BookingSearchRequest request) {

        Pageable pageable = PageRequest.of(
                request.getPage() == null ? 0 : Math.max(0, request.getPage()),
                request.getSize() == null ? DEFAULT_PAGE_SIZE : Math.min(MAX_PAGE_SIZE, Math.max(1, request.getSize())),
                sortOf(request.getSort())
        );

        var spec = BookingSpecifications.fromRequest(request);

        if (isUpcomingSort(request.getSort())) {
            spec = spec.and(BookingSpecifications.orderUpcomingFirst(LocalDateTime.now()));
        }

        Page<Booking> page = bookingRepository.findAll(spec, pageable);

        List<Long> ids = page.getContent().stream().map(Booking::getId).toList();

        if (ids.isEmpty()) {
            return PageResponse.of(page, List.of());
        }


        Map<Long, List<String>> seatsByBooking = bookingSeatRepository.findAllWithSeatByBookingIds(ids).stream()
                .collect(Collectors.groupingBy(
                        bs -> bs.getBooking().getId(),
                        Collectors.mapping(BookingManagementServiceImpl::seatCode, Collectors.toList())
                ));

        Map<Long, Payment> paymentByBooking = latestPayments(paymentRepository.findAllByBookingIds(ids));

        List<BookingListItemResponse> items = page.getContent().stream()
                .map(b -> toListItem(b, seatsByBooking.getOrDefault(b.getId(), List.of()), paymentByBooking.get(b.getId())))
                .toList();

        return PageResponse.of(page, items);
    }



    @Override
    @Transactional(readOnly = true)
    public BookingDetailResponse getDetail(Long bookingId) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn đặt vé #" + bookingId));

        List<BookingSeat> seats = bookingSeatRepository.findAllWithSeatByBookingIds(List.of(bookingId));

        Map<Long, Ticket> ticketBySeat = ticketRepository.findAllByBookingId(bookingId).stream()
                .collect(Collectors.toMap(t -> t.getBookingSeat().getId(), t -> t, (a, b) -> a));

        List<BookingDetailResponse.SeatTicket> tickets = seats.stream()
                .sorted(Comparator.comparing(BookingManagementServiceImpl::seatCode, SEAT_ORDER))
                .map(bs -> {
                    Ticket ticket = ticketBySeat.get(bs.getId());

                    return new BookingDetailResponse.SeatTicket(
                            seatCode(bs),
                            bs.getSeat().getSeatType(),
                            bs.getPrice(),
                            ticket == null ? null : ticket.getTicketCode(),
                            ticket == null ? null : ticket.getStatus(),
                            ticket == null ? null : ticket.getIssuedAt(),
                            ticket == null ? 0 : ticket.getReprintCount(),
                            ticket == null ? null : ticket.getLastReprintedAt()
                    );
                })
                .toList();

        Payment payment = latestPayments(paymentRepository.findAllByBookingIds(List.of(bookingId))).get(bookingId);

        var showtime = booking.getShowtime();
        var movie = showtime.getMovie();
        var room = showtime.getRoom();

        BigDecimal discount = nz(booking.getDiscountAmount());
        BigDecimal total = nz(booking.getTotalAmount());
        String reprintBlocked = reprintBlockedReason(booking, LocalDateTime.now());

        return new BookingDetailResponse(
                booking.getId(),
                booking.getBookingCode(),
                booking.getBookingType(),
                booking.getStatus(),
                booking.getCreatedAt(),
                new BookingDetailResponse.Customer(customerName(booking), customerPhone(booking)),
                new BookingDetailResponse.Showtime(
                        showtime.getId(),
                        movie.getTitle(),
                        movie.getPosterUrl(),
                        showtime.getStartTime(),
                        showtime.getEndTime(),
                        room.getName(),
                        room.getRoomType()
                ),
                tickets,
                payment == null ? null : new BookingDetailResponse.Payment(
                        payment.getPaymentMethod(),
                        payment.getProvider(),
                        payment.getStatus(),
                        payment.getAmount(),
                        payment.getCashReceived(),
                        payment.getChangeAmount(),
                        payment.getTransactionCode(),
                        payment.getPaidAt()
                ),

                total.add(discount),
                discount,
                total,
                booking.getPromotion() == null ? null : booking.getPromotion().getCode(),
                employeeName(booking),
                reprintBlocked == null,
                reprintBlocked
        );
    }


    @Override
    @Transactional
    public BookingDetailResponse reprint(Long bookingId, List<String> ticketCodes, Long employeeId) {

        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn đặt vé #" + bookingId));

        LocalDateTime now = LocalDateTime.now();
        String blocked = reprintBlockedReason(booking, now);

        if (blocked != null) {
            throw new IllegalStateException(blocked);
        }

        List<Ticket> tickets = ticketRepository.findAllByBookingId(bookingId);

        Set<String> wanted = ticketCodes == null
                ? Set.of()
                : ticketCodes.stream()
                .filter(Objects::nonNull)
                .map(code -> code.trim().toUpperCase(Locale.ROOT))
                .collect(Collectors.toSet());

        List<Ticket> targets = wanted.isEmpty()
                ? tickets
                : tickets.stream()
                .filter(t -> wanted.contains(t.getTicketCode().toUpperCase(Locale.ROOT)))
                .toList();

        if (targets.isEmpty() || (!wanted.isEmpty() && targets.size() != wanted.size())) {
            throw new IllegalArgumentException("Có mã vé không thuộc đơn " + booking.getBookingCode());
        }

        for (Ticket ticket : targets) {
            String status = ticket.getStatus() == null ? "" : ticket.getStatus().toUpperCase(Locale.ROOT);

            if (BLOCKED_TICKET_STATUSES.contains(status)) {
                throw new IllegalStateException("Vé " + ticket.getTicketCode() + " đã được sử dụng hoặc đã huỷ");
            }
        }

        for (Ticket ticket : targets) {
            ticket.setReprintCount(ticket.getReprintCount() + 1);
            ticket.setLastReprintedAt(now);
            ticket.setLastReprintedBy(employeeId);
        }

        ticketRepository.saveAll(targets);

        return getDetail(bookingId);
    }

    private static String reprintBlockedReason(Booking booking, LocalDateTime now) {

        String status = booking.getStatus() == null ? "" : booking.getStatus().toUpperCase(Locale.ROOT);

        if (CLOSED_STATUSES.contains(status)) {
            return "Đơn đã huỷ, hoàn tiền hoặc hết hạn nên không in lại vé";
        }

        if (!PAID_STATUSES.contains(status)) {
            return "Đơn chưa thanh toán nên chưa in vé";
        }

        var showtime = booking.getShowtime();
        LocalDateTime end = showtime.getEndTime() != null
                ? showtime.getEndTime()
                : showtime.getStartTime().plusHours(FALLBACK_SHOW_HOURS);

        if (!now.isBefore(end)) {
            return "Suất chiếu đã kết thúc";
        }

        return null;
    }


    private BookingListItemResponse toListItem(Booking b, List<String> seats, Payment payment) {

        var showtime = b.getShowtime();
        var movie = showtime.getMovie();

        return new BookingListItemResponse(
                b.getId(),
                b.getBookingCode(),
                b.getBookingType(),
                b.getStatus(),
                customerName(b),
                customerPhone(b),
                movie.getTitle(),
                movie.getPosterUrl(),
                showtime.getStartTime(),
                showtime.getRoom().getName(),
                seats.stream().sorted(SEAT_ORDER).toList(),
                nz(b.getTotalAmount()),
                nz(b.getDiscountAmount()),
                payment == null ? null : payment.getPaymentMethod(),
                payment == null ? null : payment.getStatus(),
                employeeName(b),
                b.getCreatedAt()
        );
    }

    private static String customerName(Booking b) {
        return b.getCustomerName();
    }

    private static String customerPhone(Booking b) {
        return b.getCustomerPhone();
    }

    private static String employeeName(Booking b) {
        return b.getEmployee() == null ? null : b.getEmployee().getFullName();
    }

    private static Map<Long, Payment> latestPayments(List<Payment> payments) {
        Map<Long, Payment> result = new HashMap<>();

        for (Payment p : payments) {
            Long bookingId = p.getBooking().getId();
            Payment current = result.get(bookingId);

            if (current == null || p.getId() > current.getId()) {
                result.put(bookingId, p);
            }
        }

        return result;
    }

    private static boolean isUpcomingSort(String sort) {
        String value = sort == null ? "" : sort.trim().toUpperCase(Locale.ROOT);
        // SHOWTIME: tên cũ, giữ để không lỗi nếu frontend cũ còn gửi.
        return value.equals("UPCOMING") || value.equals("SHOWTIME");
    }

    private static Sort sortOf(String sort) {
        // UPCOMING sắp xếp bằng CASE WHEN trong Specification -> Pageable không được có Sort.
        if (isUpcomingSort(sort)) {
            return Sort.unsorted();
        }

        String value = sort == null ? "NEWEST" : sort.trim().toUpperCase(Locale.ROOT);

        return "OLDEST".equals(value)
                ? Sort.by(Sort.Order.asc("createdAt"), Sort.Order.asc("id"))
                : Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    }

    private static String seatCode(BookingSeat bs) {
        return bs.getSeat().getRowLabel() + bs.getSeat().getSeatNumber();
    }

    private static final Comparator<String> SEAT_ORDER = (a, b) -> {
        String rowA = a.replaceAll("\\d", "");
        String rowB = b.replaceAll("\\d", "");
        int byRow = rowA.length() != rowB.length() ? rowA.length() - rowB.length() : rowA.compareTo(rowB);

        if (byRow != 0) {
            return byRow;
        }

        return Integer.compare(numberOf(a), numberOf(b));
    };

    private static int numberOf(String seat) {
        String digits = seat.replaceAll("\\D", "");
        return digits.isEmpty() ? 0 : Integer.parseInt(digits);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value == null ? BigDecimal.ZERO : value;
    }
}