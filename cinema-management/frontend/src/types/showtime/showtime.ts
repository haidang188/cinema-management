export interface ShowtimeData {
    id: number;
    movieId: number;
    movieTitle: string;
    posterUrl: string;
    durationMinutes: number;
    ageRating?: string | null;
    startTime: string;
    format?: string | null;
}