import { useEffect, useRef, useState } from "react";
import { Client } from "@stomp/stompjs";

import { WS_URL } from "./seatHoldService";
import type { SeatStateDto } from "./seatHoldService";

export type SocketStatus = "connecting" | "online" | "offline";

type SeatEventMessage = {
    showtimeId: number;
    seats: SeatStateDto[];
};

/**
 * Nghe thay đổi ghế của 1 suất chiếu qua STOMP:
 *   /topic/showtimes/{showtimeId}/seats
 * Tự kết nối lại sau 3 giây khi rớt mạng / backend khởi động lại.
 */
export function useSeatSocket(
    showtimeId: number | undefined,
    onSeats: (seats: SeatStateDto[]) => void
): SocketStatus {
    const [status, setStatus] = useState<SocketStatus>("connecting");
    const callbackRef = useRef(onSeats);

    callbackRef.current = onSeats;

    useEffect(() => {
        if (!showtimeId) return;

        const token = localStorage.getItem("token") ?? localStorage.getItem("accessToken");

        const client = new Client({
            brokerURL: WS_URL,
            connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
            reconnectDelay: 3_000,
            heartbeatIncoming: 10_000,
            heartbeatOutgoing: 10_000,
            onConnect: () => {
                setStatus("online");

                client.subscribe(`/topic/showtimes/${showtimeId}/seats`, (frame) => {
                    try {
                        const message = JSON.parse(frame.body) as SeatEventMessage;
                        if (Array.isArray(message.seats)) callbackRef.current(message.seats);
                    } catch (err) {
                        console.warn("Tin nhắn ghế không hợp lệ:", err);
                    }
                });
            },
            onWebSocketClose: () => setStatus("offline"),
            onStompError: (frame) => {
                console.warn("STOMP lỗi:", frame.headers.message);
                setStatus("offline");
            },
        });

        setStatus("connecting");
        client.activate();

        return () => {
            client.deactivate();
        };
    }, [showtimeId]);

    return status;
}