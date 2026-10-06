import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";
import { useSearchParams } from "react-router-dom";

import {
    BOOKING_STATUS_LABEL,
    CHANNEL_LABEL,
    paymentLabel,
    searchBookings,
    statusLabel,
    statusTone,
} from "../../service/bookingManagement/bookingManagementService";
import type {
    BookingListItem,
    BookingSearchParams,
    BookingSort,
    PageResponse,
} from "../../service/bookingManagement/bookingManagementService";
import BookingDetailDrawer from "./BookingDetailDrawer";

import "./BookingManagement.css";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const MAX_SEATS_SHOWN = 4;

const STATUS_OPTIONS = ["PENDING", "CONFIRMED", "CHECKED_IN", "CANCELLED", "EXPIRED", "REFUNDED"];

const SORT_OPTIONS: { value: BookingSort; label: string }[] = [
    { value: "NEWEST", label: "Đặt gần đây nhất" },
    { value: "OLDEST", label: "Đặt lâu nhất" },
    { value: "UPCOMING", label: "Sắp chiếu gần nhất" },
];

type DateField = "show" | "created";

type DatePreset = { key: string; label: string; from: string; to: string };


function formatMoney(value: number): string {
    return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function formatDateTime(value?: string | null): { date: string; time: string } {
    if (!value) return { date: "—", time: "" };

    const d = new Date(value);

    if (Number.isNaN(d.getTime())) return { date: "—", time: "" };

    return {
        date: d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }),
        time: d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false }),
    };
}

function toKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, days: number): Date {
    const next = new Date(d);
    next.setDate(next.getDate() + days);
    return next;
}

function datePresets(field: DateField): DatePreset[] {
    const today = new Date();
    const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const firstOfPrev = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastOfPrev = new Date(today.getFullYear(), today.getMonth(), 0);

    return [
        { key: "today", label: "Hôm nay", from: toKey(today), to: toKey(today) },
        field === "show"
            ? { key: "next7", label: "7 ngày tới", from: toKey(today), to: toKey(addDays(today, 6)) }
            : { key: "last7", label: "7 ngày qua", from: toKey(addDays(today, -6)), to: toKey(today) },
        { key: "thisMonth", label: "Tháng này", from: toKey(firstOfMonth), to: toKey(lastOfMonth) },
        { key: "prevMonth", label: "Tháng trước", from: toKey(firstOfPrev), to: toKey(lastOfPrev) },
    ];
}

function getApiErrorMessage(err: unknown, fallback: string): string {
    const anyErr = err as { message?: string; response?: { data?: unknown } };
    const data = anyErr?.response?.data;

    if (data && typeof data === "object" && "message" in (data as Record<string, unknown>)) {
        return String((data as Record<string, unknown>).message);
    }

    return err instanceof Error && err.message ? err.message : fallback;
}


