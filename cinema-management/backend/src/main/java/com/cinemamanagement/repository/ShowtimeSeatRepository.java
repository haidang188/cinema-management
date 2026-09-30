package com.cinemamanagement.repository;

import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.repository.projection.ShowtimeSeatSummaryView;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface ShowtimeSeatRepository extends JpaRepository<ShowtimeSeat, Long> {
    List<ShowtimeSeat> findByShowtimeId(Long showtimeId);

    Optional<ShowtimeSeat> findByShowtimeIdAndSeatId(
            Long showtimeId,
            Long seatId
    );

    long countByShowtimeId(Long showtimeId);

    long countByShowtimeIdAndStatus(
            Long showtimeId,
            String status
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT ss
            FROM ShowtimeSeat ss
            WHERE ss.id = :id
            """)
    Optional<ShowtimeSeat> findByIdForUpdate(
            @Param("id") Long id
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
    SELECT ss
    FROM ShowtimeSeat ss
    WHERE ss.id = :id
      AND ss.showtime.id = :showtimeId
""")
    Optional<ShowtimeSeat> findByIdAndShowtimeIdForUpdate(
            @Param("id") Long id,
            @Param("showtimeId") Long showtimeId
    );

    @Query("""
            select ss.showtime.id as showtimeId,
                   count(ss) as total,
                   sum(case when ss.status = 'AVAILABLE' then 1 else 0 end) as available
            from ShowtimeSeat ss
            where ss.showtime.id in :showtimeIds
            group by ss.showtime.id
            """)
    List<ShowtimeSeatSummaryView> summarizeByShowtimeIds(
            @Param("showtimeIds") Collection<Long> showtimeIds
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select ss from ShowtimeSeat ss
            join fetch ss.seat
            where ss.showtime.id = :showtimeId and ss.id in :ids
            order by ss.id
            """)
    List<ShowtimeSeat> lockByShowtimeAndIds(
            @Param("showtimeId") Long showtimeId,
            @Param("ids") Collection<Long> ids
    );

    /** Khoá các ghế một người đang giữ trong một suất. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select ss from ShowtimeSeat ss
            join fetch ss.seat
            where ss.showtime.id = :showtimeId
              and ss.status = 'HELD'
              and ss.holdOwner = :owner
            order by ss.id
            """)
    List<ShowtimeSeat> lockHeldBy(
            @Param("showtimeId") Long showtimeId,
            @Param("owner") String owner
    );

    /** Ghế giữ đã quá hạn (để job định kỳ trả lại AVAILABLE). */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select ss from ShowtimeSeat ss
            join fetch ss.showtime
            where ss.status = 'HELD' and ss.heldUntil <= :now
            order by ss.id
            """)
    List<ShowtimeSeat> lockExpiredHolds(@Param("now") LocalDateTime now);

    @Query("select ss from ShowtimeSeat ss join fetch ss.seat where ss.showtime.id = :showtimeId")
    List<ShowtimeSeat> findAllByShowtimeIdWithSeat(@Param("showtimeId") Long showtimeId);



}
