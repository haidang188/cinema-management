import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { ShowtimeData } from "../../types/showtime/showtime";
import type { ShowtimeSeat } from "../../types/showtimeSeat/showtimeSeat";
import { getShowtimeSeats } from "../../service/showtimeSeat/showtimeSeatService";
import { previewSale } from "../../service/counterSale/counterSaleService";

import "./CounterSaleSeats.css";


const MAX_SEATS_PER_ORDER = 10;
// Làm mới sơ đồ ghế định kỳ: quầy khác / online có thể vừa bán.
const SEAT_REFRESH_MS = 20_000;
// Gộp các lần click ghế liên tiếp thành 1 lần gọi API tính giá.
const PRICE_DEBOUNCE_MS = 250;
const NOTICE_DURATION_MS = 4_000;

type SeatState = "available" | "sold" | "held" | "blocked";
type SeatKind = "standard" | "vip" | "couple";

type PriceState = {
    total: number;
    discount: number;
    final: number;
};

type RowCell =
    | { type: "seat"; seat: ShowtimeSeat }
    | { type: "gap"; key: string };

type SeatRow = {
    label: string;
    cells: RowCell[];
};

const EMPTY_PRICE: PriceState = { total: 0, discount: 0, final: 0 };

function getSeatState(status?: string | null): SeatState {
    const value = String(status ?? "").toUpperCase();

    if (value === "AVAILABLE") return "available";
    if (["SOLD", "BOOKED", "PAID", "OCCUPIED"].includes(value)) return "sold";
    if (["HELD", "HOLD", "RESERVED", "LOCKED", "PENDING"].includes(value)) return "held";

    return "blocked";
}

function getSeatKind(type?: string | null): SeatKind {
    const value = String(type ?? "").toUpperCase();

    if (/COUPLE|DOUBLE|SWEET/.test(value)) return "couple";
    if (/VIP|PREMIUM/.test(value)) return "vip";

    return "standard";
}

const SEAT_KIND_LABEL: Record<SeatKind, string> = {
    standard: "Thường",
    vip: "VIP",
    couple: "Ghế đôi",
};

const SEAT_STATE_LABEL: Record<SeatState, string> = {
    available: "Trống",
    sold: "Đã bán",
    held: "Đang giữ",
    blocked: "Không bán",
};

function seatCode(seat: ShowtimeSeat): string {
    return `${seat.rowLabel}${seat.seatNumber}`;
}

function compareRowLabel(a: string, b: string): number {
    return a.length - b.length || a.localeCompare(b, "vi");
}

function compareSeat(a: ShowtimeSeat, b: ShowtimeSeat): number {
    return compareRowLabel(a.rowLabel, b.rowLabel) || a.seatNumber - b.seatNumber;
}

