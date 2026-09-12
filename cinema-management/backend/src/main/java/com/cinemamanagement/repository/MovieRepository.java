package com.cinemamanagement.repository;

import com.cinemamanagement.entity.Movie;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface MovieRepository extends JpaRepository<Movie, Long> {
    List<Movie> findByStatusOrderByReleaseDateDesc(String status);

    boolean existsByTitle(String title);

    Optional<Movie> findFirstByStatusOrderByReleaseDateDesc(String status);
}
