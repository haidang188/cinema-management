package com.cinemamanagement.repository;

import com.cinemamanagement.entity.BookingSeat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface BookingSeatRepository extends JpaRepository<BookingSeat, Long> {

    List<BookingSeat> findByBookingId(Long bookingId);

    boolean existsByBookingIdAndSeatId(
            Long bookingId,
            Long seatId
    );

    @Query("""
            select bs from BookingSeat bs
            join fetch bs.seat
            where bs.booking.id in :bookingIds
            """)
    List<BookingSeat> findAllWithSeatByBookingIds(@Param("bookingIds") Collection<Long> bookingIds);
}