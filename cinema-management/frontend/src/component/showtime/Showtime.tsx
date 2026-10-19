import "./Showtime.css";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type {ShowtimeData} from "../../types/showtime/showtime";

import { getShowtimesByDate } from "../../service/showtime/showtimeService";

import DateSelector from "./DateSelector";
import MovieShowtimeCard from "./MovieShowtimeCard";
import type { DateItem, MovieGroup } from "./showtimeTypes";

type DayPart = "all" | "morning" | "afternoon" | "evening";

const DAY_PARTS: { value: DayPart; label: string; hint: string }[] = [
    { value: "all", label: "Cả ngày", hint: "" },
    { value: "morning", label: "Sáng", hint: "trước 12h" },
    { value: "afternoon", label: "Chiều", hint: "12h – 18h" },
    { value: "evening", label: "Tối", hint: "sau 18h" }
];

const formatDateValue = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const matchesDayPart = (startTime: string, part: DayPart): boolean => {
    if (part === "all") {
        return true;
    }

    const hour = new Date(startTime).getHours();

    if (part === "morning") return hour < 12;
    if (part === "afternoon") return hour >= 12 && hour < 18;

    return hour >= 18;
};

const getFormatLabel = (showtime: ShowtimeData): string =>
    showtime.format || showtime.roomType || "Tiêu chuẩn";