function formatMoney(value: number): string {
    return `${value.toLocaleString("vi-VN")}đ`;
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

function formatDateLabel(value?: string | null): string {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function getApiErrorMessage(err: unknown, fallback: string): string {
    const anyErr = err as {
        message?: string;
        response?: { status?: number; data?: unknown };
    };

    const status = anyErr?.response?.status;
    const data = anyErr?.response?.data;

    let message = "";

    if (typeof data === "string") {
        message = data;
    } else if (data && typeof data === "object") {
        const body = data as Record<string, unknown>;
        message = String(body.message ?? body.error ?? body.detail ?? "");
    }

    if (!message && err instanceof Error) {
        message = err.message;
    }

    message = message.trim() || fallback;

    return status ? `${message} (HTTP ${status})` : message;
}

function getRoomName(showtime: ShowtimeData): string {
    const name = showtime.roomName?.trim();

    if (name) return name;

    if (showtime.roomId !== undefined && showtime.roomId !== null) {
        return `Phòng ${String(showtime.roomId).padStart(2, "0")}`;
    }

    return "Phòng chiếu";
}

function getFormatLabel(showtime: ShowtimeData): string {
    return showtime.format?.trim() || showtime.roomType?.trim() || "2D";
}


function CounterSaleSeats() {
    const navigate = useNavigate();
    const location = useLocation();

    const showtime = location.state?.showtime as ShowtimeData | undefined;
    const showtimeId = showtime?.id;

    const [seats, setSeats] = useState<ShowtimeSeat[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    // Quay lại từ trang xác nhận ("Đổi ghế") thì giữ nguyên ghế đã chọn.
    const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>(() => {
        const initial = (location.state as { selectedSeatIds?: unknown } | null)?.selectedSeatIds;
        return Array.isArray(initial)
            ? initial.filter((id): id is number => typeof id === "number")
            : [];
    });

    const [price, setPrice] = useState<PriceState>(EMPTY_PRICE);
    const [priceLoading, setPriceLoading] = useState(false);
    const [priceError, setPriceError] = useState("");
    const [priceRetryToken, setPriceRetryToken] = useState(0);

    const [notice, setNotice] = useState("");

    const seatRequestRef = useRef(0);

    /* ================= LOAD / REFRESH GHẾ ================= */

    const loadSeats = useCallback(
        async (silent: boolean) => {
            if (!showtimeId) return;

            const requestId = ++seatRequestRef.current;

            if (!silent) {
                setLoading(true);
                setError("");
            }

            try {
                const data = await getShowtimeSeats(showtimeId);

                if (requestId !== seatRequestRef.current) return;

                setSeats(Array.isArray(data) ? data : []);
                setLastUpdated(Date.now());
                setError("");
            } catch (err) {
                if (requestId !== seatRequestRef.current) return;

                console.error("Không thể tải sơ đồ ghế:", err);


                if (!silent) {
                    setError(
                        err instanceof Error
                            ? err.message
                            : "Không thể tải danh sách ghế."
                    );
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [showtimeId]
    );

    useEffect(() => {
        loadSeats(false);

        const id = window.setInterval(() => loadSeats(true), SEAT_REFRESH_MS);

        return () => {
            window.clearInterval(id);
            seatRequestRef.current += 1;
        };
    }, [loadSeats]);

    const seatById = useMemo(() => {
        const map = new Map<number, ShowtimeSeat>();
        seats.forEach((seat) => map.set(seat.id, seat));
        return map;
    }, [seats]);

    useEffect(() => {
        if (seats.length === 0 || selectedSeatIds.length === 0) return;

        const lost = selectedSeatIds.filter((id) => {
            const seat = seatById.get(id);
            return !seat || getSeatState(seat.status) !== "available";
        });

        if (lost.length === 0) return;

        const codes = lost
            .map((id) => seatById.get(id))
            .filter((seat): seat is ShowtimeSeat => Boolean(seat))
            .map(seatCode);

        setSelectedSeatIds((current) => current.filter((id) => !lost.includes(id)));
        setNotice(
            codes.length > 0
                ? `Ghế ${codes.join(", ")} vừa được bán hoặc giữ ở nơi khác nên đã bị bỏ chọn.`
                : "Một số ghế không còn khả dụng nên đã bị bỏ chọn."
        );
    }, [seats, seatById, selectedSeatIds]);

    useEffect(() => {
        if (!notice) return;

        const id = window.setTimeout(() => setNotice(""), NOTICE_DURATION_MS);
        return () => window.clearTimeout(id);
    }, [notice]);

    /* ================= SƠ ĐỒ THEO HÀNG ================= */

    const rows = useMemo<SeatRow[]>(() => {
        const groups = new Map<string, ShowtimeSeat[]>();

        seats.forEach((seat) => {
            if (!groups.has(seat.rowLabel)) groups.set(seat.rowLabel, []);
            groups.get(seat.rowLabel)!.push(seat);
        });

        return Array.from(groups.entries())
            .sort(([a], [b]) => compareRowLabel(a, b))
            .map(([label, rowSeats]) => {
                const sorted = [...rowSeats].sort((a, b) => a.seatNumber - b.seatNumber);
                const cells: RowCell[] = [];

                sorted.forEach((seat, index) => {
                    const prev = sorted[index - 1];

                    // Số ghế bị nhảy (vd 4 -> 7) = lối đi / ghế không tồn tại.
                    if (prev && seat.seatNumber - prev.seatNumber > 1) {
                        cells.push({ type: "gap", key: `${label}-gap-${seat.seatNumber}` });
                    }

                    cells.push({ type: "seat", seat });
                });

                return { label, cells };
            });
    }, [seats]);

    const seatStats = useMemo(() => {
        let available = 0;
        const kinds = new Set<SeatKind>();
        const states = new Set<SeatState>();

        seats.forEach((seat) => {
            const state = getSeatState(seat.status);
            if (state === "available") available += 1;
            states.add(state);
            kinds.add(getSeatKind(seat.seatType));
        });

        return { available, total: seats.length, kinds, states };
    }, [seats]);

    const selectedSeats = useMemo(
        () =>
            selectedSeatIds
                .map((id) => seatById.get(id))
                .filter((seat): seat is ShowtimeSeat => Boolean(seat))
                .sort(compareSeat),
        [selectedSeatIds, seatById]
    );

    /* ================= TÍNH GIÁ (debounce + chống response cũ) ================= */

    useEffect(() => {
        if (!showtimeId || selectedSeatIds.length === 0) {
            setPrice(EMPTY_PRICE);
            setPriceLoading(false);
            setPriceError("");
            return;
        }

        let cancelled = false;
        const seatIds = [...selectedSeatIds].sort((a, b) => a - b);

        setPriceLoading(true);
        setPriceError("");

        const timer = window.setTimeout(async () => {
            try {
                const data = await previewSale(showtimeId, seatIds);

                if (cancelled) return;

                setPrice({
                    total: Number(data.totalAmount) || 0,
                    discount: Number(data.discountAmount) || 0,
                    final: Number(data.finalAmount) || 0,
                });
            } catch (err) {
                if (cancelled) return;

                // Log đủ để đối chiếu với log backend.
                console.error("previewSale lỗi:", { showtimeId, seatIds, err });
                setPriceError(getApiErrorMessage(err, "Không tính được giá vé."));
            } finally {
                if (!cancelled) setPriceLoading(false);
            }
        }, PRICE_DEBOUNCE_MS);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [showtimeId, selectedSeatIds, priceRetryToken]);

    const canContinue =
        selectedSeats.length > 0 && !priceLoading && !priceError;

    /* ================= HANDLERS ================= */

    function toggleSeat(seat: ShowtimeSeat) {
        if (getSeatState(seat.status) !== "available") return;

        if (selectedSeatIds.includes(seat.id)) {
            setSelectedSeatIds((current) => current.filter((id) => id !== seat.id));
            return;
        }

        if (selectedSeatIds.length >= MAX_SEATS_PER_ORDER) {
            setNotice(`Mỗi đơn tối đa ${MAX_SEATS_PER_ORDER} ghế.`);
            return;
        }

        setSelectedSeatIds((current) => [...current, seat.id]);
    }

    function clearSelection() {
        setSelectedSeatIds([]);
    }

    // Esc = bỏ chọn tất cả (thao tác nhanh ở quầy).
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") setSelectedSeatIds([]);
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, []);

    function handleContinue() {
        if (!canContinue) return;

        navigate("/counter-sale/confirm", {
            state: {
                showtime,
                selectedSeatIds: selectedSeats.map((seat) => seat.id),
                selectedSeats,
                price,
            },
        });
    }

    function handlePosterError(event: SyntheticEvent<HTMLImageElement>) {
        event.currentTarget.classList.add("is-broken");
    }

    /* ================= EMPTY: vào thẳng URL / F5 ================= */

    if (!showtime) {
        return (
            <div className="cs-seats-page">
                <div className="cs-seats-empty">
                    <span className="cs-seats-empty-icon" aria-hidden="true">🎟</span>
                    <h2>Chưa chọn suất chiếu</h2>
                    <p>Chọn phim và suất chiếu trước khi chọn ghế.</p>
                    <button
                        type="button"
                        className="cs-btn cs-btn-primary"
                        onClick={() => navigate("/counter-sale")}
                    >
                        ← Chọn suất chiếu
                    </button>
                </div>
            </div>
        );
    }

    const startTime = formatTime(showtime.startTime);
    const endTime = formatTime(showtime.endTime);
    const dateLabel = formatDateLabel(showtime.startTime);

    /* ================= RENDER ================= */

    return (
        <div className="cs-seats-page">
            {/* ================= HEADER ================= */}

            <header className="cs-seats-header">
                <button
                    type="button"
                    className="cs-btn cs-btn-ghost"
                    onClick={() => navigate("/counter-sale")}
                >
                    ← Đổi suất
                </button>

                <div className="cs-seats-title">
                    <span className="cs-eyebrow">Bước 2 / 3</span>
                    <h1>Chọn ghế</h1>
                </div>

                <div className="cs-showtime-card">
                    <div className="cs-showtime-poster">
                        {showtime.posterUrl && (
                            <img
                                src={showtime.posterUrl}
                                alt=""
                                onError={handlePosterError}
                            />
                        )}
                    </div>

                    <div className="cs-showtime-info">
                        <strong title={showtime.movieTitle}>{showtime.movieTitle}</strong>

                        <div className="cs-chips">
                            {dateLabel && <span className="cs-chip">{dateLabel}</span>}
                            <span className="cs-chip cs-chip-strong">
                                {startTime} – {endTime}
                            </span>
                            <span className="cs-chip cs-chip-red">{getRoomName(showtime)}</span>
                            <span className="cs-chip">{getFormatLabel(showtime)}</span>
                        </div>
                    </div>
                </div>
            </header>

            <div className="cs-seats-body">
                {/* ================= SEAT MAP ================= */}

                <section className="cs-seatmap-card" aria-label="Sơ đồ ghế">
                    <div className="cs-seatmap-toolbar">
                        <div>
                            <h2>Sơ đồ ghế</h2>
                            <p>
                                {loading && seats.length === 0
                                    ? "Đang tải…"
                                    : `Còn ${seatStats.available}/${seatStats.total} ghế trống`}
                                {lastUpdated && (
                                    <button
                                        type="button"
                                        className="cs-refresh"
                                        onClick={() => loadSeats(false)}
                                        title="Tải lại sơ đồ ghế"
                                    >
                                        ↻ Làm mới
                                    </button>
                                )}
                            </p>
                        </div>

                        <ul className="cs-legend">
                            <li><i className="cs-legend-seat is-available" />Trống</li>
                            <li><i className="cs-legend-seat is-selected" />Đang chọn</li>
                            <li><i className="cs-legend-seat is-sold" />Đã bán</li>
                            <li><i className="cs-legend-seat is-held" />Đang giữ</li>
                            {seatStats.kinds.has("vip") && (
                                <li><i className="cs-legend-seat is-available is-vip" />VIP</li>
                            )}
                            {seatStats.kinds.has("couple") && (
                                <li><i className="cs-legend-seat is-available is-couple" />Ghế đôi</li>
                            )}
                        </ul>
                    </div>

                    <div className="cs-seatmap-scroll">
                        <div className="cs-seatmap">
                            <div className="cs-screen" aria-hidden="true">
                                <span>Màn hình</span>
                            </div>

                            {loading && seats.length === 0 ? (
                                <div className="cs-seatmap-skeleton" aria-busy="true">
                                    {Array.from({ length: 8 }).map((_, row) => (
                                        <div key={row}>
                                            {Array.from({ length: 12 }).map((__, col) => (
                                                <i key={col} />
                                            ))}
                                        </div>
                                    ))}
                                </div>
                            ) : error ? (
                                <div className="cs-seatmap-state is-error">
                                    <strong>Không thể tải sơ đồ ghế</strong>
                                    <span>{error}</span>
                                    <button
                                        type="button"
                                        className="cs-btn cs-btn-ghost"
                                        onClick={() => loadSeats(false)}
                                    >
                                        Tải lại
                                    </button>
                                </div>
                            ) : rows.length === 0 ? (
                                <div className="cs-seatmap-state">
                                    <strong>Suất này chưa có sơ đồ ghế</strong>
                                    <span>Kiểm tra lại cấu hình phòng chiếu.</span>
                                </div>
                            ) : (
                                <div className="cs-rows">
                                    {rows.map((row) => (
                                        <div className="cs-row" key={row.label}>
                                            <span className="cs-row-label">{row.label}</span>

                                            <div className="cs-row-seats">
                                                {row.cells.map((cell) => {
                                                    if (cell.type === "gap") {
                                                        return (
                                                            <span
                                                                key={cell.key}
                                                                className="cs-seat-gap"
                                                                aria-hidden="true"
                                                            />
                                                        );
                                                    }

                                                    const { seat } = cell;
                                                    const state = getSeatState(seat.status);
                                                    const kind = getSeatKind(seat.seatType);
                                                    const isSelected = selectedSeatIds.includes(seat.id);

                                                    const className = [
                                                        "cs-seat",
                                                        `is-${state}`,
                                                        kind !== "standard" && `is-${kind}`,
                                                        isSelected && "is-selected",
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" ");

                                                    const label = `Ghế ${seatCode(seat)}, ${SEAT_KIND_LABEL[kind]}, ${
                                                        isSelected ? "Đang chọn" : SEAT_STATE_LABEL[state]
                                                    }`;

                                                    return (
                                                        <button
                                                            key={seat.id}
                                                            type="button"
                                                            className={className}
                                                            disabled={state !== "available"}
                                                            onClick={() => toggleSeat(seat)}
                                                            aria-pressed={isSelected}
                                                            aria-label={label}
                                                            title={label}
                                                        >
                                                            {seat.seatNumber}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <span className="cs-row-label">{row.label}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {notice && (
                        <div className="cs-notice" role="status">
                            <span>{notice}</span>
                            <button type="button" onClick={() => setNotice("")} aria-label="Đóng">
                                ×
                            </button>
                        </div>
                    )}
                </section>

                {/* ================= SUMMARY ================= */}

                <aside className="cs-summary" aria-label="Thông tin đơn">
                    <div className="cs-summary-head">
                        <h2>Đơn bán vé</h2>
                        <span className="cs-summary-count">
                            {selectedSeats.length}/{MAX_SEATS_PER_ORDER} ghế
                        </span>
                    </div>

                    <div className="cs-summary-seats">
                        <div className="cs-summary-label">
                            <span>Ghế đã chọn</span>
                            {selectedSeats.length > 0 && (
                                <button type="button" className="cs-link" onClick={clearSelection}>
                                    Bỏ chọn tất cả
                                </button>
                            )}
                        </div>

                        {selectedSeats.length === 0 ? (
                            <p className="cs-summary-empty">
                                Bấm vào ghế trống trên sơ đồ để chọn.
                                <br />
                                <kbd>Esc</kbd> để bỏ chọn tất cả.
                            </p>
                        ) : (
                            <ul className="cs-seat-chips">
                                {selectedSeats.map((seat) => {
                                    const kind = getSeatKind(seat.seatType);

                                    return (
                                        <li key={seat.id} className={`cs-seat-chip is-${kind}`}>
                                            <b>{seatCode(seat)}</b>
                                            {kind !== "standard" && <small>{SEAT_KIND_LABEL[kind]}</small>}
                                            <button
                                                type="button"
                                                onClick={() => toggleSeat(seat)}
                                                aria-label={`Bỏ chọn ghế ${seatCode(seat)}`}
                                            >
                                                ×
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        )}
                    </div>

                    <div className={`cs-summary-price ${priceLoading ? "is-loading" : ""}`}>
                        <div>
                            <span>Tiền vé</span>
                            <strong>{formatMoney(price.total)}</strong>
                        </div>

                        <div>
                            <span>Giảm giá</span>
                            <strong className={price.discount > 0 ? "is-discount" : ""}>
                                {price.discount > 0 ? "−" : ""}
                                {formatMoney(price.discount)}
                            </strong>
                        </div>

                        <div className="cs-summary-total">
                            <span>Tổng cộng</span>
                            <strong>{priceLoading ? "Đang tính…" : formatMoney(price.final)}</strong>
                        </div>

                        {priceError && (
                            <div className="cs-price-error" role="alert">
                                <span>{priceError}</span>
                                <button
                                    type="button"
                                    className="cs-link"
                                    onClick={() => setPriceRetryToken((value) => value + 1)}
                                >
                                    Tính lại
                                </button>
                            </div>
                        )}
                    </div>

                    <button
                        type="button"
                        className="cs-btn cs-btn-primary cs-summary-cta"
                        disabled={!canContinue}
                        onClick={handleContinue}
                    >
                        {selectedSeats.length === 0
                            ? "Chọn ít nhất 1 ghế"
                            : `Tiếp tục · ${selectedSeats.length} ghế`}
                        <span aria-hidden="true">→</span>
                    </button>
                </aside>
            </div>
        </div>
    );
}

export default CounterSaleSeats;
