package com.cinemamanagement.service;

import com.cinemamanagement.request.UpdateSeatTypesRequest;
import com.cinemamanagement.request.CreateCinemaRoomRequest;
import com.cinemamanagement.request.UpdateCinemaRoomRequest;
import com.cinemamanagement.response.CinemaRoomDetailResponse;
import com.cinemamanagement.response.CinemaRoomListResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface CinemaRoomService {
    Page<CinemaRoomListResponse> getRooms(String keyword, String status, Pageable pageable);

    CinemaRoomDetailResponse createRoom(CreateCinemaRoomRequest request);

    CinemaRoomDetailResponse updateRoom(Long roomId, UpdateCinemaRoomRequest request);

    CinemaRoomDetailResponse getRoomDetail(Long roomId);

    CinemaRoomDetailResponse updateSeatTypes(Long roomId, UpdateSeatTypesRequest request);
}
