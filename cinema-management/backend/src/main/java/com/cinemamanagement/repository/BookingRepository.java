package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Booking;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByBookingCode(String bookingCode);

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
}
