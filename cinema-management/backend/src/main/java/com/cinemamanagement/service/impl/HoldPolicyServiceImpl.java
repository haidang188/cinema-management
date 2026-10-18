package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.CounterOrder;
import com.cinemamanagement.repository.CounterOrderRepository;
import com.cinemamanagement.service.HoldPolicyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class HoldPolicyServiceImpl implements HoldPolicyService {

    private final CounterOrderRepository counterOrderRepository;

    @Override
    public Rule resolve(String holdOwner, boolean forNewHold) {

        Optional<CounterOrder> found = counterOrderRepository.findByHoldOwner(holdOwner);

        if (found.isEmpty()) {
            // Giữ ghế tại quầy luôn phải gắn với một đơn quầy (tạo qua /api/counter-orders).
            throw new IllegalStateException("Vui lòng tạo đơn bán vé tại quầy trước khi giữ ghế");
        }

        CounterOrder order = found.get();

        if (!order.isActive()) {
            throw new IllegalStateException("Đơn " + order.getCode() + " đã kết thúc, vui lòng tạo đơn mới");
        }

        if (forNewHold && "PARKED".equals(order.getStatus())) {
            throw new IllegalStateException("Đơn " + order.getCode() + " đang tạm gác, hãy mở lại đơn trước");
        }

        return order.isGroup()
                ? new Rule(null, GROUP_DURATION, order)
                : new Rule(COUNTER_MAX_SEATS, COUNTER_DURATION, order);
    }

    @Override
    public void syncOrderExpiry(Rule rule, LocalDateTime expiresAt) {
        if (rule.order() == null) {
            return;
        }

        CounterOrder order = rule.order();
        order.setExpiresAt(expiresAt);

        // Bỏ hết ghế -> đơn bao rạp quay về đơn thường (giới hạn 20 ghế).
        if (expiresAt == null && order.isGroup()) {
            order.setMode("NORMAL");
        }
        order.setUpdatedAt(LocalDateTime.now());
        counterOrderRepository.save(order);
    }
}