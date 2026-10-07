package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    Optional<Ticket> findByTicketCode(String ticketCode);

    Optional<Ticket> findByQrToken(String qrToken);

    Optional<Ticket> findByBookingSeatId(Long bookingSeatId);

    boolean existsByTicketCode(String ticketCode);

    List<Ticket> findAllByBookingSeatBookingIdOrderByIdAsc(Long bookingId);

    /** Quản lý đặt vé: vé của 1 đơn, nạp sẵn booking_seat trong cùng câu SQL. */
    @Query("""
            select t from Ticket t
            join fetch t.bookingSeat bs
            where bs.booking.id = :bookingId
            """)
    List<Ticket> findAllByBookingId(@Param("bookingId") Long bookingId);
}