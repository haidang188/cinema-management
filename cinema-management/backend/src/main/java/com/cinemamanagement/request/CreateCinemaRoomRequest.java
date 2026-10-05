package com.cinemamanagement.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public class CreateCinemaRoomRequest {
    @NotBlank(message = "Room name is required")
    @Size(max = 50, message = "Room name must be at most 50 characters")
    private String name;

    @Size(max = 30, message = "Room type must be at most 30 characters")
    private String roomType;

    @Size(max = 30, message = "Status must be at most 30 characters")
    private String status;

    @Valid
    @NotEmpty(message = "Seats are required")
    private List<SeatLayoutRequest> seats;

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

    public List<SeatLayoutRequest> getSeats() {
        return seats;
    }

    public void setSeats(List<SeatLayoutRequest> seats) {
        this.seats = seats;
    }

    public static class SeatLayoutRequest {
        @Size(max = 5, message = "Row label must be at most 5 characters")
        private String rowLabel;

        @NotNull(message = "Seat number is required")
        private Integer seatNumber;

        @Size(max = 30, message = "Seat type must be at most 30 characters")
        private String seatType;

        @Size(max = 30, message = "Seat status must be at most 30 characters")
        private String status;

        @NotNull(message = "Grid row is required")
        private Integer gridRow;

        @NotNull(message = "Grid column is required")
        private Integer gridColumn;

        public String getRowLabel() {
            return rowLabel;
        }

        public void setRowLabel(String rowLabel) {
            this.rowLabel = rowLabel;
        }

        public Integer getSeatNumber() {
            return seatNumber;
        }

        public void setSeatNumber(Integer seatNumber) {
            this.seatNumber = seatNumber;
        }

        public String getSeatType() {
            return seatType;
        }

        public void setSeatType(String seatType) {
            this.seatType = seatType;
        }

        public String getStatus() {
            return status;
        }

        public void setStatus(String status) {
            this.status = status;
        }

        public Integer getGridRow() {
            return gridRow;
        }

        public void setGridRow(Integer gridRow) {
            this.gridRow = gridRow;
        }

        public Integer getGridColumn() {
            return gridColumn;
        }

        public void setGridColumn(Integer gridColumn) {
            this.gridColumn = gridColumn;
        }
    }
}
