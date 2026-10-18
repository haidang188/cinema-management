import axios from "axios";
import { request } from "../httpClient";
import type {ShowtimeData} from "../../types/showtime/showtime";
import { API_BASE_URL } from "../apiBase";

const URL: string = API_BASE_URL;

export const getShowtimesByDate = async (
    date: string
): Promise<ShowtimeData[]> => {

    try {

        const res = await axios.get<ShowtimeData[]>(
            `${URL}/showtimes`,
            {
                params: {
                    date: date
                }
            }
        );

        return res.data;

    } catch (e) {

        console.error("Error fetching showtimes:", e);

        return [];
    }
};

export function getShowtimesByMovieAndDate(movieId: string, date: string): Promise<ShowtimeData[]> {
    return request<ShowtimeData[]>(`/api/showtimes/movie/${movieId}?date=${date}`);
}

export function getShowtimeById(showtimeId: number): Promise<ShowtimeData> {
    return request<ShowtimeData>(`/api/showtimes/${showtimeId}`);
}

export function searchUpcomingShowtimes(keyword: string): Promise<ShowtimeData[]> {
    return request<ShowtimeData[]>(`/api/showtimes/search?keyword=${encodeURIComponent(keyword)}`);
}
