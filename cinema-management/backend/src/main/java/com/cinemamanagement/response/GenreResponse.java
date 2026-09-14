package com.cinemamanagement.response;

import com.cinemamanagement.entity.Genre;

public record GenreResponse(Long id, String name) {
    public static GenreResponse fromEntity(Genre genre) {
        return new GenreResponse(genre.getId(), genre.getName());
    }
}
