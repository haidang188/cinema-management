package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Promotion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface PromotionRepository extends JpaRepository<Promotion, Long> {

        boolean existsByCodeIgnoreCase(String code);

        @Query("""
                        select p from Promotion p
                        where (:keyword is null
                            or lower(p.title) like lower(concat('%', :keyword, '%'))
                            or lower(coalesce(p.description, '')) like lower(concat('%', :keyword, '%'))
                            or lower(coalesce(p.code, '')) like lower(concat('%', :keyword, '%')))
                          and (:discountType is null or upper(p.discountType) = upper(:discountType))
                          and (:fromDate is null or p.startDate >= :fromDate)
                          and (:toDate is null or p.endDate <= :toDate)
                          and (
                                :status is null
                                or (:status = 'INACTIVE' and (
                                    upper(coalesce(p.status, '')) = 'INACTIVE'
                                    or (p.usageLimit is not null and coalesce(p.usedCount, 0) >= p.usageLimit)
                                ))
                                or (:status = 'UPCOMING'
                                    and upper(coalesce(p.status, '')) <> 'INACTIVE'
                                    and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)
                                    and p.startDate > :now)
                                or (:status = 'ACTIVE'
                                    and upper(coalesce(p.status, '')) <> 'INACTIVE'
                                    and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)
                                    and p.startDate <= :now and p.endDate >= :now)
                                or (:status = 'EXPIRED'
                                    and upper(coalesce(p.status, '')) <> 'INACTIVE'
                                    and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)
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
                        Pageable pageable);

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
                           or (p.usageLimit is not null and coalesce(p.usedCount, 0) >= p.usageLimit)
                        """)
        long countInactive();

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
                        @Param("sevenDaysLater") LocalDateTime sevenDaysLater);


        // Dang them. Goi ma giam gia trong phan ban ve tai quay
        Optional<Promotion> findByCodeIgnoreCase(String code);

        @Modifying(flushAutomatically = true)

        @Query("""
                        update Promotion p
                        set p.usedCount = coalesce(p.usedCount, 0) + 1
                        where p.id = :id
                          and upper(coalesce(p.status, '')) <> 'INACTIVE'
                          and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)
                        """)
        int incrementUsedCountIfAvailable(@Param("id") Long id);

        @Query("""
                        select p from Promotion p
                        where upper(coalesce(p.status, '')) <> 'INACTIVE'
                          and (p.usageLimit is null or coalesce(p.usedCount, 0) < p.usageLimit)
                          and p.startDate <= :now and p.endDate >= :now
                          and coalesce(p.minOrderAmount, 0) <= :orderAmount
                        order by p.endDate asc
                        """)
        List<Promotion> findApplicable(
                @Param("now") LocalDateTime now,
                @Param("orderAmount") BigDecimal orderAmount);
}
