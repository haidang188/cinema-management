package com.cinemamanagement.service.impl;

import com.cinemamanagement.repository.GenreRepository;
import com.cinemamanagement.response.GenreResponse;
import com.cinemamanagement.service.GenreService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
public class GenreServiceImpl implements GenreService {
    private final GenreRepository genreRepository;

    public GenreServiceImpl(GenreRepository genreRepository) {
        this.genreRepository = genreRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GenreResponse> getAllGenres() {
        return genreRepository.findAll().stream()
                .map(GenreResponse::fromEntity)
                .sorted(Comparator.comparing(GenreResponse::name))
                .toList();
    }
}
