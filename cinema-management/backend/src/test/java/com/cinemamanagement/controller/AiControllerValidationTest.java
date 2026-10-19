package com.cinemamanagement.controller;

import com.cinemamanagement.exception.AiServiceException;
import com.cinemamanagement.repository.MovieRepository;
import com.cinemamanagement.service.impl.AiServiceImpl;
import com.cinemamanagement.exception.GlobalExceptionHandler;
import com.cinemamanagement.service.AiService;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class AiControllerValidationTest {

    @Test
    void shouldRejectBlankMessage() {
        MovieRepository movieRepository = mock(MovieRepository.class);
        AiServiceImpl aiService = new AiServiceImpl(movieRepository, "", "test-model");

        assertThrows(AiServiceException.class, () -> aiService.chat("   "));
    }

    @Test
    void missingKeyFailsWithoutReadingMovies() {
        MovieRepository movies = mock(MovieRepository.class);
        AiServiceImpl service = new AiServiceImpl(movies, "", "test-model");
        assertThrows(AiServiceException.class, () -> service.chat("Gợi ý phim"));
        verifyNoInteractions(movies);
    }

    private MockMvc mvc(AiService service) {
        return MockMvcBuilders.standaloneSetup(new AiController(service))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @Test
    void endpointReturnsReply() throws Exception {
        AiService service = mock(AiService.class);
        when(service.chat("Gợi ý phim")).thenReturn("Phim phù hợp");
        mvc(service).perform(post("/api/ai/chat").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Gợi ý phim\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.reply").value("Phim phù hợp"));
    }

    @Test
    void endpointRejectsBlankAndOversizedMessages() throws Exception {
        AiService service = mock(AiService.class);
        MockMvc mvc = mvc(service);
        for (String message : new String[]{"   ", "a".repeat(1001)}) {
            mvc.perform(post("/api/ai/chat").contentType(MediaType.APPLICATION_JSON)
                            .content("{\"message\":\"" + message + "\"}"))
                    .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fieldErrors.message").exists());
        }
        verifyNoInteractions(service);
    }

    @Test
    void endpointHidesProviderErrorDetails() throws Exception {
        AiService service = mock(AiService.class);
        when(service.chat(anyString())).thenThrow(new AiServiceException("private-provider-detail"));
        mvc(service).perform(post("/api/ai/chat").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"Phim\"}"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.message").value("Trợ lý AI hiện không thể phản hồi. Vui lòng thử lại sau."));
    }

    @Test
    void corsAllowsFrontendAndRejectsUnknownOrigin() throws Exception {
        AiService service = mock(AiService.class);
        when(service.chat(anyString())).thenReturn("Phim phù hợp");
        MockMvc mvc = mvc(service);
        mvc.perform(post("/api/ai/chat").header("Origin", "http://localhost:5173")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"Phim\"}"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"));
        mvc.perform(post("/api/ai/chat").header("Origin", "https://unknown.example")
                        .contentType(MediaType.APPLICATION_JSON).content("{\"message\":\"Phim\"}"))
                .andExpect(status().isForbidden());
    }
}
