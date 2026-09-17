package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.Movie;
import com.cinemamanagement.exception.AiServiceException;
import com.cinemamanagement.repository.MovieRepository;
import com.cinemamanagement.service.AiService;
import com.google.genai.Client;
import com.google.genai.types.Content;
import com.google.genai.types.GenerateContentConfig;
import com.google.genai.types.GenerateContentResponse;
import com.google.genai.types.Part;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Service
public class AiServiceImpl implements AiService {
    private static final Logger log = LoggerFactory.getLogger(AiServiceImpl.class);
    private static final String SAFE_ERROR_MESSAGE = "Trợ lý AI hiện không thể phản hồi. Vui lòng thử lại sau.";
    private static final String SYSTEM_INSTRUCTION = "Bạn là Cinema AI, trợ lý tư vấn phim của hệ thống rạp chiếu phim.\n"
        + "Trả lời bằng tiếng Việt tự nhiên, ngắn gọn và hữu ích.\n"
        + "Khi người dùng hỏi về phim của rạp, chỉ sử dụng dữ liệu trong MOVIE_CONTEXT.\n"
        + "Không tự tạo tên phim, thời lượng, thể loại, trạng thái hoặc thông tin không có trong context.\n"
        + "Nếu dữ liệu không đủ, hãy nói rõ hệ thống chưa có đủ thông tin.\n"
        + "Ưu tiên gợi ý phim phù hợp với yêu cầu của người dùng.";

    private final MovieRepository movieRepository;
    private final String geminiModel;
    private final Client geminiClient;

    public AiServiceImpl(
            MovieRepository movieRepository,
        @Value("${gemini.api-key:}") String geminiApiKey,
        @Value("${gemini.model}") String geminiModel
    ) {
        this.movieRepository = movieRepository;
    this.geminiModel = geminiModel;
    this.geminiClient = geminiApiKey == null || geminiApiKey.isBlank()
        ? null
        : Client.builder().apiKey(geminiApiKey).build();
    log.info("Gemini API key configured: {}, model: {}, API: generateContent",
        geminiClient != null, geminiModel);
    }

    @Override
    public String chat(String message) {
        String normalizedMessage = message == null ? "" : message.trim();
        if (normalizedMessage.isEmpty()) {
            throw new AiServiceException("Message is required");
        }

        if (geminiClient == null) {
            throw new AiServiceException(SAFE_ERROR_MESSAGE);
        }

        try {
            List<Movie> movies = movieRepository.findAll().stream()
                .filter(movie -> movie.getStatus() == null || !"INACTIVE".equalsIgnoreCase(movie.getStatus().trim()))
                .sorted(Comparator.comparing(Movie::getReleaseDate, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(80)
                .toList();

            String movieContext = buildMovieContext(movies);
                String prompt = "MOVIE_CONTEXT:\n" + movieContext
                    + "\n\nUSER_QUESTION:\n" + normalizedMessage;
                GenerateContentConfig config = GenerateContentConfig.builder()
                    .systemInstruction(Content.fromParts(Part.fromText(SYSTEM_INSTRUCTION)))
                    .temperature(0.2f)
                    .build();

                GenerateContentResponse response = geminiClient.models.generateContent(geminiModel, prompt, config);
                String result = response.text();

            if (result == null || result.isBlank()) {
                throw new AiServiceException(SAFE_ERROR_MESSAGE);
            }

            return result.trim();
        } catch (AiServiceException ex) {
            log.error("Gemini API request failed", ex);
            throw ex;
        } catch (Exception ex) {
            log.error("Gemini API request failed: type={}, message={}",
                    ex.getClass().getName(), ex.getMessage(), ex);
            throw new AiServiceException(SAFE_ERROR_MESSAGE, ex);
        }
    }

    private String buildMovieContext(List<Movie> movies) {
        if (movies.isEmpty()) {
            return "Không có phim nào trong database hiện tại.";
        }

        return movies.stream()
                .map(this::formatMovie)
                .collect(Collectors.joining("\n---\n"));
    }

    private String formatMovie(Movie movie) {
        String genres = movie.getGenres() == null || movie.getGenres().isEmpty()
                ? "Chưa cập nhật"
                : movie.getGenres().stream()
                .map(genre -> genre.getName())
                .sorted(String::compareToIgnoreCase)
                .collect(Collectors.joining(", "));

        return String.format(Locale.forLanguageTag("vi-VN"),
                "ID: %s\n" +
                        "Tiêu đề: %s\n" +
                        "Thể loại: %s\n" +
                        "Mô tả: %s\n" +
                        "Thời lượng: %s phút\n" +
                        "Ngày phát hành: %s\n" +
                        "Giới hạn tuổi: %s\n" +
                        "Đạo diễn: %s\n" +
                        "Diễn viên: %s\n" +
                        "Ngôn ngữ: %s\n" +
                        "Trạng thái: %s",
                movie.getId(),
                movie.getTitle(),
                genres,
                movie.getDescription() == null ? "Chưa cập nhật" : movie.getDescription(),
                movie.getDurationMinutes() == null ? "Chưa cập nhật" : movie.getDurationMinutes(),
                movie.getReleaseDate() == null ? "Chưa cập nhật" : movie.getReleaseDate(),
                movie.getAgeRating() == null ? "Chưa cập nhật" : movie.getAgeRating(),
                movie.getDirector() == null ? "Chưa cập nhật" : movie.getDirector(),
                movie.getCast() == null ? "Chưa cập nhật" : movie.getCast(),
                movie.getLanguage() == null ? "Chưa cập nhật" : movie.getLanguage(),
                movie.getStatus() == null ? "Chưa cập nhật" : movie.getStatus()
        );
    }

}
