package com.cinemamanagement.service.impl;

import com.cinemamanagement.config.properties.VietQrProperties;
import com.cinemamanagement.config.properties.VnPayProperties;
import com.cinemamanagement.entity.*;
import com.cinemamanagement.enums.*;
import com.cinemamanagement.exception.BadRequestException;
import com.cinemamanagement.exception.ConflictException;
import com.cinemamanagement.exception.ResourceNotFoundException;
import com.cinemamanagement.repository.*;
import com.cinemamanagement.request.BookingPreviewRequest;
import com.cinemamanagement.request.CreateOnlineBookingRequest;
import com.cinemamanagement.response.*;
import com.cinemamanagement.service.OnlineBookingService;
import com.cinemamanagement.service.TicketPricingService;
import com.cinemamanagement.service.VnPayService;
import com.cinemamanagement.websocket.SeatStatusPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OnlineBookingServiceImpl implements OnlineBookingService {

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final SeatHoldRepository seatHoldRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final MemberRepository memberRepository;
    private final TicketPricingService ticketPricingService;
    private final VnPayService vnPayService;
    private final VietQrProperties vietQrProperties;
    private final VnPayProperties vnPayProperties;
    private final SeatStatusPublisher seatStatusPublisher;

    @Override
    @Transactional(readOnly = true)
    public BookingPreviewResponse preview(BookingPreviewRequest request) {
        List<SeatHold> holds = getActiveOwnedHolds(request.holdToken(), request.userId());
        return buildPreview(holds);
    }

    @Override
    @Transactional
    public OnlineBookingResponse create(CreateOnlineBookingRequest request, String clientIp) {
        PaymentMethod method = parseOnlinePaymentMethod(request.paymentMethod());

        if (bookingRepository.existsByHoldToken(request.holdToken())) {
            throw new ConflictException("Lượt giữ ghế này đã được tạo đơn");
        }

        List<SeatHold> holds = getActiveOwnedHolds(request.holdToken(), request.userId());
        SeatHold firstHold = holds.getFirst();
        List<Long> showtimeSeatIds = holds.stream()
                .map(hold -> hold.getShowtimeSeat().getId())
                .sorted()
                .toList();
        List<ShowtimeSeat> lockedSeats = showtimeSeatRepository.findAllByIdsForUpdate(showtimeSeatIds);
        validateLockedHoldSeats(holds, lockedSeats);

        Member member = memberRepository.findByUserId(request.userId())
                .orElseThrow(() -> new BadRequestException("Tài khoản chưa có hồ sơ thành viên"));
        Showtime showtime = firstHold.getShowtimeSeat().getShowtime();

        List<BigDecimal> prices = lockedSeats.stream()
                .map(seat -> ticketPricingService.getPrice(showtime, seat))
                .toList();
        BigDecimal subtotal = prices.stream().reduce(BigDecimal.ZERO, BigDecimal::add);

        LocalDateTime now = LocalDateTime.now();
        Booking booking = new Booking();
        booking.setBookingCode(generateCode("BK"));
        booking.setHoldToken(request.holdToken());
        booking.setMember(member);
        booking.setShowtime(showtime);
        booking.setPromotion(null);
        booking.setTotalAmount(subtotal);
        booking.setDiscountAmount(BigDecimal.ZERO);
        booking.setBookingType(BookingType.ONLINE.name());
        booking.setStatus(BookingStatus.PENDING_PAYMENT.name());
        booking.setPaymentDeadline(firstHold.getExpiresAt());
        booking.setQrToken(UUID.randomUUID().toString());
        booking.setCreatedAt(now);
        booking.setUpdatedAt(now);
        bookingRepository.save(booking);

        List<BookingSeat> bookingSeats = new ArrayList<>();
        for (int index = 0; index < lockedSeats.size(); index++) {
            BookingSeat bookingSeat = new BookingSeat();
            bookingSeat.setBooking(booking);
            bookingSeat.setSeat(lockedSeats.get(index).getSeat());
            bookingSeat.setPrice(prices.get(index));
            bookingSeat.setStatus("PENDING");
            bookingSeats.add(bookingSeat);
        }
        bookingSeatRepository.saveAll(bookingSeats);

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setPaymentMethod(method.name());
        payment.setAmount(subtotal);
        payment.setStatus(PaymentStatus.PENDING.name());
        paymentRepository.save(payment);

        PaymentInstructionResponse instruction = method == PaymentMethod.VIETQR
                ? buildVietQrInstruction(booking)
                : buildVnPayInstruction(booking, clientIp);

        return new OnlineBookingResponse(
                booking.getBookingCode(),
                booking.getStatus(),
                booking.getPaymentDeadline(),
                instruction
        );
    }

    @Override
    @Transactional
    public BookingDetailResponse confirmVietQr(String bookingCode, Long userId) {
        Booking booking = getOwnedBooking(bookingCode, userId);
        Payment payment = getPayment(booking);

        if (!PaymentMethod.VIETQR.name().equals(payment.getPaymentMethod())) {
            throw new BadRequestException("Đơn hàng không thanh toán bằng VietQR");
        }

        confirmPayment(booking, payment, "VIETQR-" + System.currentTimeMillis());
        return toDetail(booking, payment);
    }

    @Override
    @Transactional
    public String processVnPayReturn(Map<String, String> parameters) {
        String bookingCode = parameters.get("vnp_TxnRef");
        boolean successful = false;

        if (bookingCode != null) {
            Booking booking = bookingRepository.findByBookingCode(bookingCode).orElse(null);
            if (booking != null) {
                Payment payment = getPayment(booking);
                boolean validSignature = vnPayService.isValidReturn(parameters);
                boolean accepted = "00".equals(parameters.get("vnp_ResponseCode"))
                        && "00".equals(parameters.get("vnp_TransactionStatus"));
                boolean validAmount = isValidVnPayAmount(parameters.get("vnp_Amount"), payment.getAmount());

                if (validSignature && accepted && validAmount) {
                    confirmPayment(booking, payment, parameters.get("vnp_TransactionNo"));
                    successful = BookingStatus.CONFIRMED.name().equals(booking.getStatus());
                } else if (PaymentStatus.PENDING.name().equals(payment.getStatus())) {
                    payment.setStatus(PaymentStatus.FAILED.name());
                    paymentRepository.save(payment);
                }
            }
        }

        return UriComponentsBuilder.fromUriString(vnPayProperties.getFrontendResultUrl())
                .queryParam("bookingCode", bookingCode == null ? "" : bookingCode)
                .queryParam("payment", successful ? "success" : "failed")
                .build()
                .toUriString();
    }

    @Override
    @Transactional(readOnly = true)
    public BookingDetailResponse getBooking(String bookingCode, Long userId) {
        Booking booking = getOwnedBooking(bookingCode, userId);
        return toDetail(booking, getPayment(booking));
    }

    @Override
    @Transactional(readOnly = true)
    public BookingDetailResponse scanBooking(String qrToken) {
        Booking booking = bookingRepository.findByQrToken(qrToken)
                .orElseThrow(() -> new ResourceNotFoundException("Mã đặt vé không hợp lệ"));

        if (!BookingStatus.CONFIRMED.name().equals(booking.getStatus())) {
            throw new ConflictException("Đơn đặt vé chưa được xác nhận");
        }

        return toDetail(booking, getPayment(booking));
    }

    @Override
    @Transactional
    public void expirePendingBookings() {
        List<Booking> expiredBookings = bookingRepository
                .findAllByStatusAndPaymentDeadlineLessThanEqual(
                        BookingStatus.PENDING_PAYMENT.name(),
                        LocalDateTime.now()
                );

        for (Booking booking : expiredBookings) {
            expireBooking(booking);
        }
    }

    private BookingPreviewResponse buildPreview(List<SeatHold> holds) {
        SeatHold first = holds.getFirst();
        Showtime showtime = first.getShowtimeSeat().getShowtime();
        List<BookingSeatPriceResponse> seats = holds.stream()
                .map(SeatHold::getShowtimeSeat)
                .sorted((left, right) -> left.getId().compareTo(right.getId()))
                .map(showtimeSeat -> new BookingSeatPriceResponse(
                        showtimeSeat.getId(),
                        showtimeSeat.getSeat().getId(),
                        seatName(showtimeSeat.getSeat()),
                        showtimeSeat.getSeat().getSeatType(),
                        ticketPricingService.getPrice(showtime, showtimeSeat)
                ))
                .toList();
        BigDecimal subtotal = seats.stream()
                .map(BookingSeatPriceResponse::price)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new BookingPreviewResponse(
                first.getHoldToken(),
                showtime.getId(),
                showtime.getMovie().getTitle(),
                showtime.getMovie().getPosterUrl(),
                showtime.getRoom().getName(),
                showtime.getFormat(),
                showtime.getStartTime(),
                first.getExpiresAt(),
                seats,
                subtotal,
                BigDecimal.ZERO,
                subtotal,
                "Hiện chưa có mã khuyến mãi"
        );
    }

    private List<SeatHold> getActiveOwnedHolds(String holdToken, Long userId) {
        List<SeatHold> holds = seatHoldRepository
                .findAllByHoldTokenAndStatusOrderByIdAsc(holdToken, SeatHoldStatus.ACTIVE.name());

        if (holds.isEmpty()) {
            throw new ResourceNotFoundException("Không tìm thấy lượt giữ ghế đang hoạt động");
        }
        if (holds.stream().anyMatch(hold -> !hold.getUser().getId().equals(userId))) {
            throw new BadRequestException("Lượt giữ ghế không thuộc người dùng này");
        }
        if (!holds.getFirst().getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new ConflictException("Thời gian giữ ghế đã hết");
        }
        return holds;
    }

    private void validateLockedHoldSeats(List<SeatHold> holds, List<ShowtimeSeat> seats) {
        if (holds.size() != seats.size()) {
            throw new ConflictException("Danh sách ghế giữ không còn hợp lệ");
        }
        for (ShowtimeSeat seat : seats) {
            if (!ShowtimeSeatStatus.HELD.name().equals(seat.getStatus())) {
                throw new ConflictException("Ghế " + seatName(seat.getSeat()) + " không còn được giữ");
            }
        }
    }

    private void confirmPayment(Booking booking, Payment payment, String transactionCode) {
        if (BookingStatus.CONFIRMED.name().equals(booking.getStatus())) {
            return;
        }
        if (!BookingStatus.PENDING_PAYMENT.name().equals(booking.getStatus())) {
            throw new ConflictException("Đơn đặt vé không còn chờ thanh toán");
        }
        if (!booking.getPaymentDeadline().isAfter(LocalDateTime.now())) {
            expireBooking(booking);
            throw new ConflictException("Đơn đặt vé đã hết thời gian thanh toán");
        }

        List<SeatHold> holds = getActiveOwnedHolds(booking.getHoldToken(), booking.getMember().getUser().getId());
        List<Long> ids = holds.stream().map(hold -> hold.getShowtimeSeat().getId()).sorted().toList();
        List<ShowtimeSeat> seats = showtimeSeatRepository.findAllByIdsForUpdate(ids);
        validateLockedHoldSeats(holds, seats);

        for (ShowtimeSeat seat : seats) {
            seat.setStatus(ShowtimeSeatStatus.SOLD.name());
            seat.setHeldUntil(null);
        }
        for (SeatHold hold : holds) {
            hold.setStatus(SeatHoldStatus.CONVERTED.name());
        }

        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        for (BookingSeat bookingSeat : bookingSeats) {
            bookingSeat.setStatus("ACTIVE");
            if (ticketRepository.findByBookingSeatId(bookingSeat.getId()).isEmpty()) {
                Ticket ticket = new Ticket();
                ticket.setTicketCode(generateCode("TK"));
                ticket.setBookingSeat(bookingSeat);
                ticket.setStatus(TicketStatus.ACTIVE.name());
                ticket.setQrToken(UUID.randomUUID().toString());
                ticket.setIssuedAt(LocalDateTime.now());
                ticketRepository.save(ticket);
            }
        }

        booking.setStatus(BookingStatus.CONFIRMED.name());
        booking.setUpdatedAt(LocalDateTime.now());
        payment.setStatus(PaymentStatus.PAID.name());
        payment.setPaidAt(LocalDateTime.now());
        payment.setTransactionCode(transactionCode);

        showtimeSeatRepository.saveAll(seats);
        seatHoldRepository.saveAll(holds);
        bookingSeatRepository.saveAll(bookingSeats);
        bookingRepository.save(booking);
        paymentRepository.save(payment);
        seatStatusPublisher.publishSold(booking.getShowtime().getId(), ids);
    }

    private void expireBooking(Booking booking) {
        if (!BookingStatus.PENDING_PAYMENT.name().equals(booking.getStatus())) {
            return;
        }

        booking.setStatus(BookingStatus.EXPIRED.name());
        booking.setUpdatedAt(LocalDateTime.now());
        Payment payment = getPayment(booking);
        payment.setStatus(PaymentStatus.EXPIRED.name());
        bookingSeatRepository.findByBookingId(booking.getId())
                .forEach(bookingSeat -> bookingSeat.setStatus("CANCELLED"));
        bookingRepository.save(booking);
        paymentRepository.save(payment);
    }

    private PaymentInstructionResponse buildVietQrInstruction(Booking booking) {
        if (!vietQrProperties.isConfigured()) {
            throw new BadRequestException("VietQR chưa được cấu hình tài khoản nhận tiền");
        }
        String transferContent = booking.getBookingCode();
        String fileName = vietQrProperties.getBankId()
                + "-" + vietQrProperties.getAccountNumber()
                + "-" + vietQrProperties.getTemplate() + ".png";
        String qrUrl = UriComponentsBuilder.fromUriString(vietQrProperties.getImageBaseUrl())
                .pathSegment(fileName)
                .queryParam("amount", booking.getTotalAmount().setScale(0, RoundingMode.HALF_UP).toPlainString())
                .queryParam("addInfo", transferContent)
                .queryParam("accountName", vietQrProperties.getAccountName())
                .build()
                .encode()
                .toUriString();

        return new PaymentInstructionResponse(
                PaymentMethod.VIETQR.name(), booking.getTotalAmount(), null, qrUrl,
                vietQrProperties.getBankName(), vietQrProperties.getAccountNumber(),
                vietQrProperties.getAccountName(), transferContent
        );
    }

    private PaymentInstructionResponse buildVnPayInstruction(Booking booking, String clientIp) {
        return new PaymentInstructionResponse(
                PaymentMethod.VNPAY.name(), booking.getTotalAmount(),
                vnPayService.createPaymentUrl(booking, clientIp),
                null, null, null, null, booking.getBookingCode()
        );
    }

    private BookingDetailResponse toDetail(Booking booking, Payment payment) {
        List<BookingSeat> bookingSeats = bookingSeatRepository.findByBookingId(booking.getId());
        Map<Long, Ticket> ticketByBookingSeat = ticketRepository
                .findAllByBookingSeatBookingIdOrderByIdAsc(booking.getId())
                .stream()
                .collect(java.util.stream.Collectors.toMap(ticket -> ticket.getBookingSeat().getId(), ticket -> ticket));
        List<BookingTicketResponse> tickets = bookingSeats.stream()
                .map(bookingSeat -> {
                    Ticket ticket = ticketByBookingSeat.get(bookingSeat.getId());
                    return new BookingTicketResponse(
                            ticket == null ? null : ticket.getTicketCode(),
                            seatName(bookingSeat.getSeat()),
                            bookingSeat.getSeat().getSeatType(),
                            bookingSeat.getPrice(),
                            ticket == null ? bookingSeat.getStatus() : ticket.getStatus()
                    );
                })
                .toList();
        BigDecimal subtotal = bookingSeats.stream()
                .map(BookingSeat::getPrice)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        Member member = booking.getMember();
        Showtime showtime = booking.getShowtime();

        return new BookingDetailResponse(
                booking.getBookingCode(), booking.getStatus(), payment.getPaymentMethod(), payment.getStatus(),
                payment.getPaidAt(), booking.getPaymentDeadline(), member.getFullName(), member.getEmail(),
                member.getPhone(), showtime.getMovie().getTitle(), showtime.getMovie().getPosterUrl(),
                showtime.getMovie().getAgeRating(), showtime.getRoom().getName(), showtime.getRoom().getRoomType(),
                showtime.getFormat(), showtime.getStartTime(), subtotal, booking.getDiscountAmount(),
                booking.getTotalAmount(), booking.getQrToken(), tickets
        );
    }

    private Booking getOwnedBooking(String bookingCode, Long userId) {
        Booking booking = bookingRepository.findByBookingCode(bookingCode)
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy đơn đặt vé"));
        if (booking.getMember() == null || !booking.getMember().getUser().getId().equals(userId)) {
            throw new BadRequestException("Đơn đặt vé không thuộc người dùng này");
        }
        return booking;
    }

    private Payment getPayment(Booking booking) {
        return paymentRepository.findByBookingId(booking.getId())
                .orElseThrow(() -> new ResourceNotFoundException("Không tìm thấy giao dịch thanh toán"));
    }

    private PaymentMethod parseOnlinePaymentMethod(String value) {
        try {
            PaymentMethod method = PaymentMethod.valueOf(value.trim().toUpperCase());
            if (method != PaymentMethod.VIETQR && method != PaymentMethod.VNPAY) {
                throw new IllegalArgumentException();
            }
            return method;
        } catch (IllegalArgumentException exception) {
            throw new BadRequestException("Chỉ hỗ trợ thanh toán VietQR hoặc VNPay");
        }
    }

    private boolean isValidVnPayAmount(String rawAmount, BigDecimal expectedAmount) {
        if (rawAmount == null) {
            return false;
        }
        try {
            return new BigDecimal(rawAmount).movePointLeft(2).compareTo(expectedAmount) == 0;
        } catch (NumberFormatException exception) {
            return false;
        }
    }

    private String seatName(Seat seat) {
        return seat.getRowLabel() + seat.getSeatNumber();
    }

    private String generateCode(String prefix) {
        String timestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
        return prefix + timestamp + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }
}
