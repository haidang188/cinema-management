package com.cinemamanagement.websocket;

import com.cinemamanagement.enums.SeatEventType;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
public class SeatStatusPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    public void publishHeld(
            Long showtimeId,
            List<Long> showtimeSeatIds,
            LocalDateTime heldUntil
    ) {
        publish(
                SeatEventType.SEATS_HELD,
                showtimeId,
                showtimeSeatIds,
                heldUntil
        );
    }

    public void publishReleased(
            Long showtimeId,
            List<Long> showtimeSeatIds
    ) {
        publish(
                SeatEventType.SEATS_RELEASED,
                showtimeId,
                showtimeSeatIds,
                null
        );
    }

    public void publishSold(
            Long showtimeId,
            List<Long> showtimeSeatIds
    ) {
        publish(
                SeatEventType.SEATS_SOLD,
                showtimeId,
                showtimeSeatIds,
                null
        );
    }

    private void publish(
            SeatEventType type,
            Long showtimeId,
            List<Long> showtimeSeatIds,
            LocalDateTime heldUntil
    ) {
        SeatStatusMessage message = new SeatStatusMessage(
                type.name(),
                showtimeId,
                List.copyOf(showtimeSeatIds),
                heldUntil
        );

        messagingTemplate.convertAndSend(
                "/topic/showtimes/"
                        + showtimeId
                        + "/seats",
                message
        );
    }
}