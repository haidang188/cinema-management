package com.cinemamanagement.controller;

import com.cinemamanagement.request.ScheduleShowtimeRequest;
import com.cinemamanagement.response.ShowtimeResponse;
import com.cinemamanagement.service.impl.AdminShowtimeService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/showtimes")
public class AdminShowtimeController {
    private final AdminShowtimeService service;

    @GetMapping
    public List<ShowtimeResponse> list(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return service.list(date);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ShowtimeResponse create(@Valid @RequestBody ScheduleShowtimeRequest request) { return service.create(request); }

    @PutMapping("/{id}")
    public ShowtimeResponse update(@PathVariable Long id, @Valid @RequestBody ScheduleShowtimeRequest request) {
        return service.update(id, request);
    }

    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cancel(@PathVariable Long id) { service.cancel(id); }
}
