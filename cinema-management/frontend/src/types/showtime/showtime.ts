export interface ShowtimeData {
    id: number;
    movieId: number;
    movieTitle: string;
    posterUrl: string;
    durationMinutes: number;
    ageRating?: string | null;
    roomId?: number;
    roomName?: string | null;
    roomType?: string | null;
    startTime: string;
    endTime?: string;
    format?: string | null;
    status?: string | null;
}
