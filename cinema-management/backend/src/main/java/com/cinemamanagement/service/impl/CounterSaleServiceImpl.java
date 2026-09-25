package com.cinemamanagement.service.impl;

import com.cinemamanagement.request.CounterSalePreviewRequest;
import com.cinemamanagement.request.CounterSaleRequest;
import com.cinemamanagement.response.CounterSalePreviewResponse;
import com.cinemamanagement.response.CounterSaleResponse;
import com.cinemamanagement.entity.*;
import com.cinemamanagement.repository.*;
import com.cinemamanagement.response.SeatPriceResponse;
import com.cinemamanagement.service.CounterSaleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CounterSaleServiceImpl implements CounterSaleService {
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ShowtimeRepository showtimeRepository;
    private final ShowtimeSeatRepository showtimeSeatRepository;
    private final EmployeeRepository employeeRepository;
    private final TicketPriceRepository ticketPriceRepository;
    private final PaymentRepository paymentRepository;
    private final TicketRepository ticketRepository;
    private final PromotionRepository promotionRepository;

    @Override
    @Transactional
    public CounterSaleResponse sellTickets(CounterSaleRequest request, Long employeeId) {

        validateRequest(request);

        Employee employee = employeeRepository.findById(employeeId).orElseThrow(() ->
                        new RuntimeException("Không tìm thấy nhân viên"));

        Showtime showtime = showtimeRepository.findById(request.getShowtimeId()).orElseThrow(() ->
                        new RuntimeException("Không tìm thấy suất chiếu"));

        validateShowtimeForSale(showtime);

        List<ShowtimeSeat> showtimeSeats = lockAndValidateSeats(request.getShowtimeSeatIds(), showtime.getId());

//        validateSeatsBelongToShowtime(showtimeSeats, showtime.getId());

        BigDecimal totalAmount = calculateTotalAmount(showtime, showtimeSeats);

        Promotion promotion = null;

        if (request.getPromotionId() != null) {
            promotion = promotionRepository
                    .findById(request.getPromotionId())
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Không tìm thấy khuyến mãi"
                            )
                    );
        }

        BigDecimal discountAmount = calculateDiscount(promotion, totalAmount);

        BigDecimal finalAmount = totalAmount.subtract(discountAmount);

        Booking booking = createBooking(employee, showtime, promotion, discountAmount, finalAmount);

        List<BookingSeat> bookingSeats = createBookingSeats(booking, showtimeSeats, showtime);

        Payment payment = createPayment(booking, finalAmount, request.getPaymentMethod());

        List<String> ticketCodes = createTickets(bookingSeats);

        markSeatsAsSold(showtimeSeats);

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
    public CounterSalePreviewResponse previewSale(
            CounterSalePreviewRequest request
    ) {

        if (request == null) {
            throw new RuntimeException(
                    "Thông tin xem giá vé không được để trống"
            );
        }

        if (request.getShowtimeId() == null) {
            throw new RuntimeException(
                    "Chưa chọn suất chiếu"
            );
        }

        if (request.getShowtimeSeatIds() == null
                || request.getShowtimeSeatIds().isEmpty()) {
            throw new RuntimeException(
                    "Chưa chọn ghế"
            );
        }

        Showtime showtime =
                showtimeRepository.findById(
                        request.getShowtimeId()
                ).orElseThrow(() ->
                        new RuntimeException(
                                "Không tìm thấy suất chiếu"
                        )
                );

        validateShowtimeForSale(showtime);

        List<ShowtimeSeat> showtimeSeats =
                request.getShowtimeSeatIds()
                        .stream()
                        .map(id ->
                                showtimeSeatRepository
                                        .findById(id)
                                        .orElseThrow(() ->
                                                new RuntimeException(
                                                        "Không tìm thấy ghế suất chiếu: " + id
                                                )
                                        )
                        )
                        .toList();

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {

            if (!showtimeSeat
                    .getShowtime()
                    .getId()
                    .equals(showtime.getId())) {

                throw new RuntimeException(
                        "Ghế không thuộc suất chiếu đã chọn"
                );
            }

            if (!"AVAILABLE".equalsIgnoreCase(
                    showtimeSeat.getStatus()
            )) {
                throw new RuntimeException(
                        "Ghế "
                                + showtimeSeat.getSeat().getRowLabel()
                                + showtimeSeat.getSeat().getSeatNumber()
                                + " không còn trống"
                );
            }
        }

        String roomType =
                showtime.getRoom().getRoomType();

        String dayType =
                getDayType(showtime.getStartTime());

        List<SeatPriceResponse> seatPrices =
                new ArrayList<>();

        BigDecimal totalAmount =
                BigDecimal.ZERO;

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {

            String seatType =
                    showtimeSeat.getSeat().getSeatType();

            TicketPrice ticketPrice =
                    ticketPriceRepository
                            .findByRoomTypeAndSeatTypeAndDayTypeAndStatus(
                                    roomType,
                                    seatType,
                                    dayType,
                                    "ACTIVE"
                            )
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Không tìm thấy giá vé cho ghế "
                                                    + seatType
                                                    + " - "
                                                    + roomType
                                    )
                            );

            BigDecimal price =
                    ticketPrice.getPrice();

            totalAmount =
                    totalAmount.add(price);

            seatPrices.add(
                    new SeatPriceResponse(
                            showtimeSeat.getId(),
                            showtimeSeat.getSeat().getRowLabel(),
                            showtimeSeat.getSeat().getSeatNumber(),
                            seatType,
                            price
                    )
            );
        }

        BigDecimal discountAmount =
                BigDecimal.ZERO;

        BigDecimal finalAmount =
                totalAmount.subtract(discountAmount);

        return new CounterSalePreviewResponse(
                seatPrices,
                totalAmount,
                discountAmount,
                finalAmount
        );
    }


    private void validateRequest(CounterSaleRequest request) {

        if (request == null) {
            throw new RuntimeException("Thông tin bán vé không được để trống");
        }

        if (request.getShowtimeId() == null) {
            throw new RuntimeException("Chưa chọn suất chiếu");
        }

        if (request.getShowtimeSeatIds() == null || request.getShowtimeSeatIds().isEmpty()) {
            throw new RuntimeException("Chưa chọn ghế");
        }

        if (request.getPaymentMethod() == null || request.getPaymentMethod().isBlank()) {
            throw new RuntimeException("Chưa chọn phương thức thanh toán");
        }
    }


    private List<ShowtimeSeat> lockAndValidateSeats(
            List<Long> showtimeSeatIds,
            Long showtimeId
    ) {
        List<ShowtimeSeat> result = new ArrayList<>();

        for (Long id : showtimeSeatIds) {

            ShowtimeSeat showtimeSeat =
                    showtimeSeatRepository
                            .findByIdAndShowtimeIdForUpdate(
                                    id,
                                    showtimeId
                            )
                            .orElseThrow(() ->
                                    new RuntimeException(
                                            "Ghế "
                                                    + id
                                                    + " không thuộc suất chiếu "
                                                    + showtimeId
                                    )
                            );

            if (!"AVAILABLE".equalsIgnoreCase(showtimeSeat.getStatus())) {
                throw new RuntimeException(
                        "Ghế "
                                + showtimeSeat.getSeat().getRowLabel()
                                + showtimeSeat.getSeat().getSeatNumber()
                                + " không còn trống"
                );
            }

            result.add(showtimeSeat);
        }

        return result;
    }
    private void validateShowtimeForSale(Showtime showtime) {

        if (showtime.getStatus() == null) {
            throw new RuntimeException("Suất chiếu không hợp lệ");
        }

        if (!"OPEN".equalsIgnoreCase(showtime.getStatus())) {
            throw new RuntimeException("Suất chiếu không còn mở bán");
        }

        LocalDateTime now = LocalDateTime.now();

        LocalDateTime cutoffTime =
                showtime.getStartTime().minusMinutes(5);

        if (!now.isBefore(cutoffTime)) {
            throw new RuntimeException("Suất chiếu đã đóng bán vé");
        }
    }

    private BigDecimal calculateTotalAmount(Showtime showtime, List<ShowtimeSeat> showtimeSeats) {

        BigDecimal total = BigDecimal.ZERO;

        String roomType = showtime.getRoom().getRoomType();

        String dayType = getDayType(showtime.getStartTime());

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {

            String seatType = showtimeSeat.getSeat().getSeatType();

            TicketPrice ticketPrice = ticketPriceRepository.findByRoomTypeAndSeatTypeAndDayTypeAndStatus(roomType, seatType, dayType, "ACTIVE")
                            .orElseThrow(() ->
                                    new RuntimeException("Không tìm thấy giá vé cho ghế " + seatType + " - " + roomType)
                            );

            total = total.add(ticketPrice.getPrice());
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

    private BigDecimal calculateDiscount(Promotion promotion, BigDecimal totalAmount) {

        if (promotion == null) {
            return BigDecimal.ZERO;
        }

        validatePromotion(promotion, totalAmount);

        BigDecimal discount;

        if ("PERCENT".equalsIgnoreCase(promotion.getDiscountType())) {

            discount = totalAmount.multiply(promotion.getDiscountValue()).divide(BigDecimal.valueOf(100));

        } else {

            discount = promotion.getDiscountValue();
        }

        if (promotion.getMaxDiscountAmount() != null
                && discount.compareTo(
                promotion.getMaxDiscountAmount()
        ) > 0) {

            discount = promotion.getMaxDiscountAmount();
        }

        if (discount.compareTo(totalAmount) > 0) {
            discount = totalAmount;
        }

        return discount;
    }

    private void validatePromotion(Promotion promotion, BigDecimal totalAmount) {

        if (!"ACTIVE".equalsIgnoreCase(promotion.getStatus())) {

            throw new RuntimeException("Khuyến mãi không còn hoạt động");
        }

        LocalDateTime now = LocalDateTime.now();

        if (promotion.getStartDate() != null && now.isBefore(promotion.getStartDate())) {

            throw new RuntimeException("Khuyến mãi chưa bắt đầu");
        }

        if (promotion.getEndDate() != null && now.isAfter(promotion.getEndDate())) {

            throw new RuntimeException("Khuyến mãi đã hết hạn");
        }

        if (promotion.getMinOrderAmount() != null && totalAmount.compareTo(promotion.getMinOrderAmount()) < 0) {

            throw new RuntimeException("Đơn hàng chưa đạt giá trị tối thiểu");
        }

        if (promotion.getUsageLimit() != null && promotion.getUsedCount() >= promotion.getUsageLimit()) {

            throw new RuntimeException("Khuyến mãi đã hết lượt sử dụng");
        }
    }

    private Booking createBooking(
            Employee employee,
            Showtime showtime,
            Promotion promotion,
            BigDecimal discountAmount,
            BigDecimal finalAmount
    ) {

        Booking booking = new Booking();

        booking.setBookingCode(generateBookingCode());

        booking.setEmployee(employee);

        booking.setShowtime(showtime);

        booking.setPromotion(promotion);

        booking.setTotalAmount(finalAmount);

        booking.setDiscountAmount(discountAmount);

        booking.setBookingType("COUNTER");

        booking.setStatus("CONFIRMED");

        booking.setCreatedAt(LocalDateTime.now());

        booking.setUpdatedAt(LocalDateTime.now());

        return bookingRepository.save(booking);
    }

    private List<BookingSeat> createBookingSeats(
            Booking booking,
            List<ShowtimeSeat> showtimeSeats,
            Showtime showtime
    ) {

        List<BookingSeat> bookingSeats = new ArrayList<>();

        String roomType = showtime.getRoom().getRoomType();

        String dayType = getDayType(showtime.getStartTime());

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {

            String seatType = showtimeSeat.getSeat().getSeatType();

            TicketPrice ticketPrice = ticketPriceRepository.findByRoomTypeAndSeatTypeAndDayTypeAndStatus(roomType, seatType, dayType, "ACTIVE")
                            .orElseThrow(() -> new RuntimeException("Không tìm thấy giá vé"));

            BookingSeat bookingSeat = new BookingSeat();

            bookingSeat.setBooking(booking);

            bookingSeat.setSeat(showtimeSeat.getSeat());

            bookingSeat.setPrice(ticketPrice.getPrice());

            bookingSeat.setStatus("ACTIVE");

            bookingSeats.add(bookingSeatRepository.save(bookingSeat));
        }

        return bookingSeats;
    }

    private Payment createPayment(
            Booking booking,
            BigDecimal amount,
            String paymentMethod
    ) {

        Payment payment = new Payment();

        payment.setBooking(booking);

        payment.setPaymentMethod(paymentMethod);

        payment.setAmount(amount);

        payment.setStatus("PAID");

        payment.setPaidAt(LocalDateTime.now());

        payment.setTransactionCode(generateTransactionCode()
        );

        return paymentRepository.save(payment);
    }

    private List<String> createTickets(
            List<BookingSeat> bookingSeats
    ) {

        List<String> ticketCodes = new ArrayList<>();

        for (BookingSeat bookingSeat : bookingSeats) {

            Ticket ticket = new Ticket();

            String ticketCode = generateTicketCode();

            ticket.setTicketCode(ticketCode);

            ticket.setBookingSeat(bookingSeat);

            ticket.setStatus("ACTIVE");

            ticket.setQrToken(java.util.UUID.randomUUID().toString());

            ticket.setIssuedAt(LocalDateTime.now());

            ticketRepository.save(ticket);

            ticketCodes.add(ticketCode);
        }

        return ticketCodes;
    }

    private void markSeatsAsSold(
            List<ShowtimeSeat> showtimeSeats
    ) {

        for (ShowtimeSeat showtimeSeat : showtimeSeats) {

            showtimeSeat.setStatus("SOLD");

            showtimeSeat.setHeldUntil(null);

            showtimeSeatRepository.save(showtimeSeat);
        }
    }

    private String generateBookingCode() {

        return "BK" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + String.valueOf(System.nanoTime()).substring(10);
    }

    private String generateTicketCode() {

        return "TK" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMddHHmmss")) + String.valueOf(System.nanoTime()).substring(10);
    }

    private String generateTransactionCode() {

        return "TXN" + System.currentTimeMillis();
    }

    }


