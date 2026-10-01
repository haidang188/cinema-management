package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.CounterOrder;
import com.cinemamanagement.entity.Showtime;
import com.cinemamanagement.repository.CounterOrderRepository;
import com.cinemamanagement.repository.ShowtimeRepository;
import com.cinemamanagement.response.CounterOrderResponse;
import com.cinemamanagement.response.ShowtimeBrief;
import com.cinemamanagement.service.CounterOrderService;
import com.cinemamanagement.service.CustomerService;
import com.cinemamanagement.service.HoldPolicyService;
import com.cinemamanagement.util.HoldTokens;
import com.cinemamanagement.service.SeatHoldService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class CounterOrderServiceImpl implements CounterOrderService {

    private static final DateTimeFormatter CODE_DATE = DateTimeFormatter.ofPattern("yyMMdd");
    private static final char[] CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ".toCharArray();

    private final CounterOrderRepository counterOrderRepository;
    private final ShowtimeRepository showtimeRepository;
    private final SeatHoldService seatHoldService;

    private final SecureRandom random = new SecureRandom();

    /* ============================ TẠO / XEM ============================ */

    @Override
    @Transactional
    public CounterOrderResponse create(Long showtimeId, Long employeeId) {

        if (showtimeId == null || !showtimeRepository.existsById(showtimeId)) {
            throw new IllegalArgumentException("Không tìm thấy suất chiếu");
        }

        // 32 byte ngẫu nhiên -> 43 ký tự base64url, khớp định dạng HoldTokens.
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String holdToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        LocalDateTime now = LocalDateTime.now();

        CounterOrder order = new CounterOrder();
        order.setCode(newCode());
        order.setHoldToken(holdToken);
        order.setHoldOwner(HoldTokens.owner(holdToken));
        order.setShowtimeId(showtimeId);
        order.setEmployeeId(employeeId);
        order.setMode("NORMAL");
        order.setStatus("DRAFT");
        order.setExtendCount(0);
        order.setCreatedAt(now);
        order.setUpdatedAt(now);

        return toResponse(counterOrderRepository.save(order), false);
    }

    @Override
    @Transactional(readOnly = true)
    public CounterOrderResponse get(String code) {
        // findByCode (không khoá): transaction readOnly không được SELECT ... FOR UPDATE.
        CounterOrder order = counterOrderRepository.findByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn " + code));

        return toResponse(order, true);
    }

    /* ============================ GIA HẠN ============================ */

    @Override
    @Transactional
    public CounterOrderResponse extend(String code) {

        CounterOrder order = lockDraft(code);

        if (order.getExtendCount() >= HoldPolicyService.MAX_EXTENDS) {
            throw new IllegalStateException("Đơn đã gia hạn tối đa " + HoldPolicyService.MAX_EXTENDS + " lần");
        }

        LocalDateTime now = LocalDateTime.now();

        if (order.getExpiresAt() == null || !order.getExpiresAt().isAfter(now)) {
            throw new IllegalStateException("Đơn chưa giữ ghế hoặc đã hết thời gian giữ");
        }

        // Cộng vào thời gian còn lại, không tính lại từ "bây giờ".
        LocalDateTime until = order.getExpiresAt().plus(HoldPolicyService.EXTEND_STEP);

        seatHoldService.setHoldExpiry(order.getShowtimeId(), order.getHoldOwner(), until);

        order.setExpiresAt(until);
        order.setExtendCount(order.getExtendCount() + 1);
        order.setUpdatedAt(now);

        return toResponse(order, false);
    }

    /* ============================ TẠM GÁC / MỞ LẠI ============================ */

    @Override
    @Transactional
    public CounterOrderResponse park(String code, String customerName, String customerPhone) {

        String name = CustomerService.normalizeName(customerName);
        String phone = CustomerService.normalizePhone(customerPhone);

        if (name == null || phone == null) {
            throw new IllegalArgumentException("Tạm gác đơn cần tên và số điện thoại khách để liên lạc");
        }

        CounterOrder order = lockDraft(code);
        LocalDateTime now = LocalDateTime.now();

        if (order.getExpiresAt() == null || !order.getExpiresAt().isAfter(now)) {
            throw new IllegalStateException("Đơn chưa giữ ghế hoặc đã hết thời gian giữ");
        }

        LocalDateTime until = now.plus(HoldPolicyService.PARK_DURATION);
        List<Long> seats = seatHoldService.setHoldExpiry(order.getShowtimeId(), order.getHoldOwner(), until);

        if (seats.isEmpty()) {
            throw new IllegalStateException("Đơn chưa giữ ghế nào để tạm gác");
        }

        order.setCustomerName(name);
        order.setCustomerPhone(phone);
        order.setStatus("PARKED");
        order.setParkedAt(now);
        order.setExpiresAt(until);
        order.setUpdatedAt(now);

        return toResponse(order, false);
    }

    @Override
    @Transactional
    public CounterOrderResponse resume(String code) {

        CounterOrder order = lockActive(code);

        if (!"PARKED".equals(order.getStatus())) {
            throw new IllegalStateException("Đơn " + code + " không ở trạng thái tạm gác");
        }

        if (order.getExpiresAt() == null || !order.getExpiresAt().isAfter(LocalDateTime.now())) {
            throw new IllegalStateException("Đơn " + code + " đã hết thời gian giữ ghế");
        }

        order.setStatus("DRAFT");
        order.setUpdatedAt(LocalDateTime.now());

        return toResponse(order, true);
    }

    /* ============================ HUỶ ============================ */

    @Override
    @Transactional
    public CounterOrderResponse cancel(String code) {

        CounterOrder order = lockActive(code);

        seatHoldService.release(order.getShowtimeId(), order.getHoldToken(), null);

        order.setStatus("CANCELLED");
        order.setExpiresAt(null);
        order.setUpdatedAt(LocalDateTime.now());

        return toResponse(order, false);
    }

    /* ============================ ĐƠN ĐOÀN ============================ */

    @Override
    @Transactional
    public CounterOrderResponse enableGroup(String code) {

        CounterOrder order = lockDraft(code);
        LocalDateTime now = LocalDateTime.now();

        order.setMode("GROUP");
        order.setUpdatedAt(now);

        // Ghế đang giữ được nâng lên hạn của đơn đoàn (15 phút) nếu đang ít hơn.
        LocalDateTime groupUntil = now.plus(HoldPolicyService.GROUP_DURATION);

        if (order.getExpiresAt() != null && order.getExpiresAt().isAfter(now)
                && order.getExpiresAt().isBefore(groupUntil)) {
            seatHoldService.setHoldExpiry(order.getShowtimeId(), order.getHoldOwner(), groupUntil);
            order.setExpiresAt(groupUntil);
        }

        log.info("Đơn {} bật chế độ đoàn / bao rạp", order.getCode());

        return toResponse(order, false);
    }

    /* ============================ DANH SÁCH TẠM GÁC ============================ */

    @Override
    @Transactional(readOnly = true)
    public List<CounterOrderResponse> listParked() {
        return counterOrderRepository.findParked(LocalDateTime.now()).stream()
                .map(order -> toResponse(order, true))
                .toList();
    }

    /* ============================ DÙNG KHI BÁN ============================ */

    @Override
    public Optional<CounterOrder> findActiveByOwner(String holdOwner) {
        return counterOrderRepository.findByHoldOwner(holdOwner).filter(CounterOrder::isActive);
    }

    @Override
    public void markCompleted(CounterOrder order, Long bookingId, String customerName, String customerPhone) {
        order.setStatus("COMPLETED");
        order.setBookingId(bookingId);
        order.setExpiresAt(null);
        order.setUpdatedAt(LocalDateTime.now());

        if (customerName != null) order.setCustomerName(customerName);
        if (customerPhone != null) order.setCustomerPhone(customerPhone);

        counterOrderRepository.save(order);
    }

    /* ============================ HELPERS ============================ */

    private CounterOrder lockActive(String code) {
        CounterOrder order = counterOrderRepository.lockByCode(code)
                .orElseThrow(() -> new IllegalArgumentException("Không tìm thấy đơn " + code));

        if (!order.isActive()) {
            throw new IllegalStateException("Đơn " + code + " đã kết thúc (" + order.getStatus() + ")");
        }

        return order;
    }

    private CounterOrder lockDraft(String code) {
        CounterOrder order = lockActive(code);

        if (!"DRAFT".equals(order.getStatus())) {
            throw new IllegalStateException("Đơn " + code + " đang tạm gác, hãy mở lại đơn trước");
        }

        return order;
    }

    private String newCode() {
        for (int attempt = 0; attempt < 10; attempt++) {
            StringBuilder sb = new StringBuilder("DH").append(LocalDateTime.now().format(CODE_DATE));

            for (int i = 0; i < 4; i++) {
                sb.append(CODE_ALPHABET[random.nextInt(CODE_ALPHABET.length)]);
            }

            String code = sb.toString();

            if (!counterOrderRepository.existsByCode(code)) {
                return code;
            }
        }

        throw new IllegalStateException("Không tạo được mã đơn, vui lòng thử lại");
    }

    private CounterOrderResponse toResponse(CounterOrder order, boolean withShowtime) {

        LocalDateTime now = LocalDateTime.now();
        boolean holding = order.isActive() && order.getExpiresAt() != null && order.getExpiresAt().isAfter(now);

        Long expiresIn = holding
                ? (Duration.between(now, order.getExpiresAt()).toMillis() + 999) / 1000
                : null;

        List<Long> seats = holding
                ? seatHoldService.heldSeatIds(order.getShowtimeId(), order.getHoldOwner())
                : List.of();

        return new CounterOrderResponse(
                order.getCode(),
                order.isActive() ? order.getHoldToken() : null,
                order.getShowtimeId(),
                order.getMode(),
                order.getStatus(),
                order.isGroup() ? null : HoldPolicyService.COUNTER_MAX_SEATS,
                order.getExtendCount(),
                HoldPolicyService.MAX_EXTENDS,
                expiresIn,
                seats,
                order.getCustomerName(),
                order.getCustomerPhone(),
                withShowtime ? showtimeBrief(order.getShowtimeId()) : null
        );
    }

    private ShowtimeBrief showtimeBrief(Long showtimeId) {
        Showtime s = showtimeRepository.findById(showtimeId).orElse(null);

        if (s == null) {
            return null;
        }

        var movie = s.getMovie();
        var room = s.getRoom();

        return new ShowtimeBrief(
                s.getId(),
                movie.getId(),
                movie.getTitle(),
                movie.getPosterUrl(),
                movie.getAgeRating(),
                movie.getDurationMinutes(),
                room.getId(),
                room.getName(),
                room.getRoomType(),
                s.getFormat(),
                s.getStatus(),
                s.getStartTime(),
                s.getEndTime()
        );
    }
}