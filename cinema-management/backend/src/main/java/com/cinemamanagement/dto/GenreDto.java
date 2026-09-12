package com.cinemamanagement.dto;

import com.cinemamanagement.entity.Genre;

public record GenreDto(Long id, String name) {
    public static GenreDto fromEntity(Genre genre) {
        return new GenreDto(genre.getId(), genre.getName());
    }
}
