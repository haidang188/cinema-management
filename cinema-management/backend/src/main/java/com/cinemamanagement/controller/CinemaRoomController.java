package com.cinemamanagement.controller;

import com.cinemamanagement.request.UpdateSeatTypesRequest;
import com.cinemamanagement.response.CinemaRoomDetailResponse;
import com.cinemamanagement.response.CinemaRoomListResponse;
import com.cinemamanagement.service.CinemaRoomService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/cinema-rooms")
@CrossOrigin(origins = {
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174"
})
public class CinemaRoomController {
    private final CinemaRoomService cinemaRoomService;

    public CinemaRoomController(CinemaRoomService cinemaRoomService) {
        this.cinemaRoomService = cinemaRoomService;
    }

    @GetMapping
    public Page<CinemaRoomListResponse> getRooms(
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) String status,
            @PageableDefault(size = 10) Pageable pageable
    ) {
        return cinemaRoomService.getRooms(keyword, status, pageable);
    }

    @GetMapping("/{id}")
    public CinemaRoomDetailResponse getRoomDetail(@PathVariable Long id) {
        return cinemaRoomService.getRoomDetail(id);
    }

    @PutMapping("/{roomId}/seats")
    public CinemaRoomDetailResponse updateSeatTypes(
            @PathVariable Long roomId,
            @Valid @RequestBody UpdateSeatTypesRequest request
    ) {
        return cinemaRoomService.updateSeatTypes(roomId, request);
    }
}
