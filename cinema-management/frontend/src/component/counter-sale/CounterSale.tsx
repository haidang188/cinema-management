import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import { useNavigate } from "react-router-dom";

import { getShowtimesByDate } from "../../service/showtime/showtimeService";
import { getShowtimeSeats } from "../../service/showtimeSeat/showtimeSeatService";

import type { ShowtimeData } from "../../types/showtime/showtime";
import type { ShowtimeSeat } from "../../types/showtimeSeat/showtimeSeat";

import "./CounterSale.css";

const MOVIES_PER_PAGE = 5;
const DATE_WINDOW_SIZE = 7;
const SELLING_CUTOFF_MINUTES = 5;
const CLOCK_TICK_MS = 30_000;
// Làm mới số ghế của phim đang chọn (quầy khác / online có thể vừa bán).
const SEAT_REFRESH_MS = 60_000;
// Còn <= 20% ghế thì cảnh báo sắp hết.
const LOW_SEAT_RATIO = 0.2;

type ShowtimeWithLanguage = ShowtimeData & {
    language?: string | null;
};

type SeatSummary = {
    available: number;
    total: number;
    failed: boolean;
};

/* Một slot = đúng một suất chiếu (key = showtime.id). */
type ShowtimeSlot = {
    key: string;
    showtime: ShowtimeData;
    seat?: SeatSummary;
    loading: boolean;
    soldOut: boolean;
    lowSeats: boolean;
};

type ShowtimeGroup = {
    key: string;
    roomId: number | null;
    roomName: string;
    roomType: string;
    slots: ShowtimeSlot[];
};

type MovieRoomInfo = {
    roomName: string;
    slotCount: number;
};

/* ============================================================
 * DATE HELPERS
 * ============================================================ */

function formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function parseDate(value: string): Date {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
}

function addDays(value: string, days: number): string {
    const date = parseDate(value);
    date.setDate(date.getDate() + days);
    return formatDate(date);
}

function maxDate(a: string, b: string): string {
    return a > b ? a : b;
}

function formatDisplayDate(value: string): string {
    return parseDate(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatShortDate(value: string): string {
    return parseDate(value).toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
    });
}

function getDayName(value: string): string {
    const days = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
    return days[parseDate(value).getDay()];
}

function formatTime(value?: string | null): string {
    if (!value) {
        return "--:--";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "--:--";
    }

    return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function getStartMs(showtime: ShowtimeData): number {
    return new Date(showtime.startTime).getTime();
}

function normalizeText(value: unknown): string {
    return String(value ?? "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/đ/g, "d")
        .trim();
}


function isShowtimeSellable(showtime: ShowtimeData, now: number): boolean {
    if (!showtime.startTime) {
        return false;
    }

    if (showtime.status && showtime.status.toUpperCase() !== "OPEN") {
        return false;
    }

    const start = getStartMs(showtime);

    if (Number.isNaN(start)) {
        return false;
    }

    return now < start - SELLING_CUTOFF_MINUTES * 60 * 1000;
}

function hasRoomId(showtime: ShowtimeData): boolean {
    return showtime.roomId !== undefined && showtime.roomId !== null;
}


function getRoomName(showtime: ShowtimeData): string {
    const name = showtime.roomName?.trim();

    if (name) {
        return name;
    }

    if (hasRoomId(showtime)) {
        return `Phòng ${String(showtime.roomId).padStart(2, "0")}`;
    }

    return "Chưa xếp phòng";
}

function getRoomType(showtime: ShowtimeData): string {
    return showtime.roomType?.trim() || showtime.format?.trim() || "2D";
}

function getMovieAge(movie: ShowtimeData): string {
    return movie.ageRating || "P";
}

function getMovieDuration(movie: ShowtimeData): string {
    return movie.durationMinutes ? `${movie.durationMinutes} phút` : "";
}

function getMovieLanguage(movie: ShowtimeData): string {
    const original = String((movie as ShowtimeWithLanguage).language ?? "").trim();
    const raw = normalizeText(original);

    if (!raw) return "";
    if (/\bviet|\bvi\b/.test(raw)) return "Tiếng Việt";
    if (/\banh\b|english|\ben\b/.test(raw)) return "Tiếng Anh";
    if (/\bnhat\b|japanese|\bja\b/.test(raw)) return "Tiếng Nhật";
    if (/\bhan\b|korean|\bko\b/.test(raw)) return "Tiếng Hàn";
    if (/\btrung\b|chinese|\bzh\b/.test(raw)) return "Tiếng Trung";

    return original;
}


function useNow(intervalMs: number): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(id);
    }, [intervalMs]);

    return now;
}



