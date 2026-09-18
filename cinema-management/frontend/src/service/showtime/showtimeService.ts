import axios from "axios";
import { request } from "../httpClient";
import type {ShowtimeData} from "../../types/showtime/showtime";

const URL: string = import.meta.env.VITE_API_URL;

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
