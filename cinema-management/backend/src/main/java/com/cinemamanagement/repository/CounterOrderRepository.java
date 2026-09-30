package com.cinemamanagement.repository;

import com.cinemamanagement.entity.CounterOrder;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface CounterOrderRepository extends JpaRepository<CounterOrder, Long> {

    Optional<CounterOrder> findByHoldOwner(String holdOwner);

    boolean existsByCode(String code);

    Optional<CounterOrder> findByCode(String code);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from CounterOrder o where o.code = :code")
    Optional<CounterOrder> lockByCode(@Param("code") String code);

    @Query("""
            select o from CounterOrder o
            where o.status = 'PARKED' and o.expiresAt > :now
            order by o.expiresAt asc
            """)
    List<CounterOrder> findParked(@Param("now") LocalDateTime now);

    /** Đơn nháp / tạm gác đã quá hạn giữ ghế -> EXPIRED. */
    @Modifying(flushAutomatically = true)
    @Query("""
            update CounterOrder o
            set o.status = 'EXPIRED', o.updatedAt = :now
            where o.status in ('DRAFT', 'PARKED')
              and o.expiresAt is not null and o.expiresAt <= :now
            """)
    int expireOverdue(@Param("now") LocalDateTime now);
}