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

import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long>, JpaSpecificationExecutor<Booking> {

    Optional<Booking> findByBookingCode(String bookingCode);

    boolean existsByBookingCode(String bookingCode);

    @Query("""
        select count(booking) > 0
        from Booking booking
        where booking.member.user.id = :userId
          and booking.showtime.movie.id = :movieId
          and (booking.status is null or upper(booking.status) <> 'CANCELLED')
        """)
    boolean existsValidBookingByUserIdAndMovieId(
            @Param("userId") Long userId,
            @Param("movieId") Long movieId);

    @Override
    @EntityGraph(attributePaths = {"showtime", "showtime.movie", "showtime.room", "employee", "promotion"})
    Page<Booking> findAll(Specification<Booking> spec, Pageable pageable);

}

