import type {ShowtimeData} from "../../types/showtime/showtime";

export interface DateItem {
    value: string;
    day: string;
    month: string;
    weekday: string;
}

export interface MovieGroup {
    movieId: number;
    movieTitle: string;
    posterUrl: string;
    durationMinutes: number;
    ageRating?: string | null;
    language?: string | null;
    showtimes: ShowtimeData[];
}
