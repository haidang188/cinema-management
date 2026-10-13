package com.cinemamanagement.repository;

import com.cinemamanagement.entity.PointHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PointHistoryRepository extends JpaRepository<PointHistory, Long> {
    Page<PointHistory> findAllByMemberIdOrderByCreatedAtDesc(Long memberId, Pageable pageable);

    boolean existsByIdempotencyKey(String idempotencyKey);

    boolean existsByBookingIdAndType(Long bookingId, String type);
}
