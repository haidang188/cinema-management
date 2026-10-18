import type { ShowtimeSeat } from "../../types/showtimeSeat/showtimeSeat";

import { API_BASE_URL } from "../apiBase";

const URL = API_BASE_URL;

export async function getShowtimeSeats(
    showtimeId: number
): Promise<ShowtimeSeat[]> {
    const response = await fetch(
        `${URL}/showtime-seats?showtimeId=${showtimeId}`
    );

    if (!response.ok) {
        throw new Error("Không thể tải danh sách ghế");
    }

    return response.json();
}