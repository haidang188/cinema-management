package com.cinemamanagement.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class UpdateCinemaRoomRequest {
    @NotBlank(message = "Room name is required")
    @Size(max = 50, message = "Room name must be at most 50 characters")
    private String name;

    @Size(max = 30, message = "Room type must be at most 30 characters")
    private String roomType;

    @Size(max = 30, message = "Status must be at most 30 characters")
    private String status;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getRoomType() {
        return roomType;
    }

    public void setRoomType(String roomType) {
        this.roomType = roomType;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
