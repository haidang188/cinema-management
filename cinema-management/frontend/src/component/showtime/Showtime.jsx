import "./Showtime.css";
import {useEffect, useState} from "react";
import {getShowtimesByDate} from "../../service/showtimeService.js";

function Showtime() {

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [startDate, setStartDate] = useState(() => {

        const date = new Date();

        date.setHours(0, 0, 0, 0);

        return date;
    });


    const [selectedDate, setSelectedDate] = useState("");

    const [showtimes, setShowtimes] = useState([]);

    const formatDateValue = (date) => {

        const year = date.getFullYear();

        const month = String(date.getMonth() + 1).padStart(2, "0");

        const day = String(date.getDate()).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const getWeekDates = () => {

        const dates = [];

        for (let i = 0; i < 7; i++) {

            const date = new Date(startDate);

            date.setDate(startDate.getDate() + i);

            dates.push({
                value: formatDateValue(date),

                day: String(date.getDate()).padStart(2, "0"),

                month: String(date.getMonth() + 1).padStart(2, "0"),

                weekday: date.toLocaleDateString("vi-VN", {
                        weekday: "short"
                    }
                )
            });
        }

        return dates;
    };


    const dates = getWeekDates();

    useEffect(() => {

        if (!selectedDate) {

            setSelectedDate(formatDateValue(startDate));
        }

    }, [startDate]);

    useEffect(() => {

        if (!selectedDate) {
            return;
        }

        const loadShowtimes = async () => {

            const data = await getShowtimesByDate(selectedDate);

            setShowtimes(data);

        };

        loadShowtimes();

    }, [selectedDate]);


    const handlePreviousWeek = () => {

        const previousWeek = new Date(startDate);

        previousWeek.setDate(startDate.getDate() - 7);

        if (previousWeek < today) {

            setStartDate(today);

            setSelectedDate(formatDateValue(today));

            return;
        }

        setStartDate(previousWeek);

        setSelectedDate(formatDateValue(previousWeek)
        );
    };


    const handleNextWeek = () => {

        const nextWeek = new Date(startDate);

        nextWeek.setDate(startDate.getDate() + 7);

        setStartDate(nextWeek);

        setSelectedDate(formatDateValue(nextWeek));
    };


    const handleDateClick = (date) => {

        setSelectedDate(date.value);

    };

    const handleCalendarChange = (event) => {

        const value = event.target.value;

        if (!value) {
            return;
        }

        const selected = new Date(value + "T00:00:00");

        const dayOfWeek = selected.getDay();

        const monday = new Date(selected);

        const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

        monday.setDate(selected.getDate() + diff);


        if (monday < today) {
            setStartDate(today);

        } else {

            setStartDate(monday);

        }

        setSelectedDate(value);

    };

    const groupedMovies = showtimes.reduce(
        (groups, showtime) => {

            const movieId = showtime.movieId;

            if (!groups[movieId]) {

                groups[movieId] = {

                    movieId: showtime.movieId,

                    movieTitle: showtime.movieTitle,

                    posterUrl: showtime.posterUrl,

                    durationMinutes: showtime.durationMinutes,

                    ageRating: showtime.ageRating,

                    showtimes: []
                };
            }

            groups[movieId].showtimes.push(
                showtime
            );

            return groups;

        },
        {}
    );


    const movies =
        Object.values(groupedMovies);

    const formatTime = (dateTime) => {

        return new Date(dateTime).toLocaleTimeString("vi-VN", {
                hour: "2-digit",
                minute: "2-digit"
            }
        );

    };

    const groupByFormat = (movieShowtimes) => {
        return Object.values(
            movieShowtimes.reduce((formats, showtime) => {
                const format = showtime.format || "Khác";

                if (!formats[format]) {
                    formats[format] = {
                        format: format,
                        showtimes: []
                    };
                }

                formats[format].showtimes.push(showtime);

                return formats;
            }, {})
        );
    };


    return (

        <div className="showtime-page">

            <div className="showtime-header">

                <h1>
                    LỊCH CHIẾU PHIM
                </h1>

                <p>
                    Xem lịch chiếu phim theo ngày
                </p>

            </div>


            <div className="date-selector">

                <button
                    className="week-arrow"
                    onClick={handlePreviousWeek}
                    disabled={startDate <= today}
                >
                    ‹
                </button>


                <div className="date-list">

                    {dates.map((date) => (

                        <button
                            key={date.value}
                            className={`date-item ${
                                selectedDate === date.value
                                    ? "active"
                                    : ""
                            }`}
                            onClick={() => handleDateClick(date)
                            }
                        >

                            <span className="date-number">
                                {date.day}/{date.month}
                            </span>

                            <span className="date-weekday">
                                {date.weekday}
                            </span>

                        </button>

                    ))}

                </div>


                <button
                    className="week-arrow"
                    onClick={handleNextWeek}
                >
                    ›
                </button>


                <div className="calendar-wrapper">

                    <label
                        htmlFor="calendar"
                        className="calendar-button"
                    >
                        📅
                    </label>

                    <input
                        id="calendar"
                        type="date"
                        min={formatDateValue(today)}
                        value={selectedDate}
                        onChange={handleCalendarChange}
                    />

                </div>

            </div>


            <div className="selected-date">

                Lịch chiếu ngày{" "}

                <strong>
                    {selectedDate
                        ? new Date(selectedDate + "T00:00:00").toLocaleDateString("vi-VN") : ""}
                </strong>

            </div>


            <div className="showtime-list">

                {movies.length === 0 ? (

                    <div className="no-showtime">

                        Không có lịch chiếu
                        trong ngày này.

                    </div>

                ) : (

                    movies.map((movie) => (

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

                                <h2>
                                    {movie.movieTitle}
                                </h2>


                                <div className="movie-meta">

                                    <span>
                                        {movie.durationMinutes}
                                        phút
                                    </span>

                                    {movie.ageRating && (
                                        <span>
                                            {movie.ageRating}
                                        </span>
                                    )}

                                </div>


                                <div className="showtime-schedule">

                                    {groupByFormat(movie.showtimes).map((formatGroup) => (

                                        <div
                                            className="showtime-room"
                                            key={formatGroup.format}
                                        >

                                            <div className="format-info">
                                                {formatGroup.format}
                                            </div>


                                            <div className="showtime-times">
                                                {[...formatGroup.showtimes]
                                                    .sort(
                                                        (a, b) =>
                                                            new Date(a.startTime).getTime() -
                                                            new Date(b.startTime).getTime()
                                                    )
                                                    .map((showtime) => (
                                                        <button
                                                            key={showtime.id}
                                                            className="showtime-time"
                                                        >
                                                            {formatTime(showtime.startTime)}
                                                        </button>
                                                    ))}
                                            </div>

                                        </div>

                                    ))}

                                </div>

                            </div>

                        </div>

                    ))

                )}

            </div>

        </div>
    );
}

export default Showtime;