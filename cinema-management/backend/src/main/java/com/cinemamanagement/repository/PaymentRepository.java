package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Payment;
import org.hibernate.internal.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByBookingId(Long bookingId);

    @Query("select p from Payment p where p.booking.id in :bookingIds")
    List<Payment> findAllByBookingIds(@Param("bookingIds") Collection<Long> bookingIds);
}
