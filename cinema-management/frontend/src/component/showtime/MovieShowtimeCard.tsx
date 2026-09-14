import type {ShowtimeData} from "../../types/showtime/showtime";

interface MovieGroup {
    movieId: number;
    movieTitle: string;
    posterUrl: string;
    durationMinutes: number;
    ageRating?: string | null;
    showtimes: ShowtimeData[];
}

interface FormatGroup {
    format: string;
    showtimes: ShowtimeData[];
}

interface MovieShowtimeCardProps {
    movie: MovieGroup;
}

function MovieShowtimeCard({
                               movie
                           }: MovieShowtimeCardProps) {

    const groupByFormat = (
        movieShowtimes: ShowtimeData[]
    ): FormatGroup[] => {

        const grouped = movieShowtimes.reduce<
            Record<string, FormatGroup>
        >(
            (formats, showtime) => {

                const format = showtime.format || "Khác";

                if (!formats[format]) {

                    formats[format] = {
                        format,
                        showtimes: []
                    };
                }

                formats[format].showtimes.push(showtime);

                return formats;

            },
            {}
        );

        return Object.values(grouped);
    };

    const formatTime = (dateTime: string): string => {

        return new Date(dateTime).toLocaleTimeString(
            "vi-VN",
            {
                hour: "2-digit",
                minute: "2-digit"
            }
        );
    };

    const firstShowtime =
        movie.showtimes[0];

    const roomNames = Array.from(
        new Set(
            movie.showtimes
                .map((showtime) => showtime.roomName)
                .filter(Boolean)
        )
    );

    return (
        <div
            className="showtime-movie-card"
            key={movie.movieId}
        >

            <div className="movie-poster-wrapper">

                <img
                    src={movie.posterUrl}
                    alt={movie.movieTitle}
                    className="showtime-movie-poster"
                />

            </div>

            <div className="showtime-movie-content">

                <div className="showtime-movie-info">
                    <div>
                        <h2>
                            {movie.movieTitle}
                        </h2>

                        <div className="showtime-movie-meta">

                            {firstShowtime?.format && (
                                <span>
                                    {firstShowtime.format}
                                </span>
                            )}

                            {movie.ageRating && (
                                <span>
                                    {movie.ageRating}
                                </span>
                            )}

                            <span>
                                {movie.durationMinutes} phút
                            </span>

                            {firstShowtime?.roomType && (
                                <span>
                                    {firstShowtime.roomType}
                                </span>
                            )}

                        </div>
                    </div>

                    {roomNames.length > 0 && (
                        <div className="showtime-room-summary">
                            {roomNames.join(" · ")}
                        </div>
                    )}
                </div>

                <div className="showtime-schedule">

                    {groupByFormat(movie.showtimes).map(
                        (formatGroup) => (

                            <div
                                className="showtime-room"
                                key={formatGroup.format}
                            >

                                <div className="format-info">
                                    <span />
                                    {formatGroup.format}
                                </div>

                                <div className="showtime-times">

                                    {[...formatGroup.showtimes]
                                        .sort(
                                            (a, b) =>
                                                new Date(
                                                    a.startTime
                                                ).getTime() -
                                                new Date(
                                                    b.startTime
                                                ).getTime()
                                        )
                                        .map((showtime) => (

                                            <button
                                                key={showtime.id}
                                                className="showtime-time"
                                            >
                                                {formatTime(
                                                    showtime.startTime
                                                )}
                                            </button>

                                        ))}

                                </div>

                            </div>
                        )
                    )}

                </div>

            </div>

        </div>
    );
}

export default MovieShowtimeCard;
