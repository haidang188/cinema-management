package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

public interface CustomerPromotionRepository extends JpaRepository<Promotion, Long> {

    @Query("""
            select p from Promotion p
            where upper(coalesce(p.status, '')) <> 'INACTIVE'
              and p.startDate is not null
              and p.endDate >= :now
              and (
                    p.usageLimit is null
                    or coalesce(p.usedCount, 0) < p.usageLimit
              )
              and (
                    :status is null
                    or (:status = 'ACTIVE' and p.startDate <= :now)
                    or (:status = 'UPCOMING' and p.startDate > :now)
              )
              and (
                    :keyword is null
                    or lower(p.title) like lower(concat('%', :keyword, '%'))
                    or lower(coalesce(p.code, '')) like lower(concat('%', :keyword, '%'))
              )
            """)
    Page<Promotion> findVisible(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );
}