function Showtime() {

    const today = useMemo(() => {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date;
    }, []);

    const todayValue = formatDateValue(today);

    const [startDate, setStartDate] = useState<Date>(today);
    const [selectedDate, setSelectedDate] = useState<string>(todayValue);
    const [showtimes, setShowtimes] = useState<ShowtimeData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchKeyword, setSearchKeyword] = useState("");
    const [formatFilter, setFormatFilter] = useState("all");
    const [dayPart, setDayPart] = useState<DayPart>("all");

    const dates: DateItem[] = useMemo(() => {
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const tomorrowValue = formatDateValue(tomorrow);

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startDate);
            date.setDate(startDate.getDate() + i);
            const value = formatDateValue(date);

            return {
                value,
                day: String(date.getDate()).padStart(2, "0"),
                month: String(date.getMonth() + 1).padStart(2, "0"),
                weekday: value === todayValue
                    ? "Hôm nay"
                    : value === tomorrowValue
                        ? "Ngày mai"
                        : date.toLocaleDateString("vi-VN", { weekday: "long" })
            };
        });
    }, [startDate, today, todayValue]);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);

        getShowtimesByDate(selectedDate).then((data) => {
            if (!cancelled) {
                setShowtimes(data);
                setLoading(false);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [selectedDate]);

    useEffect(() => {
        setFormatFilter("all");
    }, [selectedDate]);

    const formatOptions = useMemo(
        () => Array.from(new Set(showtimes.map(getFormatLabel))).sort(),
        [showtimes]
    );

    const filteredShowtimes = useMemo(() => {
        const query = searchKeyword.trim().toLocaleLowerCase("vi-VN");

        return showtimes.filter((showtime) => {
            if (formatFilter !== "all" && getFormatLabel(showtime) !== formatFilter) {
                return false;
            }

            if (!matchesDayPart(showtime.startTime, dayPart)) {
                return false;
            }

            return !query || showtime.movieTitle.toLocaleLowerCase("vi-VN").includes(query);
        });
    }, [showtimes, searchKeyword, formatFilter, dayPart]);

    const movies: MovieGroup[] = useMemo(() => {
        const groups = new Map<number, MovieGroup>();

        filteredShowtimes.forEach((showtime) => {
            if (!groups.has(showtime.movieId)) {
                groups.set(showtime.movieId, {
                    movieId: showtime.movieId,
                    movieTitle: showtime.movieTitle,
                    posterUrl: showtime.posterUrl,
                    durationMinutes: showtime.durationMinutes,
                    ageRating: showtime.ageRating,
                    language: showtime.language,
                    showtimes: []
                });
            }

            groups.get(showtime.movieId)!.showtimes.push(showtime);
        });

        return Array.from(groups.values()).sort((a, b) => a.movieTitle.localeCompare(b.movieTitle, "vi"));
    }, [filteredShowtimes]);

    const changeWeek = (offset: number) => {
        const next = new Date(startDate);
        next.setDate(startDate.getDate() + offset);

        const start = next < today ? today : next;

        setStartDate(start);
        setSelectedDate(formatDateValue(start));
    };

    const handleCalendarChange = (value: string) => {
        if (!value) {
            return;
        }

        const selected = new Date(value + "T00:00:00");
        const dayOfWeek = selected.getDay();
        const monday = new Date(selected);
        monday.setDate(selected.getDate() + (dayOfWeek === 0 ? -6 : 1 - dayOfWeek));

        setStartDate(monday < today ? today : monday);
        setSelectedDate(value);
    };

    const hasFilters = searchKeyword.trim() !== "" || formatFilter !== "all" || dayPart !== "all";

    const resetFilters = () => {
        setSearchKeyword("");
        setFormatFilter("all");
        setDayPart("all");
    };

    const selectedDateLabel = new Date(selectedDate + "T00:00:00").toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });

    return (
        <div className="showtime-page">

            <header className="st-header">
                <div>
                    <nav className="st-crumb" aria-label="Đường dẫn trang">
                        <Link to="/">Trang chủ</Link>
                        <span>›</span>
                        <strong>Lịch chiếu</strong>
                    </nav>
                    <h1>Lịch chiếu phim</h1>
                </div>

                <span className="st-status">
                    <i />
                    {loading
                        ? "Đang tải..."
                        : `${new Set(showtimes.map((s) => s.movieId)).size} phim · ${showtimes.length} suất`}
                </span>
            </header>

            <section className="st-panel">
                <div className="st-heading">
                    <div className="st-title">
                        <span className="st-step">01</span>
                        <div>
                            <h2>Chọn ngày chiếu</h2>
                            <p>{selectedDateLabel}</p>
                        </div>
                    </div>
                </div>

                <DateSelector
                    dates={dates}
                    selectedDate={selectedDate}
                    today={todayValue}
                    canGoBack={startDate > today}
                    onPreviousWeek={() => changeWeek(-7)}
                    onNextWeek={() => changeWeek(7)}
                    onDateClick={setSelectedDate}
                    onCalendarChange={handleCalendarChange}
                />
            </section>

            <section className="st-panel">
                <div className="st-heading">
                    <div className="st-title">
                        <span className="st-step">02</span>
                        <div>
                            <h2>Chọn phim &amp; suất chiếu</h2>
                            <p>
                                {loading
                                    ? "Đang tải lịch chiếu..."
                                    : `${movies.length} phim · ${filteredShowtimes.length} suất chiếu`}
                            </p>
                        </div>
                    </div>

                    <label className="st-search">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="m20 20-3.5-3.5" />
                        </svg>
                        <input
                            type="search"
                            placeholder="Tìm tên phim..."
                            value={searchKeyword}
                            onChange={(event) => setSearchKeyword(event.target.value)}
                            aria-label="Tìm kiếm phim"
                        />
                    </label>
                </div>

                <div className="st-filters">
                    <div className="st-segment" role="group" aria-label="Khung giờ">
                        {DAY_PARTS.map((part) => (
                            <button
                                key={part.value}
                                type="button"
                                className={dayPart === part.value ? "active" : ""}
                                onClick={() => setDayPart(part.value)}
                                title={part.hint || undefined}
                            >
                                {part.label}
                            </button>
                        ))}
                    </div>

                    {formatOptions.length > 1 && (
                        <div className="st-chips" role="group" aria-label="Định dạng">
                            <button
                                type="button"
                                className={formatFilter === "all" ? "active" : ""}
                                onClick={() => setFormatFilter("all")}
                            >
                                Tất cả
                            </button>
                            {formatOptions.map((format) => (
                                <button
                                    key={format}
                                    type="button"
                                    className={formatFilter === format ? "active" : ""}
                                    onClick={() => setFormatFilter(format)}
                                >
                                    {format}
                                </button>
                            ))}
                        </div>
                    )}

                    {hasFilters && (
                        <button type="button" className="st-reset" onClick={resetFilters}>
                            Xóa bộ lọc
                        </button>
                    )}
                </div>

                <div className="st-list">
                    {loading ? (
                        Array.from({ length: 3 }, (_, i) => <div className="st-skeleton" key={i} />)
                    ) : movies.length === 0 ? (
                        <div className="st-empty">
                            <strong>
                                {hasFilters ? "Không tìm thấy suất chiếu phù hợp" : "Chưa có lịch chiếu cho ngày này"}
                            </strong>
                            <span>
                                {hasFilters
                                    ? "Thử đổi từ khóa, khung giờ hoặc định dạng khác."
                                    : "Vui lòng chọn một ngày khác."}
                            </span>
                        </div>
                    ) : (
                        movies.map((movie) => (
                            <MovieShowtimeCard key={movie.movieId} movie={movie} />
                        ))
                    )}
                </div>
            </section>

        </div>
    );
}

export default Showtime;
