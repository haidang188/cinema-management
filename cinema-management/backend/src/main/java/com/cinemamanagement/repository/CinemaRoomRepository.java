package com.cinemamanagement.repository;

import com.cinemamanagement.entity.CinemaRoom;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CinemaRoomRepository extends JpaRepository<CinemaRoom, Long> {
    @Query("""
            select room from CinemaRoom room
            where (:keyword is null or lower(room.name) like lower(concat('%', :keyword, '%')))
              and (:status is null or room.status = :status)
            """)
    Page<CinemaRoom> searchRooms(@Param("keyword") String keyword, @Param("status") String status, Pageable pageable);
}
