package com.cinemamanagement.controller;

import com.cinemamanagement.exception.AiServiceException;
import com.cinemamanagement.repository.MovieRepository;
import com.cinemamanagement.service.impl.AiServiceImpl;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;

class AiControllerValidationTest {

    @Test
    void shouldRejectBlankMessage() {
        MovieRepository movieRepository = mock(MovieRepository.class);
        AiServiceImpl aiService = new AiServiceImpl(movieRepository, "test-key", "gpt-4o-mini");

        assertThrows(AiServiceException.class, () -> aiService.chat("   "));
    }
}