function BookingManagement() {
    // Bộ lọc nằm trên URL: tải lại trang / quay lại vẫn giữ nguyên kết quả đang xem.
    const [searchParams, setSearchParams] = useSearchParams();

    const filters = useMemo<BookingSearchParams>(
        () => ({
            keyword: searchParams.get("q") ?? "",
            channel: (searchParams.get("channel") as BookingSearchParams["channel"]) ?? "ALL",
            status: searchParams.get("status") ?? "",
            sort: (searchParams.get("sort") as BookingSort) ?? "NEWEST",
            page: Number(searchParams.get("page") ?? 0) || 0,
            size: PAGE_SIZE,
        }),
        [searchParams]
    );

    const dateField: DateField = searchParams.get("dateBy") === "created" ? "created" : "show";
    const dateFrom = searchParams.get("from") ?? "";
    const dateTo = searchParams.get("to") ?? "";
    const presets = useMemo(() => datePresets(dateField), [dateField]);
    const activePreset = presets.find((p) => p.from === dateFrom && p.to === dateTo)?.key ?? null;

    const query = useMemo<BookingSearchParams>(
        () => ({
            ...filters,
            ...(dateField === "show"
                ? { showFrom: dateFrom, showTo: dateTo }
                : { createdFrom: dateFrom, createdTo: dateTo }),
        }),
        [filters, dateField, dateFrom, dateTo]
    );

    const [keywordInput, setKeywordInput] = useState(filters.keyword ?? "");
    const [result, setResult] = useState<PageResponse<BookingListItem> | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [reloadToken, setReloadToken] = useState(0);
    const [openId, setOpenId] = useState<number | null>(null);

    function updateFilters(patch: Record<string, string | number | null>, resetPage = true) {
        const next = new URLSearchParams(searchParams);

        Object.entries(patch).forEach(([key, value]) => {
            if (value === null || value === "" || value === "ALL" || (key === "sort" && value === "NEWEST")) {
                next.delete(key);
            } else {
                next.set(key, String(value));
            }
        });

        if (resetPage && !("page" in patch)) next.delete("page");

        setSearchParams(next, { replace: true });
    }

    useEffect(() => {
        if (keywordInput === (filters.keyword ?? "")) return;

        const id = window.setTimeout(() => updateFilters({ q: keywordInput.trim() }), SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(id);

    }, [keywordInput]);

    useEffect(() => {
        let cancelled = false;

        setLoading(true);
        setError("");

        searchBookings(query)
            .then((data) => {
                if (!cancelled) setResult(data);
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(getApiErrorMessage(err, "Không tải được danh sách đặt vé."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [query, reloadToken]);

    const hasFilter = Boolean(
        filters.keyword || (filters.channel && filters.channel !== "ALL") || filters.status || dateFrom || dateTo
    );

    function applyRange(from: string, to: string) {

        const [a, b] = from && to && from > to ? [to, from] : [from, to];
        updateFilters({ from: a, to: b });
    }

    function clearFilters() {
        setKeywordInput("");
        setSearchParams(new URLSearchParams(), { replace: true });
    }

    function onRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, id: number) {
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setOpenId(id);
        }
    }

    const items = result?.items ?? [];
    const page = result?.page ?? filters.page ?? 0;
    const totalPages = result?.totalPages ?? 0;

    return (
        <div className="bm-page">


            <header className="bm-header">
                <div>
                    <h1>Quản lý đặt vé</h1>
                    <p>Đơn bán tại quầy và đơn đặt online</p>
                </div>

                <span className="bm-count" aria-live="polite">
                    {result ? `${result.totalItems.toLocaleString("vi-VN")} đơn` : ""}
                </span>
            </header>


            <section className="bm-toolbar" aria-label="Tìm kiếm và lọc">
                <label className="bm-search">
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                        type="search"
                        value={keywordInput}
                        onChange={(event) => setKeywordInput(event.target.value)}
                        onKeyDown={(event) => {
                            if (event.key === "Enter") updateFilters({ q: keywordInput.trim() });
                        }}
                        placeholder="Mã đặt vé, mã vé, số điện thoại hoặc tên khách"
                        aria-label="Tìm đơn đặt vé"
                    />
                </label>

                <div className="bm-filters">
                    <div className="bm-segment" role="radiogroup" aria-label="Kênh bán">
                        {(["ALL", "COUNTER", "ONLINE"] as const).map((value) => (
                            <button
                                key={value}
                                type="button"
                                role="radio"
                                aria-checked={(filters.channel ?? "ALL") === value}
                                className={(filters.channel ?? "ALL") === value ? "is-active" : ""}
                                onClick={() => updateFilters({ channel: value })}
                            >
                                {value === "ALL" ? "Tất cả" : CHANNEL_LABEL[value]}
                            </button>
                        ))}
                    </div>

                    <label className="bm-field">
                        <span>Trạng thái</span>
                        <select
                            value={filters.status ?? ""}
                            onChange={(event) => updateFilters({ status: event.target.value })}
                        >
                            <option value="">Tất cả</option>
                            {STATUS_OPTIONS.map((value) => (
                                <option key={value} value={value}>
                                    {BOOKING_STATUS_LABEL[value]}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="bm-field">
                        <span>Sắp xếp</span>
                        <select
                            value={filters.sort ?? "NEWEST"}
                            onChange={(event) => updateFilters({ sort: event.target.value })}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    {hasFilter && (
                        <button type="button" className="bm-clear" onClick={clearFilters}>
                            Xoá bộ lọc
                        </button>
                    )}
                </div>

                <div className="bm-time" role="group" aria-label="Lọc theo thời gian">
                    <label className="bm-field">
                        <span>Thời gian theo</span>
                        <select
                            value={dateField}
                            onChange={(event) => updateFilters({ dateBy: event.target.value === "created" ? "created" : null })}
                        >
                            <option value="show">Ngày chiếu</option>
                            <option value="created">Ngày đặt</option>
                        </select>
                    </label>

                    <div className="bm-presets">
                        {presets.map((preset) => (
                            <button
                                key={preset.key}
                                type="button"
                                className={`bm-chip ${activePreset === preset.key ? "is-active" : ""}`}
                                aria-pressed={activePreset === preset.key}
                                onClick={() =>
                                    activePreset === preset.key
                                        ? updateFilters({ from: null, to: null })
                                        : updateFilters({ from: preset.from, to: preset.to })
                                }
                            >
                                {preset.label}
                            </button>
                        ))}
                    </div>

                    <div className="bm-range">
                        <label className="bm-field">
                            <span>Từ ngày</span>
                            <input type="date" value={dateFrom} onChange={(e) => applyRange(e.target.value, dateTo)} />
                        </label>
                        <label className="bm-field">
                            <span>Đến ngày</span>
                            <input type="date" value={dateTo} onChange={(e) => applyRange(dateFrom, e.target.value)} />
                        </label>
                    </div>
                </div>
            </section>


            <section className="bm-table-card" aria-busy={loading}>
                {error ? (
                    <div className="bm-state is-error">
                        <strong>Không tải được danh sách</strong>
                        <span>{error}</span>
                        <button type="button" onClick={() => setReloadToken((v) => v + 1)}>
                            Tải lại
                        </button>
                    </div>
                ) : !loading && items.length === 0 ? (
                    <div className="bm-state">
                        <strong>{hasFilter ? "Không có đơn nào khớp" : "Chưa có đơn đặt vé"}</strong>
                        <span>
                            {hasFilter
                                ? "Kiểm tra lại từ khoá, hoặc xoá bớt bộ lọc."
                                : "Đơn bán tại quầy và đơn online sẽ hiện ở đây."}
                        </span>
                        {hasFilter && (
                            <button type="button" onClick={clearFilters}>
                                Xoá bộ lọc
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="bm-table-scroll">
                        <table className="bm-table">
                            <thead>
                            <tr>
                                <th>Mã đặt vé</th>
                                <th>Khách</th>
                                <th>Phim và suất chiếu</th>
                                <th>Ghế</th>
                                <th className="is-num">Tổng tiền</th>
                                <th>Thanh toán</th>
                                <th>Trạng thái</th>
                                <th>Đặt lúc</th>
                            </tr>
                            </thead>

                            <tbody>
                            {loading && items.length === 0
                                ? Array.from({ length: 8 }).map((_, index) => (
                                    <tr key={index} className="bm-skeleton-row">
                                        {Array.from({ length: 8 }).map((__, col) => (
                                            <td key={col}>
                                                <i />
                                            </td>
                                        ))}
                                    </tr>
                                ))
                                : items.map((item) => {
                                    const show = formatDateTime(item.showtimeStart);
                                    const created = formatDateTime(item.createdAt);
                                    const channel = String(item.channel).toUpperCase();
                                    const extraSeats = item.seats.length - MAX_SEATS_SHOWN;

                                    return (
                                        <tr
                                            key={item.id}
                                            className={`bm-row is-${channel.toLowerCase()} ${loading ? "is-stale" : ""}`}
                                            tabIndex={0}
                                            onClick={() => setOpenId(item.id)}
                                            onKeyDown={(event) => onRowKeyDown(event, item.id)}
                                            aria-label={`Xem đơn ${item.bookingCode}`}
                                        >
                                            <td>
                                                <span className="bm-code">{item.bookingCode}</span>
                                                <span className={`bm-channel is-${channel.toLowerCase()}`}>
                                                          {CHANNEL_LABEL[channel] ?? item.channel}
                                                      </span>
                                            </td>

                                            <td>
                                                {item.customerName || item.customerPhone ? (
                                                    <>
                                                              <span className="bm-strong">
                                                                  {item.customerName || "Khách"}
                                                              </span>
                                                        <span className="bm-sub">{item.customerPhone ?? ""}</span>
                                                    </>
                                                ) : (
                                                    <span className="bm-muted">Khách vãng lai</span>
                                                )}
                                            </td>

                                            <td>
                                                      <span className="bm-strong bm-ellipsis" title={item.movieTitle}>
                                                          {item.movieTitle}
                                                      </span>
                                                <span className="bm-sub">
                                                          {show.time} {show.date}, {item.roomName}
                                                      </span>
                                            </td>

                                            <td>
                                                      <span className="bm-seats">
                                                          {item.seats.slice(0, MAX_SEATS_SHOWN).join(", ")}
                                                          {extraSeats > 0 && <b> +{extraSeats}</b>}
                                                      </span>
                                                <span className="bm-sub">{item.seats.length} vé</span>
                                            </td>

                                            <td className="is-num">
                                                <span className="bm-strong">{formatMoney(item.totalAmount)}</span>
                                                {item.discountAmount > 0 && (
                                                    <span className="bm-sub is-discount">
                                                              −{formatMoney(item.discountAmount)}
                                                          </span>
                                                )}
                                            </td>

                                            <td>
                                                <span>{paymentLabel(item.paymentMethod)}</span>
                                                {item.employeeName && (
                                                    <span className="bm-sub">{item.employeeName}</span>
                                                )}
                                            </td>

                                            <td>
                                                      <span className={`bm-status is-${statusTone(item.status)}`}>
                                                          {statusLabel(item.status)}
                                                      </span>
                                            </td>

                                            <td>
                                                <span>{created.time}</span>
                                                <span className="bm-sub">{created.date}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}

                {totalPages > 1 && !error && (
                    <nav className="bm-pagination" aria-label="Phân trang">
                        <button
                            type="button"
                            onClick={() => updateFilters({ page: page - 1 || null }, false)}
                            disabled={page <= 0 || loading}
                        >
                            Trang trước
                        </button>

                        <span>
                            Trang <b>{page + 1}</b> / {totalPages}
                        </span>

                        <button
                            type="button"
                            onClick={() => updateFilters({ page: page + 1 }, false)}
                            disabled={page >= totalPages - 1 || loading}
                        >
                            Trang sau
                        </button>
                    </nav>
                )}
            </section>

            <BookingDetailDrawer bookingId={openId} onClose={() => setOpenId(null)} />
        </div>
    );
}

export default BookingManagement;
