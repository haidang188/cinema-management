package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Promotion;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.Optional;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Promotion p where p.id = :id")
    Optional<Promotion> findForUpdate(@Param("id") Long id);

    @Query("select count(b) from Booking b where b.promotion.id = :id")
    long countBookings(@Param("id") Long id);

    @Query("""
            select p from Promotion p
            where (:keyword is null
                or lower(p.title) like lower(concat('%', :keyword, '%'))
                or lower(coalesce(p.description, '')) like lower(concat('%', :keyword, '%'))
                or lower(coalesce(p.code, '')) like lower(concat('%', :keyword, '%')))
              and (:discountType is null or upper(p.discountType) = upper(:discountType))
              and (:fromDate is null or p.endDate >= :fromDate)
              and (:toDate is null or p.startDate <= :toDate)
              and (
                    :status is null
                    or (:status = 'INACTIVE'
                        and upper(coalesce(p.status, '')) = 'INACTIVE')
                    or (:status = 'FULL'
                        and upper(coalesce(p.status, '')) <> 'INACTIVE'
                        and p.usageLimit is not null
                        and coalesce(p.usedCount, 0) >= p.usageLimit)
                    or (:status = 'UPCOMING'
                        and upper(coalesce(p.status, '')) <> 'INACTIVE'
                        and (p.usageLimit is null
                            or coalesce(p.usedCount, 0) < p.usageLimit)
                        and p.startDate > :now)
                    or (:status = 'ACTIVE'
                        and upper(coalesce(p.status, '')) <> 'INACTIVE'
                        and (p.usageLimit is null
                            or coalesce(p.usedCount, 0) < p.usageLimit)
                        and p.startDate <= :now
                        and p.endDate >= :now)
                    or (:status = 'EXPIRED'
                        and upper(coalesce(p.status, '')) <> 'INACTIVE'
                        and (p.usageLimit is null
                            or coalesce(p.usedCount, 0) < p.usageLimit)
                        and p.endDate < :now)
              )
            """)
    Page<Promotion> search(
            @Param("keyword") String keyword,
            @Param("status") String status,
            @Param("discountType") String discountType,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("now") LocalDateTime now,
            Pageable pageable
    );

    @Query("""
            select count(p) from Promotion p
            where upper(coalesce(p.status, '')) <> 'INACTIVE'
              and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)
              and p.startDate <= :now and p.endDate >= :now
            """)
    long countActive(@Param("now") LocalDateTime now);

    @Query("""
            select count(p) from Promotion p
            where upper(coalesce(p.status, '')) <> 'INACTIVE'
              and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)
              and p.startDate > :now
            """)
    long countUpcoming(@Param("now") LocalDateTime now);

    @Query("""
            select count(p) from Promotion p
            where upper(coalesce(p.status, '')) <> 'INACTIVE'
              and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)
              and p.endDate < :now
            """)
    long countExpired(@Param("now") LocalDateTime now);

    @Query("""
            select count(p) from Promotion p
            where upper(coalesce(p.status, '')) = 'INACTIVE'
            """)
    long countInactive();

    @Query("""
            select count(p) from Promotion p
            where upper(coalesce(p.status, '')) <> 'INACTIVE'
              and p.usageLimit is not null
              and coalesce(p.usedCount, 0) >= p.usageLimit
            """)
    long countFull();

    @Query("""
            select count(p) from Promotion p
            where upper(coalesce(p.status, '')) <> 'INACTIVE'
              and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)
              and p.startDate <= :now
              and p.endDate >= :now
              and p.endDate <= :sevenDaysLater
            """)
    long countExpiringSoon(
            @Param("now") LocalDateTime now,
            @Param("sevenDaysLater") LocalDateTime sevenDaysLater
    );
}