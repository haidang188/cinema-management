package com.cinemamanagement.controller;

import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Set;

@RestController
@RequestMapping("/api/movie-posters/tmdb")
public class MoviePosterController {
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp");
    private final RestClient client;

    public MoviePosterController() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(5));
        factory.setReadTimeout(Duration.ofSeconds(10));
        this.client = RestClient.builder().requestFactory(factory).build();
    }

    MoviePosterController(RestClient client) {
        this.client = client;
    }

    @GetMapping("/{filename}")
    public ResponseEntity<byte[]> getPoster(@PathVariable String filename) {
        // Accept a filename only, never a caller-supplied host or URL.
        if (!filename.matches("[a-zA-Z0-9_-]+\\.(jpg|jpeg|png|webp)")) {
            return ResponseEntity.badRequest().build();
        }
        try {
            ResponseEntity<byte[]> image = client.get()
                    .uri("https://image.tmdb.org/t/p/w500/{filename}", filename)
                    .retrieve().toEntity(byte[].class);
            MediaType type = image.getHeaders().getContentType();
            byte[] body = image.getBody();
            if (type == null || !IMAGE_TYPES.contains(type.getType() + "/" + type.getSubtype())
                    || body == null || body.length == 0 || body.length > 5 * 1024 * 1024) {
                return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
            }
            return ResponseEntity.ok().contentType(type)
                    .cacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic())
                    .header("X-Content-Type-Options", "nosniff")
                    .body(body);
        } catch (RestClientException exception) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }
}
