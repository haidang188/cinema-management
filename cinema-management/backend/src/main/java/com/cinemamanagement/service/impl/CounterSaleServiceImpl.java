package com.cinemamanagement.service.impl;

import com.cinemamanagement.request.CounterSalePreviewRequest;
import com.cinemamanagement.request.CounterSaleRequest;
import com.cinemamanagement.response.CounterSalePreviewResponse;
import com.cinemamanagement.response.CounterSaleResponse;
import com.cinemamanagement.entity.*;
import com.cinemamanagement.repository.*;
import com.cinemamanagement.response.SeatPriceResponse;
import com.cinemamanagement.service.CounterSaleService;
import com.cinemamanagement.response.PromotionQuote;
import com.cinemamanagement.service.CounterOrderService;
import com.cinemamanagement.service.CustomerService;
import com.cinemamanagement.util.HoldTokens;
import com.cinemamanagement.service.PromotionApplyService;
import com.cinemamanagement.service.SeatEventPublisher;
import com.cinemamanagement.service.SeatHoldService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Service
@RequiredArgsConstructor
public class CounterSaleServiceImpl implements CounterSaleService {

    private static final DateTimeFormatter CODE_TIME = DateTimeFormatter.ofPattern("yyMMddHHmmss");

    private static final char[] CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();
    private static final int CODE_RANDOM_LENGTH = 6;
    private static final int MAX_CODE_ATTEMPTS = 10;

    private final SecureRandom secureRandom = new SecureRandom();

    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final EmployeeRepository employeeRepository;
    private final TicketPriceRepository ticketPriceRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final PromotionRepository promotionRepository;
    private final SeatEventPublisher seatEventPublisher;
    private final PromotionApplyService promotionApplyService;
    private final CounterOrderService counterOrderService;
    private final CustomerService customerService;


    @Override
    @Transactional
    public CounterSaleResponse sellTickets(CounterSaleRequest request, Long employeeId) {

        validateRequest(request);

        Employee employee = employeeRepository.findById(employeeId).orElseThrow(() ->
                new RuntimeException("Không tìm thấy nhân viên"));

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId()).orElseThrow(() ->
                new RuntimeException("Không tìm thấy suất chiếu"));

        validateShowtimeForSale(showtime);

        String holdOwner = request.getHoldToken() == null || request.getHoldToken().isBlank()
                ? null
                : HoldTokens.owner(request.getHoldToken());

        CounterOrder order = holdOwner == null
                ? null
                : counterOrderService.findActiveByOwner(holdOwner).orElse(null);

        if (order != null && "PARKED".equals(order.getStatus())) {
            throw new RuntimeException("Đơn " + order.getCode() + " đang tạm gác, hãy mở lại đơn trước khi bán");
        }

        String customerName = CustomerService.normalizeName(request.getCustomerName());
        String customerPhone = CustomerService.normalizePhone(request.getCustomerPhone());

        List<ShowtimeSeat> showtimeSeats = lockAndValidateSeats(request.getShowtimeSeatIds(), showtime.getId(), holdOwner);

        Map<String, BigDecimal> priceBySeatType = resolvePrices(showtime, showtimeSeats);

        BigDecimal totalAmount = calculateTotalAmount(showtimeSeats, priceBySeatType);

        Promotion promotion = null;
        BigDecimal discountAmount = BigDecimal.ZERO;
        String promotionCode = request.getPromotionCode();

        if (promotionCode != null && !promotionCode.isBlank()) {
            PromotionQuote quote = promotionApplyService.redeem(promotionCode, totalAmount);
            discountAmount = quote.discountAmount();
            promotion = promotionRepository.getReferenceById(quote.promotionId());
        }

        BigDecimal finalAmount = totalAmount.subtract(discountAmount);

        Customer customer = customerPhone == null ? null : customerService.recordPurchase(customerName, customerPhone);

        if (customerName == null && customer != null) {
            customerName = customer.getFullName();
        }

        Booking booking = createBooking(employee, showtime, promotion, discountAmount, finalAmount,
                customer, customerName, customerPhone);

        List<BookingSeat> bookingSeats = createBookingSeats(booking, showtimeSeats, priceBySeatType);

        Payment payment = createPayment(booking, finalAmount, request, holdOwner, showtime.getId());

        List<String> ticketCodes = createTickets(bookingSeats);

