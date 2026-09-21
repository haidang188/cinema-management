package com.cinemamanagement.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class CreateCinemaRoomRequest {
    @NotBlank(message = "Room name is required")
    @Size(max = 50, message = "Room name must be at most 50 characters")
    private String name;

    @Size(max = 30, message = "Room type must be at most 30 characters")
    private String roomType;

    @NotNull(message = "Rows are required")
    @Min(value = 1, message = "Rows must be at least 1")
    @Max(value = 26, message = "Rows must be at most 26")
    private Integer rows;

    @NotNull(message = "Seats per row are required")
    @Min(value = 1, message = "Seats per row must be at least 1")
    @Max(value = 30, message = "Seats per row must be at most 30")
    private Integer seatsPerRow;

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

    public Integer getRows() {
        return rows;
    }

    public void setRows(Integer rows) {
        this.rows = rows;
    }

    public Integer getSeatsPerRow() {
        return seatsPerRow;
    }

    public void setSeatsPerRow(Integer seatsPerRow) {
        this.seatsPerRow = seatsPerRow;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
