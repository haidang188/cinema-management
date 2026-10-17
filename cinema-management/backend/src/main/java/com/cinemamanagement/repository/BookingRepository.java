package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Booking;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long>, JpaSpecificationExecutor<Booking> {

    Optional<Booking> findByBookingCode(String bookingCode);

    boolean existsByBookingCode(String bookingCode);

    Optional<Booking> findByQrToken(String qrToken);

    Optional<Booking> findByHoldToken(String holdToken);

    @EntityGraph(attributePaths = {"showtime", "showtime.movie", "showtime.room", "promotion"})
    @Query("""
        select booking from Booking booking
        where booking.member.user.id = :userId
          and (:fromDate is null or booking.createdAt >= :fromDate)
          and (:toDate is null or booking.createdAt < :toDate)
          and (:timeline is null
               or (:timeline = 'UNPAID' and upper(booking.status) = 'PENDING_PAYMENT')
               or (:timeline = 'UPCOMING'
                   and upper(booking.status) = 'CONFIRMED'
                   and booking.showtime.startTime >= :now)
               or (:timeline = 'COMPLETED'
                   and upper(booking.status) = 'CONFIRMED'
                   and booking.showtime.startTime < :now))
        """)
    Page<Booking> findMemberHistory(
            @Param("userId") Long userId,
            @Param("fromDate") LocalDateTime fromDate,
            @Param("toDate") LocalDateTime toDate,
            @Param("timeline") String timeline,
            @Param("now") LocalDateTime now,
            Pageable pageable);

    boolean existsByHoldToken(String holdToken);

    List<Booking> findAllByStatusAndPaymentDeadlineLessThanEqual(
            String status,
            LocalDateTime paymentDeadline
    );

    @Query("""
        select count(booking) > 0
        from Booking booking
        where booking.member.user.id = :userId
          and booking.showtime.movie.id = :movieId
          and upper(booking.status) = 'CONFIRMED'
        """)
    boolean existsValidBookingByUserIdAndMovieId(
            @Param("userId") Long userId,
            @Param("movieId") Long movieId);

       @Override
    @EntityGraph(attributePaths = {"showtime", "showtime.movie", "showtime.room", "employee", "promotion"})
    Page<Booking> findAll(Specification<Booking> spec, Pageable pageable);

    /** Nhận vé: khoá đơn khi xác nhận để 2 quầy không giao vé trùng. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select b from Booking b where b.id = :id")
    Optional<Booking> lockById(@Param("id") Long id);
}
