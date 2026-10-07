import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getShowtimesByDate } from "../../service/showtime/showtimeService";
import { getShowtimeSeats } from "../../service/showtimeSeat/showtimeSeatService";
import {
    getSeatSummaries,
    getShowtimesInRange,
} from "../../service/counterSale/counterSaleShowtimeService";

import type { ShowtimeData } from "../../types/showtime/showtime";
import type { ShowtimeSeat } from "../../types/showtimeSeat/showtimeSeat";

import {
    listParkedOrders,
    maskPhone,
    resumeCounterOrder,
    setCurrentOrder,
} from "../../service/counterOrder/counterOrderService";
import type { CounterOrderDto } from "../../service/counterOrder/counterOrderService";
import CounterSaleStepper from "./CounterSaleStepper";

import "./CounterSale.css";

const MOVIES_PER_PAGE = 5;
const DATE_WINDOW_SIZE = 7;
// Số ngày quét lịch chiếu để tìm phim / hiện "Tất cả ngày" (tính cả hôm nay).
const SEARCH_RANGE_DAYS = 14;
const SELLING_CUTOFF_MINUTES = 5;
const CLOCK_TICK_MS = 30_000;
const SEAT_REFRESH_MS = 60_000;
const LOW_SEAT_RATIO = 0.2;
// Giới hạn số request chạy song song để không dội backend.
const DATE_FETCH_CONCURRENCY = 4;
const SEAT_FETCH_CONCURRENCY = 6;
const PARKED_REFRESH_MS = 15_000;
const SEAT_SUMMARY_CHUNK = 150;

type ApiSupport = "unknown" | "ok" | "unsupported";

function getHttpStatus(err: unknown): number | undefined {
    return (err as { response?: { status?: number } } | null)?.response?.status;
}

function isNotSupported(err: unknown): boolean {
    const status = getHttpStatus(err);
    return status === 404 || status === 405;
}

type ShowtimeWithLanguage = ShowtimeData & {
    language?: string | null;
};

type SeatSummary = {
    available: number;
    total: number;
    failed: boolean;
};

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
    title: string;
    meta: string[];
    slots: ShowtimeSlot[];
};

type MovieEntry = {
    movie: ShowtimeData;
    slotCount: number;
    dayCount: number;
    roomLabel: string;
    firstStart: number;
};

type DateAvailability = {
    date: string;
    count: number;
};


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

function getDayLabel(value: string, todayKey: string): string {
    if (value === todayKey) return "Hôm nay";
    if (value === addDays(todayKey, 1)) return "Ngày mai";
    return getDayName(value);
}

function formatTime(value?: string | null): string {
    if (!value) return "--:--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "--:--";

    return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function getStartMs(showtime: ShowtimeData): number {
    return new Date(showtime.startTime).getTime();
}

function dateKeyOf(showtime: ShowtimeData): string {
    const date = new Date(showtime.startTime);
    return Number.isNaN(date.getTime()) ? "" : formatDate(date);
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
    if (!showtime.startTime) return false;

    if (showtime.status && showtime.status.toUpperCase() !== "OPEN") return false;

    const start = getStartMs(showtime);

    if (Number.isNaN(start)) return false;

    return now < start - SELLING_CUTOFF_MINUTES * 60 * 1000;
}

function hasRoomId(showtime: ShowtimeData): boolean {
    return showtime.roomId !== undefined && showtime.roomId !== null;
}

function getRoomName(showtime: ShowtimeData): string {
    const name = showtime.roomName?.trim();

    if (name) return name;

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

async function runWithConcurrency<T>(
    items: T[],
    limit: number,
    worker: (item: T) => Promise<void>
): Promise<void> {
    let index = 0;

    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (index < items.length) {
            const item = items[index];
            index += 1;
            await worker(item);
        }
    });

    await Promise.all(runners);
}

function useNow(intervalMs: number): number {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = window.setInterval(() => setNow(Date.now()), intervalMs);
        return () => window.clearInterval(id);
    }, [intervalMs]);

    return now;
}

