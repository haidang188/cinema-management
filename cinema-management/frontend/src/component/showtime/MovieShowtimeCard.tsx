import type {ShowtimeData} from "../../types/showtime/showtime";
import { useNavigate } from "react-router-dom";
import type { MovieGroup } from "./showtimeTypes";

interface FormatGroup {
    label: string;
    showtimes: ShowtimeData[];
}

interface MovieShowtimeCardProps {
    movie: MovieGroup;
}

const CLOSED_STATUSES = ["CANCELLED", "CLOSED", "INACTIVE"];

const formatTime = (dateTime: string): string =>
    new Date(dateTime).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit"
    });

const getEndTime = (showtime: ShowtimeData, durationMinutes: number): string =>
    showtime.endTime
    || new Date(new Date(showtime.startTime).getTime() + durationMinutes * 60000).toISOString();

function MovieShowtimeCard({ movie }: MovieShowtimeCardProps) {
    const navigate = useNavigate();
    const now = Date.now();

    const formatGroups: FormatGroup[] = Object.values(
        movie.showtimes.reduce<Record<string, FormatGroup>>((groups, showtime) => {
            const label = showtime.format || showtime.roomType || "Tiêu chuẩn";

            if (!groups[label]) {
                groups[label] = { label, showtimes: [] };
            }

            groups[label].showtimes.push(showtime);

            return groups;
        }, {})
    ).map((group) => ({
        ...group,
        showtimes: [...group.showtimes].sort(
            (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        )
    }));

    return (
        <article className="st-movie">

            <div className="st-movie-poster">
                <img src={movie.posterUrl} alt={movie.movieTitle} loading="lazy" />
                {movie.ageRating && <span className="st-movie-age">{movie.ageRating}</span>}
            </div>

            <div className="st-movie-body">

                <div className="st-movie-head">
                    <h3>{movie.movieTitle}</h3>
                    <div className="st-movie-meta">
                        <span>{movie.durationMinutes} phút</span>
                        {movie.language && <span>{movie.language}</span>}
                        <span>{movie.showtimes.length} suất</span>
                    </div>
                </div>

                {formatGroups.map((group) => (
                    <div className="st-group" key={group.label}>
                        <strong className="st-group-label">{group.label}</strong>

                        <div className="st-slots">
                            {group.showtimes.map((showtime) => {
                                const started = new Date(showtime.startTime).getTime() <= now;
                                const closed = CLOSED_STATUSES.includes((showtime.status || "").toUpperCase());
                                const soldOut = showtime.totalSeats > 0 && showtime.availableSeats <= 0;
                                const disabled = started || closed || soldOut;
                                const isLow = !disabled && showtime.totalSeats > 0
                                    && showtime.availableSeats / showtime.totalSeats <= 0.2;

                                const seatText = closed
                                    ? "Đã hủy"
                                    : started
                                        ? "Đã chiếu"
                                        : soldOut
                                            ? "Hết vé"
                                            : `${showtime.availableSeats}/${showtime.totalSeats}`;

                                return (
                                    <button
                                        type="button"
                                        key={showtime.id}
                                        className={`st-slot${isLow ? " is-low" : ""}`}
                                        disabled={disabled}
                                        onClick={() => navigate(`/booking/showtimes/${showtime.id}/seats`)}
                                    >
                                        <span className="st-slot-time">
                                            <b>{formatTime(showtime.startTime)}</b>
                                            <span className="st-slot-sep">~</span>
                                            <span className="st-slot-end">
                                                {formatTime(getEndTime(showtime, movie.durationMinutes))}
                                            </span>
                                        </span>
                                        <span className="st-slot-seats">{seatText}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

            </div>

        </article>
    );
}

export default MovieShowtimeCard;
