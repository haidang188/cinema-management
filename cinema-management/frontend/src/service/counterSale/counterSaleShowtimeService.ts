import axios from "axios";

import type { ShowtimeData } from "../../types/showtime/showtime";
import { API_ORIGIN } from "../apiBase";

const client = axios.create({
    baseURL: API_ORIGIN,
    withCredentials: true,
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