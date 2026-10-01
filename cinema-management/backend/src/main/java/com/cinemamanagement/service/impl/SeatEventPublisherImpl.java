package com.cinemamanagement.service.impl;

import com.cinemamanagement.entity.ShowtimeSeat;
import com.cinemamanagement.response.SeatEventMessage;
import com.cinemamanagement.response.SeatStateResponse;
import com.cinemamanagement.service.SeatEventPublisher;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SeatEventPublisherImpl implements SeatEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public void publishAfterCommit(Long showtimeId, Collection<ShowtimeSeat> seats) {
        if (seats == null || seats.isEmpty()) {
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        List<SeatStateResponse> payload = seats.stream().map(s -> SeatStateResponse.of(s, now)).toList();
        SeatEventMessage message = new SeatEventMessage(showtimeId, payload);

        Runnable send = () -> messagingTemplate.convertAndSend(SeatEventPublisher.topic(showtimeId), message);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    send.run();
                }
            });
        } else {
            send.run();
        }
    }
}