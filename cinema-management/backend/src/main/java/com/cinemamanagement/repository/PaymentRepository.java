package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Payment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByBookingId(Long bookingId);

    Optional<Payment> findByTransactionCode(String transactionCode);

    /** Quản lý đặt vé: thanh toán của nhiều đơn trong 1 câu SQL. */
    @Query("select p from Payment p where p.booking.id in :bookingIds")
    List<Payment> findAllByBookingIds(@Param("bookingIds") Collection<Long> bookingIds);
}