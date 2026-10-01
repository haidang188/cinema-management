import axios from "axios";

import type { ShowtimeData } from "../../types/showtime/showtime";

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

const client = axios.create({
    baseURL: env.VITE_API_BASE_URL ?? "http://localhost:8080",
});

client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") ?? localStorage.getItem("accessToken");

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export type SeatSummaryDto = {
    showtimeId: number;
    total: number;
    available: number;
};

/** Lịch chiếu từ ngày `from` tới hết ngày `to` (YYYY-MM-DD), 1 request. */
export async function getShowtimesInRange(from: string, to: string): Promise<ShowtimeData[]> {
    const { data } = await client.get<ShowtimeData[]>("/api/counter-sales/showtimes", {
        params: { from, to },
    });

    return Array.isArray(data) ? data : [];
}

/** Số ghế trống / tổng ghế của nhiều suất, 1 request. */
export async function getSeatSummaries(showtimeIds: number[]): Promise<SeatSummaryDto[]> {
    if (showtimeIds.length === 0) return [];

    const { data } = await client.get<SeatSummaryDto[]>("/api/counter-sales/seat-summary", {
        // Spring nhận dạng showtimeIds=1,2,3
        params: { showtimeIds: showtimeIds.join(",") },
    });

    return Array.isArray(data) ? data : [];
}