function CounterSale() {
    const navigate = useNavigate();

    const now = useNow(CLOCK_TICK_MS);
    const todayKey = formatDate(new Date(now));

    const [selectedDate, setSelectedDate] = useState(todayKey);
    const [dateWindowStart, setDateWindowStart] = useState(todayKey);

    const [showtimes, setShowtimes] = useState<ShowtimeData[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [reloadToken, setReloadToken] = useState(0);

    const [searchMovie, setSearchMovie] = useState("");
    const [moviePage, setMoviePage] = useState(0);

    const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
    const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

    // Cache số ghế theo showtimeId.
    const [seatSummary, setSeatSummary] = useState<Record<number, SeatSummary>>({});
    const [seatRefreshToken, setSeatRefreshToken] = useState(0);
    const requestedSeatIdsRef = useRef<Set<number>>(new Set());
    const loadGenerationRef = useRef(0);

    const showtimeSectionRef = useRef<HTMLElement>(null);

    /* ================= QUA NGÀY MỚI ================= */

    useEffect(() => {
        setSelectedDate((prev) => maxDate(prev, todayKey));
        setDateWindowStart((prev) => maxDate(prev, todayKey));
    }, [todayKey]);

    const visibleDates = useMemo(
        () =>
            Array.from({ length: DATE_WINDOW_SIZE }, (_, index) =>
                addDays(dateWindowStart, index)
            ),
        [dateWindowStart]
    );

    /* ================= LOAD SHOWTIME THEO NGÀY ================= */

    useEffect(() => {
        let cancelled = false;

        loadGenerationRef.current += 1;
        requestedSeatIdsRef.current = new Set();

        setSeatSummary({});
        setShowtimes([]);
        setLoading(true);
        setError("");

        getShowtimesByDate(selectedDate)
            .then((data) => {
                if (!cancelled) {
                    setShowtimes(Array.isArray(data) ? data : []);
                }
            })
            .catch((err: unknown) => {
                if (cancelled) {
                    return;
                }

                console.error("Không thể tải suất chiếu:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Không thể tải danh sách suất chiếu."
                );
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [selectedDate, reloadToken]);

    /* ================= SUẤT CÒN BÁN ĐƯỢC ================= */

    const sellableShowtimes = useMemo(
        () =>
            showtimes
                .filter((showtime) => isShowtimeSellable(showtime, now))
                .sort((a, b) => getStartMs(a) - getStartMs(b)),
        [showtimes, now]
    );

    /* ================= DANH SÁCH PHIM ================= */

    const movies = useMemo(() => {
        const movieMap = new Map<number, ShowtimeData>();

        sellableShowtimes.forEach((showtime) => {
            if (!movieMap.has(showtime.movieId)) {
                movieMap.set(showtime.movieId, showtime);
            }
        });

        return Array.from(movieMap.values());
    }, [sellableShowtimes]);

    const movieRoomInfo = useMemo(() => {
        const rooms = new Map<number, Set<string>>();
        const counts = new Map<number, number>();

        sellableShowtimes.forEach((showtime) => {
            if (!rooms.has(showtime.movieId)) {
                rooms.set(showtime.movieId, new Set());
            }

            rooms.get(showtime.movieId)!.add(getRoomName(showtime));
            counts.set(showtime.movieId, (counts.get(showtime.movieId) ?? 0) + 1);
        });

        const result: Record<number, MovieRoomInfo> = {};

        rooms.forEach((names, movieId) => {
            const list = Array.from(names);

            result[movieId] = {
                roomName: list.length === 1 ? list[0] : `${list.length} phòng`,
                slotCount: counts.get(movieId) ?? 0,
            };
        });

        return result;
    }, [sellableShowtimes]);

    const filteredMovies = useMemo(() => {
        const keyword = normalizeText(searchMovie);

        if (!keyword) {
            return movies;
        }

        return movies.filter((movie) =>
            normalizeText(movie.movieTitle).includes(keyword)
        );
    }, [movies, searchMovie]);

    const totalMoviePages = Math.max(
        1,
        Math.ceil(filteredMovies.length / MOVIES_PER_PAGE)
    );
    const safeMoviePage = Math.min(moviePage, totalMoviePages - 1);

    const visibleMovies = useMemo(() => {
        const start = safeMoviePage * MOVIES_PER_PAGE;
        return filteredMovies.slice(start, start + MOVIES_PER_PAGE);
    }, [filteredMovies, safeMoviePage]);

    const selectedMovie = useMemo(
        () => movies.find((movie) => movie.movieId === selectedMovieId) ?? null,
        [movies, selectedMovieId]
    );

    /* ================= SUẤT CỦA PHIM ĐANG CHỌN ================= */

    const movieShowtimes = useMemo(
        () =>
            selectedMovieId === null
                ? []
                : sellableShowtimes.filter(
                    (showtime) => showtime.movieId === selectedMovieId
                ),
        [sellableShowtimes, selectedMovieId]
    );

    /* ================= LOAD GHẾ CHO TỪNG SUẤT ================= */

    useEffect(() => {
        const pending = movieShowtimes.filter(
            (showtime) => !requestedSeatIdsRef.current.has(showtime.id)
        );

        if (pending.length === 0) {
            return;
        }

        const generation = loadGenerationRef.current;

        pending.forEach((showtime) => {
            requestedSeatIdsRef.current.add(showtime.id);

            getShowtimeSeats(showtime.id)
                .then((seats: ShowtimeSeat[]) => ({
                    total: seats.length,
                    available: seats.filter((seat) => seat.status === "AVAILABLE")
                        .length,
                    failed: false,
                }))
                .catch((err: unknown) => {
                    console.error(`Không thể tải ghế của suất ${showtime.id}:`, err);
                    requestedSeatIdsRef.current.delete(showtime.id);
                    return { total: 0, available: 0, failed: true };
                })
                .then((summary) => {
                    if (generation !== loadGenerationRef.current) {
                        return;
                    }

                    setSeatSummary((prev) => ({ ...prev, [showtime.id]: summary }));
                });
        });
    }, [movieShowtimes, seatRefreshToken]);


    useEffect(() => {
        if (selectedMovieId === null) {
            return;
        }

        const id = window.setInterval(() => {
            requestedSeatIdsRef.current = new Set();
            setSeatRefreshToken((value) => value + 1);
        }, SEAT_REFRESH_MS);

        return () => window.clearInterval(id);
    }, [selectedMovieId]);

    /* ================= NHÓM SUẤT THEO PHÒNG ================= */

    const showtimeGroups = useMemo<ShowtimeGroup[]>(() => {
        const groups = new Map<string, ShowtimeGroup>();

        movieShowtimes.forEach((showtime) => {

            const roomId = hasRoomId(showtime) ? Number(showtime.roomId) : null;
            const groupKey = roomId === null ? "room-unknown" : `room-${roomId}`;

            if (!groups.has(groupKey)) {
                groups.set(groupKey, {
                    key: groupKey,
                    roomId,
                    roomName: getRoomName(showtime),
                    roomType: getRoomType(showtime),
                    slots: [],
                });
            }

            const seat = seatSummary[showtime.id];
            const known = !!seat && !seat.failed && seat.total > 0;

            groups.get(groupKey)!.slots.push({
                key: String(showtime.id),
                showtime,
                seat,
                loading: !seat,
                soldOut: !!seat && !seat.failed && seat.available === 0,
                lowSeats:
                    known &&
                    seat.available > 0 &&
                    seat.available / seat.total <= LOW_SEAT_RATIO,
            });
        });

        const result = Array.from(groups.values())
            .map((group) => ({
                ...group,
                slots: [...group.slots].sort(
                    (a, b) => getStartMs(a.showtime) - getStartMs(b.showtime)
                ),
            }))
            .sort((a, b) => {
                if (a.roomId === null) return 1;
                if (b.roomId === null) return -1;
                return a.roomId - b.roomId;
            });

        if (result.length > 1) {
            console.warn(
                "Phim đang được xếp ở nhiều phòng trong cùng ngày, vi phạm quy tắc 1 phim / 1 phòng:",
                result.map((group) => group.roomName)
            );
        }

        return result;
    }, [movieShowtimes, seatSummary]);

    const totalSlotCount = showtimeGroups.reduce(
        (sum, group) => sum + group.slots.length,
        0
    );


    const singleRoom = showtimeGroups.length === 1 ? showtimeGroups[0] : null;

    /* ================= SUẤT ĐANG CHỌN ================= */

    const selectedSlot = useMemo(
        () =>
            showtimeGroups
                .flatMap((group) => group.slots)
                .find((slot) => slot.key === selectedSlotKey) ?? null,
        [showtimeGroups, selectedSlotKey]
    );

    const selectedShowtime = selectedSlot?.showtime ?? null;

    const canContinue = Boolean(
        selectedSlot && !selectedSlot.soldOut && !selectedSlot.loading
    );

    useEffect(() => {
        if (selectedSlotKey && !loading && !selectedSlot) {
            setSelectedSlotKey(null);
        }
    }, [selectedSlotKey, selectedSlot, loading]);

    /* ================= HANDLERS ================= */

    function changeDate(value: string) {
        if (value < todayKey) {
            return;
        }

        setSelectedDate(value);
        setSelectedMovieId(null);
        setSelectedSlotKey(null);
        setSearchMovie("");
        setMoviePage(0);
    }

    function handleManualDateChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;

        if (!value || value < todayKey) {
            return;
        }

        changeDate(value);

        const windowEnd = addDays(dateWindowStart, DATE_WINDOW_SIZE - 1);

        if (value < dateWindowStart || value > windowEnd) {
            setDateWindowStart(maxDate(addDays(value, -3), todayKey));
        }
    }

    function shiftSelectedDate(delta: number) {
        const next = addDays(selectedDate, delta);

        if (next < todayKey) {
            return;
        }

        changeDate(next);

        const windowEnd = addDays(dateWindowStart, DATE_WINDOW_SIZE - 1);

        if (next < dateWindowStart) {
            setDateWindowStart(next);
        } else if (next > windowEnd) {
            setDateWindowStart(
                maxDate(addDays(next, -(DATE_WINDOW_SIZE - 1)), todayKey)
            );
        }
    }

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        setSearchMovie(event.target.value);
        setMoviePage(0);
    }

    function scrollToShowtimes() {
        const reduceMotion = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)"
        ).matches;

        window.requestAnimationFrame(() => {
            showtimeSectionRef.current?.scrollIntoView({
                behavior: reduceMotion ? "auto" : "smooth",
                block: "nearest",
            });
        });
    }

    function handleSelectMovie(movieId: number) {
        if (movieId !== selectedMovieId) {
            setSelectedMovieId(movieId);
            setSelectedSlotKey(null);
        }

        scrollToShowtimes();
    }

    function handlePreviousMovies() {
        setMoviePage(Math.max(0, safeMoviePage - 1));
    }

    function handleNextMovies() {
        setMoviePage(Math.min(totalMoviePages - 1, safeMoviePage + 1));
    }

    function handleSelectSlot(slot: ShowtimeSlot) {
        if (
            slot.soldOut ||
            slot.loading ||
            !isShowtimeSellable(slot.showtime, Date.now())
        ) {
            return;
        }

        setSelectedSlotKey(slot.key);
    }

    function handleContinue() {
        if (!selectedSlot || selectedSlot.soldOut || selectedSlot.loading) {
            return;
        }

        if (!isShowtimeSellable(selectedSlot.showtime, Date.now())) {
            setSelectedSlotKey(null);
            return;
        }

        navigate("/counter-sale/seats", {
            state: { showtime: selectedSlot.showtime },
        });
    }

    function handlePosterError(event: SyntheticEvent<HTMLImageElement>) {
        event.currentTarget.classList.add("is-broken");
    }

    function getSeatText(slot: ShowtimeSlot): string {
        if (slot.soldOut) return "Hết vé";
        if (slot.loading || !slot.seat) return "Đang tải…";
        if (slot.seat.failed || slot.seat.total === 0) return "--/--";
        return `${slot.seat.available}/${slot.seat.total}`;
    }

    function renderSlots(slots: ShowtimeSlot[]) {
        return (
            <div className="cs-slots">
                {slots.map((slot) => {
                    const isSelected = slot.key === selectedSlotKey;

                    const className = [
                        "cs-slot",
                        isSelected && "is-selected",
                        slot.soldOut && "is-sold-out",
                        slot.lowSeats && "is-low",
                        slot.loading && "is-loading",
                    ]
                        .filter(Boolean)
                        .join(" ");

                    return (
                        <button
                            key={slot.key}
                            type="button"
                            className={className}
                            onClick={() => handleSelectSlot(slot)}
                            disabled={slot.soldOut || slot.loading}
                            aria-pressed={isSelected}
                            aria-label={`${formatTime(slot.showtime.startTime)} đến ${formatTime(
                                slot.showtime.endTime
                            )}, ${getSeatText(slot)}`}
                        >
                            <span className="cs-slot-time">
                                <b>{formatTime(slot.showtime.startTime)}</b>
                                <span className="cs-slot-sep">~</span>
                                <span className="cs-slot-end">
                                    {formatTime(slot.showtime.endTime)}
                                </span>
                            </span>

                            <span className="cs-slot-seats">{getSeatText(slot)}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    /* ================= RENDER ================= */

    return (
        <div className="counter-sale">
            {/* ================= PAGE HEADER ================= */}

            <header className="counter-sale-header">
                <div>
                    <span className="page-eyebrow">Counter sales</span>
                    <h1>Bán vé tại quầy</h1>
                    <p>Chọn ngày, phim và suất chiếu</p>
                </div>

                <div className="sale-status">
                    <span />
                    Đang mở bán
                </div>
            </header>

            {/* ================= 01. NGÀY CHIẾU ================= */}

            <section className="counter-sale-section date-section">
                <div className="section-heading">
                    <div className="section-title">
                        <span className="section-step">01</span>
                        <div>
                            <h2>Ngày chiếu</h2>
                            <p>Chọn ngày khách muốn xem phim</p>
                        </div>
                    </div>

                    <div className="date-display">
                        <span>Chọn ngày</span>

                        <label className="date-display-box">
                            <span aria-hidden="true">📅</span>
                            <strong>{formatDisplayDate(selectedDate)}</strong>
                            <span className="date-arrow">▾</span>

                            <input
                                type="date"
                                value={selectedDate}
                                min={todayKey}
                                onChange={handleManualDateChange}
                                aria-label="Chọn ngày chiếu"
                            />
                        </label>
                    </div>
                </div>

                <div className="date-selector-wrap">
                    <button
                        type="button"
                        className="date-nav-button"
                        onClick={() => shiftSelectedDate(-1)}
                        disabled={selectedDate <= todayKey}
                        aria-label="Ngày trước"
                    >
                        ‹
                    </button>

                    <div className="date-selector">
                        {visibleDates.map((dateValue) => {
                            const isSelected = dateValue === selectedDate;
                            const isToday = dateValue === todayKey;

                            return (
                                <button
                                    key={dateValue}
                                    type="button"
                                    className={`date-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => changeDate(dateValue)}
                                    disabled={dateValue < todayKey}
                                    aria-pressed={isSelected}
                                >
                                    <strong className="date-value">
                                        {formatShortDate(dateValue)}
                                    </strong>
                                    <span className="date-day">
                                        {isToday ? "Hôm nay" : getDayName(dateValue)}
                                    </span>
                                    {isSelected && <span className="date-check">✓</span>}
                                </button>
                            );
                        })}
                    </div>

                    <button
                        type="button"
                        className="date-nav-button"
                        onClick={() => shiftSelectedDate(1)}
                        aria-label="Ngày tiếp theo"
                    >
                        ›
                    </button>
                </div>
            </section>

            {/* ================= 02. CHỌN PHIM ================= */}

            <section className="counter-sale-section movie-section">
                <div className="section-heading">
                    <div className="section-title">
                        <span className="section-step">02</span>
                        <div>
                            <h2>Chọn phim</h2>
                            <p>
                                {loading
                                    ? "Đang tải phim…"
                                    : movies.length > 0
                                        ? `${movies.length} phim còn suất bán`
                                        : "Không có phim còn suất bán"}
                            </p>
                        </div>
                    </div>

                    <div className="movie-controls">
                        <div className="movie-search">
                            <span aria-hidden="true">⌕</span>
                            <input
                                type="search"
                                value={searchMovie}
                                onChange={handleSearchChange}
                                placeholder="Tìm phim..."
                                aria-label="Tìm phim"
                            />
                        </div>

                        {totalMoviePages > 1 && (
                            <span className="movie-page-indicator">
                                {safeMoviePage + 1}/{totalMoviePages}
                            </span>
                        )}

                        <button
                            type="button"
                            className="movie-nav-button"
                            onClick={handlePreviousMovies}
                            disabled={safeMoviePage === 0}
                            aria-label="Phim trước"
                        >
                            ‹
                        </button>

                        <button
                            type="button"
                            className="movie-nav-button"
                            onClick={handleNextMovies}
                            disabled={safeMoviePage >= totalMoviePages - 1}
                            aria-label="Phim tiếp theo"
                        >
                            ›
                        </button>
                    </div>
                </div>

                {loading ? (
                    <div className="movie-grid" aria-busy="true">
                        {Array.from({ length: MOVIES_PER_PAGE }).map((_, index) => (
                            <div className="movie-skeleton" key={index} />
                        ))}
                    </div>
                ) : error ? (
                    <div className="empty-state error-state">
                        <strong>Không thể tải suất chiếu</strong>
                        <span>{error}</span>
                        <button
                            type="button"
                            className="retry-button"
                            onClick={() => setReloadToken((value) => value + 1)}
                        >
                            Tải lại
                        </button>
                    </div>
                ) : visibleMovies.length === 0 ? (
                    <div className="empty-state">
                        <strong>
                            {movies.length === 0
                                ? "Ngày này không còn suất để bán"
                                : "Không tìm thấy phim"}
                        </strong>
                        <span>
                            {movies.length === 0
                                ? "Chọn ngày khác để tiếp tục."
                                : "Thử từ khóa khác."}
                        </span>
                    </div>
                ) : (
                    <div className="movie-grid">
                        {visibleMovies.map((movie) => {
                            const isSelected = movie.movieId === selectedMovieId;
                            const language = getMovieLanguage(movie);
                            const duration = getMovieDuration(movie);
                            const room = movieRoomInfo[movie.movieId];

                            return (
                                <button
                                    key={movie.movieId}
                                    type="button"
                                    className={`movie-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => handleSelectMovie(movie.movieId)}
                                    aria-pressed={isSelected}
                                    title={movie.movieTitle}
                                >
                                    <div className="movie-poster-wrapper">
                                        {movie.posterUrl && (
                                            <img
                                                src={movie.posterUrl}
                                                alt={movie.movieTitle}
                                                className="movie-poster"
                                                loading="lazy"
                                                onError={handlePosterError}
                                            />
                                        )}

                                        <span className="movie-age">{getMovieAge(movie)}</span>

                                        {isSelected && <span className="movie-selected">✓</span>}

                                        {room && (
                                            <span className="movie-room">
                                                {room.roomName}
                                                <b>{room.slotCount} suất</b>
                                            </span>
                                        )}
                                    </div>

                                    <div className="movie-info">
                                        <h3>{movie.movieTitle}</h3>

                                        <div className="movie-meta">
                                            {duration && <span>{duration}</span>}
                                            {language && <span>{language}</span>}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </section>

            {/* ================= 03. SUẤT CHIẾU ================= */}

            <section
                ref={showtimeSectionRef}
                className="counter-sale-section showtime-section"
            >
                <div className="section-heading">
                    <div className="section-title">
                        <span className="section-step">03</span>
                        <div>
                            <h2>Suất chiếu</h2>
                            <p>
                                {selectedMovie
                                    ? selectedMovie.movieTitle
                                    : "Chọn phim để xem suất chiếu"}
                            </p>
                        </div>
                    </div>

                    {singleRoom && (
                        <div className="showtime-room-badge">
                            <strong>{singleRoom.roomName}</strong>
                            <span>{singleRoom.roomType}</span>
                            <span>{totalSlotCount} suất</span>
                        </div>
                    )}
                </div>

                {selectedMovieId === null ? (
                    <div className="showtime-empty">
                        <strong>Chưa chọn phim</strong>
                        <span>Hãy chọn một bộ phim ở bước trên.</span>
                    </div>
                ) : showtimeGroups.length === 0 ? (
                    <div className="showtime-empty">
                        <strong>Không có suất chiếu</strong>
                        <span>Phim này không còn suất có thể bán trong ngày đã chọn.</span>
                    </div>
                ) : singleRoom ? (
                    renderSlots(singleRoom.slots)
                ) : (
                    <div className="showtime-groups">
                        {showtimeGroups.map((group) => (
                            <div className="showtime-group" key={group.key}>
                                <div className="showtime-group-header">
                                    <strong>{group.roomName}</strong>
                                    <span>{group.roomType}</span>
                                </div>

                                {renderSlots(group.slots)}
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* ================= BOTTOM ACTION ================= */}

            <div className="counter-sale-action">
                {selectedShowtime && selectedSlot ? (
                    <div className="selected-summary">
                        <div className="selected-summary-poster">
                            {selectedShowtime.posterUrl && (
                                <img
                                    src={selectedShowtime.posterUrl}
                                    alt={selectedShowtime.movieTitle}
                                    onError={handlePosterError}
                                />
                            )}
                        </div>

                        <div className="selected-summary-info">
                            <span className="selected-summary-label">Suất đã chọn</span>
                            <strong>{selectedShowtime.movieTitle}</strong>
                            <span>
                                {[
                                    formatDisplayDate(selectedDate),
                                    getRoomName(selectedShowtime),
                                    `${formatTime(selectedShowtime.startTime)}${
                                        selectedShowtime.endTime
                                            ? ` - ${formatTime(selectedShowtime.endTime)}`
                                            : ""
                                    }`,
                                    getRoomType(selectedShowtime),
                                ].join(" · ")}
                            </span>
                        </div>
                    </div>
                ) : (
                    <div className="selected-summary empty">
                        <span>
                            {selectedMovie
                                ? "Chọn một giờ chiếu để tiếp tục"
                                : "Chưa chọn suất chiếu"}
                        </span>
                    </div>
                )}

                <button
                    type="button"
                    className="continue-button"
                    disabled={!canContinue}
                    onClick={handleContinue}
                >
                    Tiếp tục chọn ghế
                    <span aria-hidden="true">→</span>
                </button>
            </div>
        </div>
    );
}

export default CounterSale;
