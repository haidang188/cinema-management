package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Booking;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
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

    /**
     * Quản lý đặt vé: tìm kiếm có phân trang, nạp sẵn suất chiếu / phim / phòng /
     * nhân viên / khuyến mãi trong cùng câu SQL (tránh N+1).
     */
    @Override
    @EntityGraph(attributePaths = {"showtime", "showtime.movie", "showtime.room", "employee", "promotion"})
    Page<Booking> findAll(Specification<Booking> spec, Pageable pageable);
}