import "./Showtime.css";
import { useEffect, useState } from "react";
import type {ShowtimeData} from "../../types/showtime/showtime";

import {
    getShowtimesByDate
} from "../../service/showtime/showtimeService";

import DateSelector from "./DateSelector";
import MovieShowtimeCard from "./MovieShowtimeCard";

interface DateItem {
    value: string;
    day: string;
    month: string;
    weekday: string;
}

interface MovieGroup {
    movieId: number;
    movieTitle: string;
    posterUrl: string;
    durationMinutes: number;
    ageRating?: string | null;
    showtimes: ShowtimeData[];
}

function Showtime() {

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const [startDate, setStartDate] = useState<Date>(() => {

        const date = new Date();

        date.setHours(0, 0, 0, 0);

        return date;
    });

    const [selectedDate, setSelectedDate] =
        useState<string>("");

    const [showtimes, setShowtimes] =
        useState<ShowtimeData[]>([]);

    const formatDateValue = (date: Date): string => {

        const year = date.getFullYear();

        const month = String(
            date.getMonth() + 1
        ).padStart(2, "0");

        const day = String(
            date.getDate()
        ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };

    const getWeekDates = (): DateItem[] => {

        const dates: DateItem[] = [];

        for (let i = 0; i < 7; i++) {

            const date = new Date(startDate);

            date.setDate(
                startDate.getDate() + i
            );

            dates.push({
                value: formatDateValue(date),

                day: String(
                    date.getDate()
                ).padStart(2, "0"),

                month: String(
                    date.getMonth() + 1
                ).padStart(2, "0"),

                weekday: date.toLocaleDateString(
                    "vi-VN",
                    {
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

            setSelectedDate(
                formatDateValue(startDate)
            );
        }

    }, [startDate, selectedDate]);

    useEffect(() => {

        if (!selectedDate) {
            return;
        }

        const loadShowtimes = async () => {

            const data =
                await getShowtimesByDate(
                    selectedDate
                );

            setShowtimes(data);
        };

        loadShowtimes();

    }, [selectedDate]);

    const handlePreviousWeek = () => {

        const previousWeek =
            new Date(startDate);

        previousWeek.setDate(
            startDate.getDate() - 7
        );

        if (previousWeek < today) {

            setStartDate(today);

            setSelectedDate(
                formatDateValue(today)
            );

            return;
        }

        setStartDate(previousWeek);

        setSelectedDate(
            formatDateValue(previousWeek)
        );
    };

    const handleNextWeek = () => {

        const nextWeek =
            new Date(startDate);

        nextWeek.setDate(
            startDate.getDate() + 7
        );

        setStartDate(nextWeek);

        setSelectedDate(
            formatDateValue(nextWeek)
        );
    };

    const handleDateClick = (
        date: DateItem
    ) => {

        setSelectedDate(date.value);
    };

    const handleCalendarChange = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {

        const value = event.target.value;

        if (!value) {
            return;
        }

        const selected =
            new Date(
                value + "T00:00:00"
            );

        const dayOfWeek =
            selected.getDay();

        const monday =
            new Date(selected);

        const diff =
            dayOfWeek === 0
                ? -6
                : 1 - dayOfWeek;

        monday.setDate(
            selected.getDate() + diff
        );

        if (monday < today) {

            setStartDate(today);

        } else {

            setStartDate(monday);
        }

        setSelectedDate(value);
    };

    const groupedMovies =
        showtimes.reduce<
            Record<number, MovieGroup>
        >(
            (groups, showtime) => {

                const movieId =
                    showtime.movieId;

                if (!groups[movieId]) {

                    groups[movieId] = {
                        movieId:
                        showtime.movieId,

                        movieTitle:
                        showtime.movieTitle,

                        posterUrl:
                        showtime.posterUrl,

                        durationMinutes:
                        showtime.durationMinutes,

                        ageRating:
                        showtime.ageRating,

                        showtimes: []
                    };
                }

                groups[movieId]
                    .showtimes
                    .push(showtime);

                return groups;

            },
            {}
        );

    const movies =
        Object.values(groupedMovies);

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

            <DateSelector
                dates={dates}
                selectedDate={selectedDate}
                today={formatDateValue(today)}
                startDate={startDate}
                onPreviousWeek={
                    handlePreviousWeek
                }
                onNextWeek={
                    handleNextWeek
                }
                onDateClick={
                    handleDateClick
                }
                onCalendarChange={
                    handleCalendarChange
                }
            />

            <div className="selected-date">

                Lịch chiếu ngày{" "}

                <strong>
                    {selectedDate
                        ? new Date(
                            selectedDate +
                            "T00:00:00"
                        ).toLocaleDateString(
                            "vi-VN"
                        )
                        : ""}
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

                        <MovieShowtimeCard
                            key={movie.movieId}
                            movie={movie}
                        />

                    ))
                )}

            </div>

        </div>
    );
}

export default Showtime;