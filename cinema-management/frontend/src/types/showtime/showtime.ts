export interface ShowtimeData {
    id: number;

    movieId: number;
    movieTitle: string;
    posterUrl: string;
    durationMinutes: number;
    ageRating?: string | null;
    language?: string | null;

    roomId: number;
    roomName: string;
    roomType: string;

    format?: string | null;

    startTime: string;
    endTime?: string | null;
    status?: string | null;

    availableSeats: number;
    totalSeats: number;
}