        markSeatsAsSold(showtimeSeats);

        if (order != null) {
            counterOrderService.markCompleted(order, booking.getId(), customerName, customerPhone);
        }

        return new CounterSaleResponse(
                booking.getId(),
                booking.getBookingCode(),
                totalAmount,
                discountAmount,
                finalAmount,
                payment.getPaymentMethod(),
                payment.getStatus(),
                ticketCodes
        );
    }

    @Override
    @Transactional(readOnly = true)
    public CounterSalePreviewResponse previewSale(CounterSalePreviewRequest request) {

        if (request == null) {
            throw new RuntimeException("Thông tin xem giá vé không được để trống");
        }

        if (request.getShowtimeId() == null) {
            throw new RuntimeException("Chưa chọn suất chiếu");
        }

        List<Long> seatIds = request.getShowtimeSeatIds();

        if (seatIds == null || seatIds.isEmpty()) {
            throw new RuntimeException("Chưa chọn ghế");
        }

        if (new HashSet<>(seatIds).size() != seatIds.size()) {
            throw new RuntimeException("Danh sách ghế bị trùng");
        }

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId()).orElseThrow(() ->
                new RuntimeException("Không tìm thấy suất chiếu"));

        validateShowtimeForSale(showtime);

        List<ShowtimeSeat> showtimeSeats = seatIds.stream()
                .map(id -> showtimeSeatRepository.findById(id).orElseThrow(() ->
                        new RuntimeException("Không tìm thấy ghế suất chiếu: " + id)))
                .toList();

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {

            if (!showtimeSeat.getShowtime().getId().equals(showtime.getId())) {
                throw new RuntimeException("Ghế không thuộc suất chiếu đã chọn");
            }

            // Xem giá cho phép ghế đang giữ (chính quầy vừa giữ ghế rồi mới xem giá).
            String status = showtimeSeat.getStatus() == null ? "" : showtimeSeat.getStatus().toUpperCase();

            if (!status.equals("AVAILABLE") && !status.equals("HELD")) {
                throw new RuntimeException("Ghế " + seatLabel(showtimeSeat) + " không còn trống");
            }
        }

        Map<String, BigDecimal> priceBySeatType = resolvePrices(showtime, showtimeSeats);

        List<SeatPriceResponse> seatPrices = new ArrayList<>();
        BigDecimal totalAmount = BigDecimal.ZERO;

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {

            String seatType = showtimeSeat.getSeat().getSeatType();
            BigDecimal price = priceBySeatType.get(seatType);

            totalAmount = totalAmount.add(price);

            seatPrices.add(new SeatPriceResponse(
                    showtimeSeat.getId(),
                    showtimeSeat.getSeat().getRowLabel(),
                    showtimeSeat.getSeat().getSeatNumber(),
                    seatType,
                    price
            ));
        }

        PromotionQuote promotion = null;

        if (request.getPromotionCode() != null && !request.getPromotionCode().isBlank()) {
            promotion = promotionApplyService.quote(request.getPromotionCode(), totalAmount);
        }

        BigDecimal discountAmount = promotion != null && promotion.valid()
                ? promotion.discountAmount()
                : BigDecimal.ZERO;

        return new CounterSalePreviewResponse(
                seatPrices,
                totalAmount,
                discountAmount,
                totalAmount.subtract(discountAmount),
                promotion
        );
    }

    private void validateRequest(CounterSaleRequest request) {

        if (request == null) {
            throw new RuntimeException("Thông tin bán vé không được để trống");
        }

        if (request.getShowtimeId() == null) {
            throw new RuntimeException("Chưa chọn suất chiếu");
        }

        List<Long> seatIds = request.getShowtimeSeatIds();

        if (seatIds == null || seatIds.isEmpty()) {
            throw new RuntimeException("Chưa chọn ghế");
        }

        if (seatIds.stream().anyMatch(Objects::isNull) || new HashSet<>(seatIds).size() != seatIds.size()) {
            throw new RuntimeException("Danh sách ghế không hợp lệ hoặc bị trùng");
        }

        if (request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()) {
            throw new RuntimeException("Chưa chọn phương thức thanh toán");
        }
    }

    private List<ShowtimeSeat> lockAndValidateSeats(List<Long> showtimeSeatIds, Long showtimeId, String holdOwner) {

        Map<Long, ShowtimeSeat> locked = new HashMap<>();
        LocalDateTime now = LocalDateTime.now();

        for (Long id : showtimeSeatIds.stream().sorted().toList()) {

            ShowtimeSeat showtimeSeat = showtimeSeatRepository
                    .findByIdAndShowtimeIdForUpdate(id, showtimeId)
                    .orElseThrow(() -> new RuntimeException(
                            "Ghế " + id + " không thuộc suất chiếu " + showtimeId));

            boolean mine = holdOwner != null
                    && holdOwner.equals(showtimeSeat.getHoldOwner())
                    && SeatHoldService.isActiveHold(showtimeSeat, now);

            if (!mine && !SeatHoldService.isFree(showtimeSeat, now)) {
                throw new RuntimeException("Ghế " + seatLabel(showtimeSeat) + " không còn trống");
            }

            locked.put(id, showtimeSeat);
        }

        return showtimeSeatIds.stream().map(locked::get).toList();
    }

    private void validateShowtimeForSale(Showtime showtime) {

        if (showtime.getStatus() == null) {
            throw new RuntimeException("Suất chiếu không hợp lệ");
        }

        if (!"OPEN".equalsIgnoreCase(showtime.getStatus())) {
            throw new RuntimeException("Suất chiếu không còn mở bán");
        }

        LocalDateTime cutoffTime = showtime.getStartTime().minusMinutes(5);

        if (!LocalDateTime.now().isBefore(cutoffTime)) {
            throw new RuntimeException("Suất chiếu đã đóng bán vé");
        }
    }

    private Map<String, BigDecimal> resolvePrices(Showtime showtime, List<ShowtimeSeat> showtimeSeats) {

        String roomType = showtime.getRoom().getRoomType();
        String dayType = getDayType(showtime.getStartTime());

        Map<String, BigDecimal> prices = new HashMap<>();

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {

            String seatType = showtimeSeat.getSeat().getSeatType();

            prices.computeIfAbsent(seatType, type -> ticketPriceRepository
                    .findByRoomTypeAndSeatTypeAndDayTypeAndStatus(roomType, type, dayType, "ACTIVE")
                    .map(TicketPrice::getPrice)
                    .orElseThrow(() -> new RuntimeException(
                            "Không tìm thấy giá vé cho ghế " + type + " - " + roomType + " - " + dayType)));
        }

        return prices;
    }

    private BigDecimal calculateTotalAmount(List<ShowtimeSeat> showtimeSeats, Map<String, BigDecimal> priceBySeatType) {

        BigDecimal total = BigDecimal.ZERO;

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {
            total = total.add(priceBySeatType.get(showtimeSeat.getSeat().getSeatType()));
        }

        return total;
    }

    private String getDayType(LocalDateTime startTime) {
        switch (startTime.getDayOfWeek()) {
            case SATURDAY:
            case SUNDAY:
                return "WEEKEND";
            default:
                return "WEEKDAY";
        }
    }


    private Booking createBooking(
            Employee employee,
            Showtime showtime,
            Promotion promotion,
            BigDecimal discountAmount,
            BigDecimal finalAmount,
            Customer customer,
            String customerName,
            String customerPhone
    ) {
        LocalDateTime now = LocalDateTime.now();

        Booking booking = new Booking();

        booking.setCustomer(customer);
        booking.setCustomerName(customerName);
        booking.setCustomerPhone(customerPhone);
        booking.setBookingCode(generateBookingCode());
        booking.setEmployee(employee);
        booking.setShowtime(showtime);
        booking.setPromotion(promotion);
        booking.setTotalAmount(finalAmount);
        booking.setDiscountAmount(discountAmount);
        booking.setBookingType("COUNTER");
        booking.setStatus("CONFIRMED");
        booking.setCreatedAt(now);
        booking.setUpdatedAt(now);
        booking.setPickedUpAt(now);
        booking.setPickedUpBy(employee);

        return bookingRepository.save(booking);
    }

    private List<BookingSeat> createBookingSeats(
            Booking booking,
            List<ShowtimeSeat> showtimeSeats,
            Map<String, BigDecimal> priceBySeatType
    ) {
        List<BookingSeat> bookingSeats = new ArrayList<>();

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {

            BookingSeat bookingSeat = new BookingSeat();
            bookingSeat.setBooking(booking);
            bookingSeat.setSeat(showtimeSeat.getSeat());
            bookingSeat.setPrice(priceBySeatType.get(showtimeSeat.getSeat().getSeatType()));
            bookingSeat.setStatus("ACTIVE");

            bookingSeats.add(bookingSeatRepository.save(bookingSeat));
        }

        return bookingSeats;
    }

    private Payment createPayment(
            Booking booking,
            BigDecimal amount,
            CounterSaleRequest request,
            String holdOwner,
            Long showtimeId
    ) {
        String method = request.getPaymentMethod().trim().toUpperCase();

        Payment payment = new Payment();
        payment.setBooking(booking);
        payment.setPaymentMethod(method);
        payment.setAmount(amount);
        payment.setStatus("PAID");
        payment.setPaidAt(LocalDateTime.now());

        if ("CASH".equals(method)) {
            BigDecimal received = request.getCashReceived();

            if (received != null) {
                if (received.compareTo(amount) < 0) {
                    throw new RuntimeException("Tiền khách đưa ít hơn tổng tiền vé");
                }

                payment.setCashReceived(received);
                payment.setChangeAmount(received.subtract(amount));
            }

            payment.setTransactionCode(generateTransactionCode());

        } else if ("TRANSFER".equals(method)) {
            String reference = request.getPaymentReference();

            if (reference == null || reference.isBlank()) {
                throw new RuntimeException("Thiếu nội dung chuyển khoản");
            }

            payment.setTransactionCode(reference.trim());
            payment.setProvider("VIETQR");

        } else {
            throw new RuntimeException("Phương thức thanh toán không hỗ trợ: " + method);
        }

        return paymentRepository.save(payment);
    }

    private List<String> createTickets(List<BookingSeat> bookingSeats) {

        List<String> ticketCodes = new ArrayList<>();

        Set<String> usedInThisOrder = new HashSet<>();
        LocalDateTime issuedAt = LocalDateTime.now();

        for (BookingSeat bookingSeat : bookingSeats) {

            String ticketCode = generateTicketCode(usedInThisOrder);

            Ticket ticket = new Ticket();
            ticket.setTicketCode(ticketCode);
            ticket.setBookingSeat(bookingSeat);
            ticket.setStatus("ACTIVE");
            ticket.setQrToken(UUID.randomUUID().toString());
            ticket.setIssuedAt(issuedAt);

            ticketRepository.save(ticket);
            ticketCodes.add(ticketCode);
        }

        return ticketCodes;
    }

    private void markSeatsAsSold(List<ShowtimeSeat> showtimeSeats) {

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {
            showtimeSeat.setStatus("SOLD");
            showtimeSeat.setHeldUntil(null);
            showtimeSeat.setHoldOwner(null);
        }

        showtimeSeatRepository.saveAll(showtimeSeats);
        if (!showtimeSeats.isEmpty()) {
            seatEventPublisher.publishAfterCommit(showtimeSeats.get(0).getShowtime().getId(), showtimeSeats);
        }
    }

    private String generateBookingCode() {

        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = newCode("BK");

            if (!bookingRepository.existsByBookingCode(code)) {
                return code;
            }
        }

        throw new RuntimeException("Không tạo được mã đặt vé, vui lòng thử lại");
    }

    private String generateTicketCode(Set<String> usedInThisOrder) {

        for (int attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt++) {
            String code = newCode("TK");

            if (usedInThisOrder.add(code) && !ticketRepository.existsByTicketCode(code)) {
                return code;
            }
        }

        throw new RuntimeException("Không tạo được mã vé, vui lòng thử lại");
    }

    private String generateTransactionCode() {
        return "TXN" + System.currentTimeMillis() + randomPart(4);
    }

    private String newCode(String prefix) {
        return prefix + LocalDateTime.now().format(CODE_TIME) + randomPart(CODE_RANDOM_LENGTH);
    }

    private String randomPart(int length) {

        StringBuilder sb = new StringBuilder(length);

        for (int i = 0; i < length; i++) {
            sb.append(CODE_ALPHABET[secureRandom.nextInt(CODE_ALPHABET.length)]);
        }

        return sb.toString();
    }

    private String seatLabel(ShowtimeSeat showtimeSeat) {
        return showtimeSeat.getSeat().getRowLabel() + showtimeSeat.getSeat().getSeatNumber();
    }
}