package com.cinemamanagement.repository.specification;

import com.cinemamanagement.entity.Booking;
import jakarta.persistence.criteria.JoinType;
import org.springframework.data.jpa.domain.Specification;

import java.time.LocalDateTime;
import java.util.List;

public final class PickupSpecifications {

    public static final List<String> PAID_STATUSES = List.of("CONFIRMED", "PAID", "COMPLETED");

    private PickupSpecifications() {
    }

    public static Specification<Booking> onlinePaidUpcoming(LocalDateTime now) {
        return (root, query, cb) -> cb.and(
                cb.equal(cb.upper(root.get("bookingType")), "ONLINE"),
                cb.upper(root.get("status")).in(PAID_STATUSES),
                cb.greaterThan(root.get("showtime").get("endTime"), now)
        );
    }

    public static Specification<Booking> phone(String digits, String memberPhonePath) {
        return (root, query, cb) -> {
            var member = root.join("member", JoinType.LEFT);

            return cb.or(
                    cb.like(root.get("customerPhone"), "%" + digits + "%"),
                    cb.like(member.get(memberPhonePath), "%" + digits + "%")
            );
        };
    }
}