function ParkedOrders() {
    const navigate = useNavigate();
    const [orders, setOrders] = useState<CounterOrderDto[]>([]);
    const [busyCode, setBusyCode] = useState<string | null>(null);
    const [error, setError] = useState("");
    const [now, setNow] = useState(() => Date.now());
    const [loadedAt, setLoadedAt] = useState(() => Date.now());

    useEffect(() => {
        let alive = true;

        async function load() {
            try {
                const list = await listParkedOrders();
                if (!alive) return;
                setOrders(list);
                setLoadedAt(Date.now());
            } catch {
                // Không chặn trang bán vé nếu API lỗi.
            }
        }

        load();
        const refresh = window.setInterval(load, PARKED_REFRESH_MS);
        const tick = window.setInterval(() => setNow(Date.now()), 1_000);

        return () => {
            alive = false;
            window.clearInterval(refresh);
            window.clearInterval(tick);
        };
    }, []);

    async function handleResume(order: CounterOrderDto) {
        setBusyCode(order.code);
        setError("");

        try {
            const resumed = await resumeCounterOrder(order.code);
            setCurrentOrder(resumed);

            navigate("/counter-sale/seats", {
                state: { showtime: resumed.showtime, orderCode: resumed.code },
            });
        } catch (err) {
            setError(err instanceof Error ? err.message : "Không mở lại được đơn.");
            setOrders((current) => current.filter((item) => item.code !== order.code));
        } finally {
            setBusyCode(null);
        }
    }

    const visible = orders.filter(
        (order) => (order.expiresInSeconds ?? 0) * 1000 - (now - loadedAt) > 0
    );

    if (visible.length === 0) return null;

    return (
        <section className="counter-sale-section parked-section">
            <div className="section-heading">
                <div className="section-title">
                    <span className="section-step is-gold">⏸</span>
                    <div>
                        <h2>Đơn đang tạm gác ({visible.length})</h2>
                        <p>Khách quay lại thanh toán: bấm "Mở lại" ở bất kỳ quầy nào</p>
                    </div>
                </div>
            </div>

            {error && <p className="parked-error">{error}</p>}

            <div className="parked-list">
                {visible.map((order) => {
                    const leftMs = (order.expiresInSeconds ?? 0) * 1000 - (now - loadedAt);
                    const minutes = Math.max(0, Math.floor(leftMs / 60_000));
                    const seconds = Math.max(0, Math.floor((leftMs % 60_000) / 1000));

                    return (
                        <div className="parked-item" key={order.code}>
                            <div className="parked-info">
                                <b>{order.customerName}</b>
                                <span>
                                    {maskPhone(order.customerPhone)} · {order.showtime?.movieTitle ?? `Suất ${order.showtimeId}`}
                                    {order.showtime?.startTime ? ` ${formatTime(order.showtime.startTime)}` : ""}
                                    {` · ${order.heldSeatIds.length} ghế`}
                                </span>
                            </div>

                            <span className={`parked-timer ${leftMs < 120_000 ? "is-warning" : ""}`}>
                                {String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}
                            </span>

                            <button
                                type="button"
                                className="parked-resume"
                                onClick={() => handleResume(order)}
                                disabled={busyCode !== null}
                            >
                                {busyCode === order.code ? "Đang mở…" : "Mở lại"}
                            </button>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function CounterSale() {
    const navigate = useNavigate();
    const location = useLocation();
    const [pageNotice, setPageNotice] = useState(
        () => (location.state as { notice?: string } | null)?.notice ?? ""
    );

    useEffect(() => {
        if (!pageNotice) return;
        const id = window.setTimeout(() => setPageNotice(""), 6_000);
        return () => window.clearTimeout(id);
    }, [pageNotice]);

    const now = useNow(CLOCK_TICK_MS);
    const todayKey = formatDate(new Date(now));

    // null = "Tất cả ngày" (không lọc theo ngày).
    const [selectedDate, setSelectedDate] = useState<string | null>(todayKey);
    const [dateWindowStart, setDateWindowStart] = useState(todayKey);

    // Cache lịch chiếu theo ngày: tải 1 lần, dùng cho tìm kiếm / tất cả ngày.
    const [showtimesByDate, setShowtimesByDate] = useState<Record<string, ShowtimeData[]>>({});
    const [dateErrors, setDateErrors] = useState<Record<string, string>>({});
    const [dateRetryToken, setDateRetryToken] = useState(0);
    const requestedDatesRef = useRef<Set<string>>(new Set());
    const cacheGenerationRef = useRef(0);
    const rangeApiRef = useRef<ApiSupport>("unknown");
    const seatApiRef = useRef<ApiSupport>("unknown");

    const [searchMovie, setSearchMovie] = useState("");
    const [moviePage, setMoviePage] = useState(0);

    const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null);
    const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

    const [seatSummary, setSeatSummary] = useState<Record<number, SeatSummary>>({});
    const [seatRefreshToken, setSeatRefreshToken] = useState(0);
    const requestedSeatIdsRef = useRef<Set<number>>(new Set());

    const showtimeSectionRef = useRef<HTMLElement>(null);

    const keyword = normalizeText(searchMovie);


    useEffect(() => {
        setSelectedDate((prev) => (prev && prev < todayKey ? todayKey : prev));
        setDateWindowStart((prev) => maxDate(prev, todayKey));
    }, [todayKey]);

    const visibleDates = useMemo(
        () => Array.from({ length: DATE_WINDOW_SIZE }, (_, i) => addDays(dateWindowStart, i)),
        [dateWindowStart]
    );

    const rangeDates = useMemo(
        () => Array.from({ length: SEARCH_RANGE_DAYS }, (_, i) => addDays(todayKey, i)),
        [todayKey]
    );


    useEffect(() => {
        const wanted = Array.from(
            new Set([...(selectedDate ? [selectedDate] : []), ...rangeDates])
        ).filter((date) => !requestedDatesRef.current.has(date));

        if (wanted.length === 0) return;

        wanted.forEach((date) => requestedDatesRef.current.add(date));

        const generation = cacheGenerationRef.current;

        function storeDates(records: Record<string, ShowtimeData[]>) {
            setShowtimesByDate((prev) => ({ ...prev, ...records }));
            setDateErrors((prev) => {
                const next = { ...prev };
                let changed = false;

                Object.keys(records).forEach((date) => {
                    if (date in next) {
                        delete next[date];
                        changed = true;
                    }
                });

                return changed ? next : prev;
            });
        }

        async function loadPerDay(dates: string[]) {
            await runWithConcurrency(dates, DATE_FETCH_CONCURRENCY, async (date) => {
                try {
                    const data = await getShowtimesByDate(date);

                    if (generation !== cacheGenerationRef.current) return;

                    storeDates({ [date]: Array.isArray(data) ? data : [] });
                } catch (err) {
                    if (generation !== cacheGenerationRef.current) return;

                    console.error(`Không thể tải suất chiếu ngày ${date}:`, err);
                    requestedDatesRef.current.delete(date);
                    setDateErrors((prev) => ({
                        ...prev,
                        [date]: err instanceof Error ? err.message : "Không thể tải danh sách suất chiếu.",
                    }));
                }
            });
        }

        async function load() {
            const inRange = wanted.filter((date) => rangeDates.includes(date)).sort();
            const perDay = wanted.filter((date) => !rangeDates.includes(date));

            if (inRange.length > 0 && rangeApiRef.current !== "unsupported") {
                try {
                    const data = await getShowtimesInRange(inRange[0], inRange[inRange.length - 1]);

                    if (generation !== cacheGenerationRef.current) return;

                    rangeApiRef.current = "ok";

                    const records: Record<string, ShowtimeData[]> = {};
                    inRange.forEach((date) => {
                        records[date] = [];
                    });

                    data.forEach((showtime) => {
                        const date = dateKeyOf(showtime);
                        if (date in records) records[date].push(showtime);
                    });

                    storeDates(records);
                } catch (err) {
                    if (generation !== cacheGenerationRef.current) return;

                    if (isNotSupported(err)) rangeApiRef.current = "unsupported";

                    console.warn("API lịch chiếu theo khoảng ngày lỗi, chuyển sang tải từng ngày:", err);
                    perDay.push(...inRange);
                }
            } else {
                perDay.push(...inRange);
            }

            if (perDay.length > 0) await loadPerDay(perDay);
        }

        load();
    }, [selectedDate, rangeDates, dateRetryToken]);

    function reloadAll() {
        cacheGenerationRef.current += 1;
        requestedDatesRef.current = new Set();
        requestedSeatIdsRef.current = new Set();
        setShowtimesByDate({});
        setDateErrors({});
        setSeatSummary({});
        setDateRetryToken((value) => value + 1);
    }

    const rangeSet = useMemo(() => new Set(rangeDates), [rangeDates]);
    const rangeLoadedCount = rangeDates.filter((date) => date in showtimesByDate).length;
    const rangeErrorCount = rangeDates.filter((date) => date in dateErrors).length;
    const rangeComplete = rangeLoadedCount + rangeErrorCount >= rangeDates.length;


    const sellableAll = useMemo(() => {
        const byId = new Map<number, ShowtimeData>();

        Object.values(showtimesByDate).forEach((list) => {
            list.forEach((showtime) => {
                if (!byId.has(showtime.id)) byId.set(showtime.id, showtime);
            });
        });

        return Array.from(byId.values())
            .filter((showtime) => isShowtimeSellable(showtime, now))
            .sort((a, b) => getStartMs(a) - getStartMs(b));
    }, [showtimesByDate, now]);

    // Phạm vi hiện tại: đúng ngày đang chọn, hoặc cả dải 14 ngày.
    const scopeShowtimes = useMemo(
        () =>
            selectedDate
                ? sellableAll.filter((s) => dateKeyOf(s) === selectedDate)
                : sellableAll.filter((s) => rangeSet.has(dateKeyOf(s))),
        [sellableAll, selectedDate, rangeSet]
    );

    const scopeLoading = selectedDate
        ? !(selectedDate in showtimesByDate) && !(selectedDate in dateErrors)
        : rangeLoadedCount === 0 && !rangeComplete;

    const scopeError = selectedDate
        ? dateErrors[selectedDate] ?? ""
        : rangeLoadedCount === 0 && rangeComplete
            ? "Không tải được lịch chiếu."
            : "";


    const movieEntries = useMemo<MovieEntry[]>(() => {
        const map = new Map<
            number,
            { movie: ShowtimeData; slots: number; days: Set<string>; rooms: Set<string> }
        >();

        scopeShowtimes.forEach((showtime) => {
            if (keyword && !normalizeText(showtime.movieTitle).includes(keyword)) return;

            let entry = map.get(showtime.movieId);

            if (!entry) {
                entry = { movie: showtime, slots: 0, days: new Set(), rooms: new Set() };
                map.set(showtime.movieId, entry);
            }

            entry.slots += 1;
            entry.days.add(dateKeyOf(showtime));
            entry.rooms.add(getRoomName(showtime));
        });

        return Array.from(map.values())
            .map(({ movie, slots, days, rooms }) => ({
                movie,
                slotCount: slots,
                dayCount: days.size,
                roomLabel: rooms.size === 1 ? Array.from(rooms)[0] : `${rooms.size} phòng`,
                firstStart: getStartMs(movie),
            }))
            .sort((a, b) => a.firstStart - b.firstStart);
    }, [scopeShowtimes, keyword]);

    const keywordMovieIds = useMemo(() => {
        const ids = new Set<number>();

        if (!keyword) return ids;

        sellableAll.forEach((showtime) => {
            if (rangeSet.has(dateKeyOf(showtime)) && normalizeText(showtime.movieTitle).includes(keyword)) {
                ids.add(showtime.movieId);
            }
        });

        return ids;
    }, [sellableAll, keyword, rangeSet]);

    const totalMoviePages = Math.max(1, Math.ceil(movieEntries.length / MOVIES_PER_PAGE));
    const safeMoviePage = Math.min(moviePage, totalMoviePages - 1);

    const visibleMovies = useMemo(() => {
        const start = safeMoviePage * MOVIES_PER_PAGE;
        return movieEntries.slice(start, start + MOVIES_PER_PAGE);
    }, [movieEntries, safeMoviePage]);

    const selectedMovie = useMemo(
        () => sellableAll.find((s) => s.movieId === selectedMovieId) ?? null,
        [sellableAll, selectedMovieId]
    );

    const targetMovieIds = useMemo<Set<number> | null>(() => {
        if (selectedMovieId !== null) return new Set([selectedMovieId]);
        if (keyword) return keywordMovieIds;
        return null;
    }, [selectedMovieId, keyword, keywordMovieIds]);

    const availability = useMemo<DateAvailability[]>(() => {
        if (!targetMovieIds) return [];

        const counts = new Map<string, number>();

        sellableAll.forEach((showtime) => {
            if (!targetMovieIds.has(showtime.movieId)) return;

            const date = dateKeyOf(showtime);

            if (!rangeSet.has(date) && date !== selectedDate) return;

            counts.set(date, (counts.get(date) ?? 0) + 1);
        });

        return Array.from(counts.entries())
            .map(([date, count]) => ({ date, count }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [targetMovieIds, sellableAll, rangeSet, selectedDate]);

    // Số suất mỗi ngày (mọi phim) để làm mờ ngày không có suất ở dải 7 ngày.
    const countByDate = useMemo(() => {
        const counts = new Map<string, number>();

        sellableAll.forEach((s) => {
            const date = dateKeyOf(s);
            counts.set(date, (counts.get(date) ?? 0) + 1);
        });

        return counts;
    }, [sellableAll]);

    const availabilityTitle = selectedMovie
        ? selectedMovie.movieTitle
        : keyword
            ? `${keywordMovieIds.size} phim khớp “${searchMovie.trim()}”`
            : "";


    const movieShowtimes = useMemo(
        () =>
            selectedMovieId === null
                ? []
                : scopeShowtimes.filter((s) => s.movieId === selectedMovieId),
        [scopeShowtimes, selectedMovieId]
    );


    useEffect(() => {
        const pending = movieShowtimes.filter((s) => !requestedSeatIdsRef.current.has(s.id));

        if (pending.length === 0) return;

        pending.forEach((s) => requestedSeatIdsRef.current.add(s.id));

        const generation = cacheGenerationRef.current;

        async function loadPerShowtime(list: ShowtimeData[]) {
            await runWithConcurrency(list, SEAT_FETCH_CONCURRENCY, async (showtime) => {
                let summary: SeatSummary;

                try {
                    const seats: ShowtimeSeat[] = await getShowtimeSeats(showtime.id);
                    summary = {
                        total: seats.length,
                        available: seats.filter((seat) => seat.status === "AVAILABLE").length,
                        failed: false,
                    };
                } catch (err) {
                    console.error(`Không thể tải ghế của suất ${showtime.id}:`, err);
                    requestedSeatIdsRef.current.delete(showtime.id);
                    summary = { total: 0, available: 0, failed: true };
                }

                if (generation !== cacheGenerationRef.current) return;

                setSeatSummary((prev) => ({ ...prev, [showtime.id]: summary }));
            });
        }

        async function load() {
            if (seatApiRef.current !== "unsupported") {
                try {
                    for (let i = 0; i < pending.length; i += SEAT_SUMMARY_CHUNK) {
                        const chunk = pending.slice(i, i + SEAT_SUMMARY_CHUNK);
                        const rows = await getSeatSummaries(chunk.map((s) => s.id));

                        if (generation !== cacheGenerationRef.current) return;

                        setSeatSummary((prev) => {
                            const next = { ...prev };

                            rows.forEach((row) => {
                                next[row.showtimeId] = {
                                    total: Number(row.total) || 0,
                                    available: Number(row.available) || 0,
                                    failed: false,
                                };
                            });

                            return next;
                        });
                    }

                    seatApiRef.current = "ok";
                    return;
                } catch (err) {
                    if (generation !== cacheGenerationRef.current) return;

                    if (isNotSupported(err)) seatApiRef.current = "unsupported";

                    console.warn("API đếm ghế lỗi, chuyển sang tải ghế từng suất:", err);
                }
            }

            await loadPerShowtime(pending);
        }

        load();
    }, [movieShowtimes, seatRefreshToken]);

    useEffect(() => {
        if (selectedMovieId === null) return;

        const id = window.setInterval(() => {
            requestedSeatIdsRef.current = new Set();
            setSeatRefreshToken((value) => value + 1);
        }, SEAT_REFRESH_MS);

        return () => window.clearInterval(id);
    }, [selectedMovieId]);


    const showtimeGroups = useMemo<ShowtimeGroup[]>(() => {
        const byDate = selectedDate === null;

        function makeSlot(showtime: ShowtimeData): ShowtimeSlot {
            const seat = seatSummary[showtime.id];
            const known = !!seat && !seat.failed && seat.total > 0;

            return {
                key: String(showtime.id),
                showtime,
                seat,
                loading: !seat,
                soldOut: !!seat && !seat.failed && seat.available === 0,
                lowSeats: known && seat.available > 0 && seat.available / seat.total <= LOW_SEAT_RATIO,
            };
        }

        const groups = new Map<
            string,
            { title: string; meta: Set<string>; slots: ShowtimeSlot[]; order: string }
        >();

        movieShowtimes.forEach((showtime) => {
            const date = dateKeyOf(showtime);

            const key = byDate
                ? `date-${date}`
                : hasRoomId(showtime)
                    ? `room-${showtime.roomId}`
                    : "room-unknown";

            if (!groups.has(key)) {
                groups.set(key, {
                    title: byDate
                        ? `${getDayLabel(date, todayKey)} · ${formatShortDate(date)}`
                        : getRoomName(showtime),
                    meta: new Set(),
                    slots: [],
                    order: byDate
                        ? date
                        : hasRoomId(showtime)
                            ? String(showtime.roomId).padStart(6, "0")
                            : "zzzzzz",
                });
            }

            const group = groups.get(key)!;

            if (byDate) group.meta.add(getRoomName(showtime));
            group.meta.add(getRoomType(showtime));
            group.slots.push(makeSlot(showtime));
        });

        return Array.from(groups.entries())
            .sort(([, a], [, b]) => a.order.localeCompare(b.order))
            .map(([key, group]) => ({
                key,
                title: group.title,
                meta: Array.from(group.meta),
                slots: group.slots.sort((a, b) => getStartMs(a.showtime) - getStartMs(b.showtime)),
            }));
    }, [movieShowtimes, seatSummary, selectedDate, todayKey]);

    const totalSlotCount = showtimeGroups.reduce((sum, group) => sum + group.slots.length, 0);

    const singleRoom = selectedDate && showtimeGroups.length === 1 ? showtimeGroups[0] : null;


    const selectedSlot = useMemo(
        () =>
            showtimeGroups
                .flatMap((group) => group.slots)
                .find((slot) => slot.key === selectedSlotKey) ?? null,
        [showtimeGroups, selectedSlotKey]
    );

    const selectedShowtime = selectedSlot?.showtime ?? null;

    const canContinue = Boolean(selectedSlot && !selectedSlot.soldOut && !selectedSlot.loading);

    useEffect(() => {
        if (selectedSlotKey && !scopeLoading && !selectedSlot) {
            setSelectedSlotKey(null);
        }
    }, [selectedSlotKey, selectedSlot, scopeLoading]);

    function changeDate(value: string | null) {
        if (value && value < todayKey) return;

        setSelectedDate(value);
        setSelectedSlotKey(null);
        setMoviePage(0);
    }

    function toggleDate(value: string) {
        changeDate(value === selectedDate ? null : value);
    }

    function ensureDateVisible(value: string) {
        const windowEnd = addDays(dateWindowStart, DATE_WINDOW_SIZE - 1);

        if (value < dateWindowStart || value > windowEnd) {
            setDateWindowStart(maxDate(addDays(value, -3), todayKey));
        }
    }

    function handleManualDateChange(event: ChangeEvent<HTMLInputElement>) {
        const value = event.target.value;

        if (!value || value < todayKey) return;

        changeDate(value);
        ensureDateVisible(value);
    }

    function handlePickAvailableDate(value: string) {
        toggleDate(value);

        if (value !== selectedDate) ensureDateVisible(value);
    }

    function shiftSelectedDate(delta: number) {
        const base = selectedDate ?? addDays(todayKey, -1);
        const next = addDays(base, delta);

        if (next < todayKey) return;

        changeDate(next);

        const windowEnd = addDays(dateWindowStart, DATE_WINDOW_SIZE - 1);

        if (next < dateWindowStart) {
            setDateWindowStart(next);
        } else if (next > windowEnd) {
            setDateWindowStart(maxDate(addDays(next, -(DATE_WINDOW_SIZE - 1)), todayKey));
        }
    }

    function handleSearchChange(event: ChangeEvent<HTMLInputElement>) {
        setSearchMovie(event.target.value);
        setMoviePage(0);
    }

    function clearSearch() {
        setSearchMovie("");
        setMoviePage(0);
    }

    function scrollToShowtimes() {
        const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

        window.requestAnimationFrame(() => {
            showtimeSectionRef.current?.scrollIntoView({
                behavior: reduceMotion ? "auto" : "smooth",
                block: "nearest",
            });
        });
    }

    function handleSelectMovie(movieId: number) {
        if (movieId === selectedMovieId) {
            setSelectedMovieId(null);
            setSelectedSlotKey(null);
            return;
        }

        setSelectedMovieId(movieId);
        setSelectedSlotKey(null);
        scrollToShowtimes();
    }

    function handleSelectSlot(slot: ShowtimeSlot) {
        if (slot.soldOut || slot.loading || !isShowtimeSellable(slot.showtime, Date.now())) return;

        setSelectedSlotKey(slot.key);
    }

    function handleContinue() {
        if (!selectedSlot || selectedSlot.soldOut || selectedSlot.loading) return;

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
                                <span className="cs-slot-end">{formatTime(slot.showtime.endTime)}</span>
                            </span>

                            <span className="cs-slot-seats">{getSeatText(slot)}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    function renderAvailabilityStrip() {
        return (
            <div className="date-avail-wrap">
                <div className="date-avail-head">
                    <span>
                        Ngày có suất · <b>{availabilityTitle}</b>
                    </span>

                    {!rangeComplete && (
                        <small className="date-scan">
                            Đang quét lịch {rangeLoadedCount}/{rangeDates.length} ngày…
                        </small>
                    )}
                </div>

                {availability.length === 0 ? (
                    <div className="date-avail-empty">
                        {rangeComplete
                            ? `Không có suất nào trong ${SEARCH_RANGE_DAYS} ngày tới.`
                            : "Đang tìm các ngày có suất chiếu…"}
                    </div>
                ) : (
                    <div className="date-avail" aria-label="Các ngày có suất chiếu">
                        {availability.map(({ date, count }) => {
                            const isSelected = date === selectedDate;

                            return (
                                <button
                                    key={date}
                                    type="button"
                                    aria-pressed={isSelected}
                                    className={`date-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => handlePickAvailableDate(date)}
                                    title={isSelected ? "Bấm lần nữa để bỏ chọn ngày" : undefined}
                                >
                                    <strong className="date-value">{formatShortDate(date)}</strong>
                                    <span className="date-day">{getDayLabel(date, todayKey)}</span>
                                    <span className="date-count">{count} suất</span>
                                    {isSelected && <span className="date-check">✓</span>}
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    }

    function renderWeekStrip() {
        return (
            <div className="date-selector-wrap">
                <button
                    type="button"
                    className="date-nav-button"
                    onClick={() => shiftSelectedDate(-1)}
                    disabled={!selectedDate || selectedDate <= todayKey}
                    aria-label="Ngày trước"
                >
                    ‹
                </button>

                <div className="date-selector">
                    {visibleDates.map((dateValue) => {
                        const isSelected = dateValue === selectedDate;
                        const isEmpty = dateValue in showtimesByDate && !countByDate.get(dateValue);

                        return (
                            <button
                                key={dateValue}
                                type="button"
                                className={`date-card ${isSelected ? "selected" : ""} ${isEmpty ? "is-empty" : ""}`}
                                onClick={() => toggleDate(dateValue)}
                                disabled={dateValue < todayKey}
                                aria-pressed={isSelected}
                                title={
                                    isSelected
                                        ? "Bấm lần nữa để bỏ chọn ngày"
                                        : isEmpty
                                            ? "Không còn suất bán"
                                            : undefined
                                }
                            >
                                <strong className="date-value">{formatShortDate(dateValue)}</strong>
                                <span className="date-day">{getDayLabel(dateValue, todayKey)}</span>
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
        );
    }


    const trimmedSearch = searchMovie.trim();

    const movieSubtitle = scopeLoading
        ? "Đang tải phim…"
        : keyword
            ? `${movieEntries.length} phim khớp “${trimmedSearch}”${
                selectedDate ? ` ngày ${formatShortDate(selectedDate)}` : ""
            }`
            : selectedDate
                ? movieEntries.length > 0
                    ? `${movieEntries.length} phim còn suất ngày ${formatShortDate(selectedDate)}`
                    : "Không có phim còn suất bán"
                : `${movieEntries.length} phim có suất trong ${SEARCH_RANGE_DAYS} ngày tới`;

    const keywordOtherDates =
        keyword && selectedDate && movieEntries.length === 0 && !scopeLoading ? availability : [];

    return (
        <div className="counter-sale">

            <CounterSaleStepper current={1} />

            {pageNotice && (
                <div className="counter-sale-notice" role="status">
                    <span>{pageNotice}</span>
                    <button type="button" onClick={() => setPageNotice("")} aria-label="Đóng">
                        ×
                    </button>
                </div>
            )}

            <ParkedOrders />


            <section className="counter-sale-section date-section">
                <div className="section-heading">
                    <div className="section-title">
                        <span className="section-step">01</span>
                        <div>
                            <h2>Ngày chiếu</h2>
                            <p>
                                {selectedDate
                                    ? `${getDayLabel(selectedDate, todayKey)}, ${formatDisplayDate(selectedDate)} · bấm lại để bỏ chọn`
                                    : `Tất cả ngày (${SEARCH_RANGE_DAYS} ngày tới)`}
                            </p>
                        </div>
                    </div>

                    <div className="date-display">
                        <button
                            type="button"
                            className={`date-all-button ${selectedDate === null ? "is-active" : ""}`}
                            onClick={() => changeDate(null)}
                            aria-pressed={selectedDate === null}
                        >
                            Tất cả ngày
                        </button>

                        <label className="date-display-box">
                            <span aria-hidden="true">📅</span>
                            <strong>{selectedDate ? formatDisplayDate(selectedDate) : "Chọn ngày"}</strong>
                            <span className="date-arrow">▾</span>

                            <input
                                type="date"
                                value={selectedDate ?? ""}
                                min={todayKey}
                                onChange={handleManualDateChange}
                                aria-label="Chọn ngày chiếu"
                            />
                        </label>
                    </div>
                </div>

                {targetMovieIds ? renderAvailabilityStrip() : renderWeekStrip()}
            </section>

            <section className="counter-sale-section movie-section">
                <div className="section-heading">
                    <div className="section-title">
                        <span className="section-step">02</span>
                        <div>
                            <h2>Chọn phim</h2>
                            <p>{movieSubtitle}</p>
                        </div>
                    </div>

                    <div className="movie-controls">
                        <div className={`movie-search ${keyword ? "is-active" : ""}`}>
                            <span aria-hidden="true">⌕</span>
                            <input
                                type="text"
                                value={searchMovie}
                                onChange={handleSearchChange}
                                onKeyDown={(event) => {
                                    if (event.key === "Escape") clearSearch();
                                }}
                                placeholder={`Tìm phim trong ${SEARCH_RANGE_DAYS} ngày…`}
                                aria-label="Tìm phim"
                            />
                            {searchMovie && (
                                <button
                                    type="button"
                                    className="movie-search-clear"
                                    onClick={clearSearch}
                                    aria-label="Xoá tìm kiếm"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {totalMoviePages > 1 && (
                            <span className="movie-page-indicator">
                                {safeMoviePage + 1}/{totalMoviePages}
                            </span>
                        )}

                        <button
                            type="button"
                            className="movie-nav-button"
                            onClick={() => setMoviePage(Math.max(0, safeMoviePage - 1))}
                            disabled={safeMoviePage === 0}
                            aria-label="Phim trước"
                        >
                            ‹
                        </button>

                        <button
                            type="button"
                            className="movie-nav-button"
                            onClick={() => setMoviePage(Math.min(totalMoviePages - 1, safeMoviePage + 1))}
                            disabled={safeMoviePage >= totalMoviePages - 1}
                            aria-label="Phim tiếp theo"
                        >
                            ›
                        </button>
                    </div>
                </div>

                {scopeLoading ? (
                    <div className="movie-grid" aria-busy="true">
                        {Array.from({ length: MOVIES_PER_PAGE }).map((_, index) => (
                            <div className="movie-skeleton" key={index} />
                        ))}
                    </div>
                ) : scopeError ? (
                    <div className="empty-state error-state">
                        <strong>Không thể tải suất chiếu</strong>
                        <span>{scopeError}</span>
                        <button type="button" className="retry-button" onClick={reloadAll}>
                            Tải lại
                        </button>
                    </div>
                ) : visibleMovies.length === 0 ? (
                    <div className="empty-state">
                        {keywordOtherDates.length > 0 && selectedDate ? (
                            <>
                                <strong>
                                    Không có phim khớp “{trimmedSearch}” ngày {formatShortDate(selectedDate)}
                                </strong>
                                <span>Phim có suất vào các ngày:</span>
                                <div className="empty-date-chips">
                                    {keywordOtherDates.slice(0, 8).map(({ date, count }) => (
                                        <button
                                            key={date}
                                            type="button"
                                            onClick={() => handlePickAvailableDate(date)}
                                        >
                                            {formatShortDate(date)} · {count} suất
                                        </button>
                                    ))}
                                    <button type="button" onClick={() => changeDate(null)}>
                                        Xem tất cả ngày
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <strong>
                                    {keyword
                                        ? rangeComplete
                                            ? `Không có phim khớp “${trimmedSearch}” trong ${SEARCH_RANGE_DAYS} ngày tới`
                                            : "Đang tìm…"
                                        : "Ngày này không còn suất để bán"}
                                </strong>
                                <span>
                                    {keyword ? "Thử từ khóa khác." : "Chọn ngày khác hoặc xem tất cả ngày."}
                                </span>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="movie-grid">
                        {visibleMovies.map(({ movie, slotCount, dayCount, roomLabel }) => {
                            const isSelected = movie.movieId === selectedMovieId;
                            const language = getMovieLanguage(movie);
                            const duration = getMovieDuration(movie);

                            return (
                                <button
                                    key={movie.movieId}
                                    type="button"
                                    className={`movie-card ${isSelected ? "selected" : ""}`}
                                    onClick={() => handleSelectMovie(movie.movieId)}
                                    aria-pressed={isSelected}
                                    title={isSelected ? "Bấm lần nữa để bỏ chọn phim" : movie.movieTitle}
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

                                        <span className="movie-room">
                                            {selectedDate ? roomLabel : `${dayCount} ngày`}
                                            <b>{slotCount} suất</b>
                                        </span>
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

                {!selectedDate && !rangeComplete && rangeLoadedCount > 0 && (
                    <p className="scan-note">
                        Đang tải lịch chiếu {rangeLoadedCount}/{rangeDates.length} ngày, danh sách sẽ tự cập nhật…
                    </p>
                )}
            </section>


            <section ref={showtimeSectionRef} className="counter-sale-section showtime-section">
                <div className="section-heading">
                    <div className="section-title">
                        <span className="section-step">03</span>
                        <div>
                            <h2>Suất chiếu</h2>
                            <p>
                                {selectedMovie
                                    ? `${selectedMovie.movieTitle} · ${
                                        selectedDate
                                            ? formatDisplayDate(selectedDate)
                                            : `${showtimeGroups.length} ngày có suất`
                                    }`
                                    : "Chọn phim để xem suất chiếu"}
                            </p>
                        </div>
                    </div>

                    {singleRoom ? (
                        <div className="showtime-room-badge">
                            <strong>{singleRoom.title}</strong>
                            {singleRoom.meta.map((item) => (
                                <span key={item}>{item}</span>
                            ))}
                            <span>{totalSlotCount} suất</span>
                        </div>
                    ) : (
                        selectedMovie &&
                        totalSlotCount > 0 && (
                            <div className="showtime-room-badge">
                                <span>{totalSlotCount} suất</span>
                            </div>
                        )
                    )}
                </div>

                {selectedMovieId === null ? (
                    <div className="showtime-empty">
                        <strong>Chưa chọn phim</strong>
                        <span>Hãy chọn một bộ phim ở bước trên.</span>
                    </div>
                ) : showtimeGroups.length === 0 ? (
                    <div className="showtime-empty">
                        <strong>
                            {selectedDate
                                ? `Phim không có suất ngày ${formatShortDate(selectedDate)}`
                                : "Không có suất chiếu"}
                        </strong>
                        <span>
                            {selectedDate && availability.length > 0
                                ? "Chọn một ngày có suất ở mục 01 phía trên."
                                : `Phim này không còn suất có thể bán trong ${SEARCH_RANGE_DAYS} ngày tới.`}
                        </span>
                    </div>
                ) : singleRoom ? (
                    renderSlots(singleRoom.slots)
                ) : (
                    <div className="showtime-groups">
                        {showtimeGroups.map((group) => (
                            <div className="showtime-group" key={group.key}>
                                <div className="showtime-group-header">
                                    <strong>{group.title}</strong>
                                    {group.meta.map((item) => (
                                        <span key={item}>{item}</span>
                                    ))}
                                    <span className="showtime-group-count">{group.slots.length} suất</span>
                                </div>

                                {renderSlots(group.slots)}
                            </div>
                        ))}
                    </div>
                )}
            </section>


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
                                    formatDisplayDate(dateKeyOf(selectedShowtime)),
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
                        <span>{selectedMovie ? "Chọn một giờ chiếu để tiếp tục" : "Chưa chọn suất chiếu"}</span>
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
