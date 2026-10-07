import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { ShowtimeData } from "../../types/showtime/showtime";
import type { ShowtimeSeat } from "../../types/showtimeSeat/showtimeSeat";
import { getShowtimeSeats } from "../../service/showtimeSeat/showtimeSeatService";
import { previewSale } from "../../service/counterSale/counterSaleService";
import {
    getSeatStates,
    hashHoldToken,
    holdSeats,
    releaseSeats,
    releaseSeatsOnUnload,
} from "../../service/seatHold/seatHoldService";
import type { SeatHoldDto, SeatStateDto } from "../../service/seatHold/seatHoldService";
import { useSeatSocket } from "../../service/seatHold/useSeatSocket";
import {
    cancelCounterOrder,
    clearCurrentOrder,
    createCounterOrder,
    enableGroupMode,
    extendCounterOrder,
    getCounterOrder,
    getCurrentOrderRef,
    parkCounterOrder,
    setCurrentOrder,
} from "../../service/counterOrder/counterOrderService";
import type { CounterOrderDto } from "../../service/counterOrder/counterOrderService";
import CounterSaleStepper from "./CounterSaleStepper";
import { ParkOrderDialog } from "./CounterSaleDialogs";

import "./CounterSaleSeats.css";

// Dự phòng khi chưa tải được đơn; giới hạn thật do server trả về (đơn thường 20, đơn đoàn không giới hạn).
const DEFAULT_MAX_SEATS = 20;
// Có WebSocket thì chỉ làm mới dự phòng; mất kết nối thì làm mới dày hơn.
const SEAT_REFRESH_ONLINE_MS = 60_000;
const SEAT_REFRESH_OFFLINE_MS = 15_000;
const PRICE_DEBOUNCE_MS = 250;
const NOTICE_DURATION_MS = 4_000;

type SeatState = "available" | "sold" | "held" | "blocked";
type SeatKind = "standard" | "vip" | "couple";

type PriceState = {
    total: number;
    discount: number;
    final: number;
};

// Trạng thái sống của 1 ghế (từ API seat-states + WebSocket).
type LiveSeat = {
    status: string;
    holdOwner: string | null;
    // Mốc hết hạn giữ theo đồng hồ máy này (ms), tính từ expiresInSeconds của server.
    expiresAt: number | null;
};

type RowCell =
    | { type: "seat"; seat: ShowtimeSeat }
    | { type: "gap"; key: string };

type SeatRow = {
    label: string;
    cells: RowCell[];
};

const EMPTY_PRICE: PriceState = { total: 0, discount: 0, final: 0 };

// Đánh dấu tạm "ghế của tab này" khi chưa băm xong token (crypto.subtle chạy bất đồng bộ).
// Nếu không có dấu này, ghế vừa giữ có thể bị coi là "mất" ngay khi mã băm tới sau.
const SELF_OWNER = "__self__";

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
    held: "Nơi khác đang giữ",
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

function getApiErrorMessage(err: unknown, fallback: string): string {
    const anyErr = err as { message?: string; response?: { status?: number; data?: unknown } };

    const status = anyErr?.response?.status;
    const data = anyErr?.response?.data;

    let message = "";

    if (typeof data === "string") {
        message = data;
    } else if (data && typeof data === "object") {
        const body = data as Record<string, unknown>;
        message = String(body.message ?? body.error ?? body.detail ?? "");
    }

    if (!message && err instanceof Error) message = err.message;

    message = message.trim() || fallback;

    // 409 = ghế bị nơi khác lấy trước: thông báo đã đủ rõ, không cần mã HTTP.
    return status && status !== 409 ? `${message} (HTTP ${status})` : message;
}

function toLive(dto: SeatStateDto, receivedAt: number): LiveSeat {
    return {
        status: dto.status,
        holdOwner: dto.holdOwner,
        expiresAt:
            dto.expiresInSeconds === null || dto.expiresInSeconds === undefined
                ? null
                : receivedAt + dto.expiresInSeconds * 1000,
    };
}

/* ============================================================
 * COMPONENT
 * ============================================================ */

function CounterSaleSeats() {
    const navigate = useNavigate();
    const location = useLocation();

    const showtime = location.state?.showtime as ShowtimeData | undefined;
    const showtimeId = showtime?.id;

    /* ---------- Đơn nháp: ghế giữ theo đơn, không theo tab ---------- */
    const [order, setOrder] = useState<CounterOrderDto | null>(null);
    const [orderError, setOrderError] = useState("");
    const [orderRetry, setOrderRetry] = useState(0);
    const orderPromiseRef = useRef<{ key: string; promise: Promise<CounterOrderDto> } | null>(null);
    const holdToken = order?.holdToken ?? null;
    const [myOwner, setMyOwner] = useState<string | null>(null);
    // Bản ref để các hàm async (giữ ghế) luôn đọc giá trị mới nhất, không bị closure cũ.
    const myOwnerRef = useRef<string | null>(null);
    myOwnerRef.current = myOwner;

    const [extending, setExtending] = useState(false);
    const [parkOpen, setParkOpen] = useState(false);
    const [parkBusy, setParkBusy] = useState(false);
    const [parkError, setParkError] = useState("");
    const [groupBusy, setGroupBusy] = useState(false);
    const lastClickedRef = useRef<ShowtimeSeat | null>(null);

    const [seats, setSeats] = useState<ShowtimeSeat[]>([]);
    const [live, setLive] = useState<Record<number, LiveSeat>>({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastUpdated, setLastUpdated] = useState<number | null>(null);

    // Ghế tab này đang giữ (server là nguồn chính, UI cập nhật lạc quan).
    const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>(() => {
        const initial = (location.state as { selectedSeatIds?: unknown } | null)?.selectedSeatIds;
        return Array.isArray(initial) ? initial.filter((id): id is number => typeof id === "number") : [];
    });
    const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(() => {
        const value = (location.state as { holdExpiresAt?: unknown } | null)?.holdExpiresAt;
        return typeof value === "number" ? value : null;
    });
    const [pendingIds, setPendingIds] = useState<number[]>([]);
    const pendingHoldRef = useRef<Set<number>>(new Set());
    // Ghế server vừa xác nhận là của tab này. Dùng ref (cập nhật ngay, đồng bộ) để kiểm tra
    // "ghế bị mất" không đọc nhầm trạng thái cũ trong lúc React chưa kịp render state mới.
    const confirmedMineRef = useRef<Set<number>>(new Set());
    const resumedRef = useRef(false);

    const [now, setNow] = useState(() => Date.now());

    const [price, setPrice] = useState<PriceState>(EMPTY_PRICE);
    const [priceLoading, setPriceLoading] = useState(false);
    const [priceError, setPriceError] = useState("");
    const [priceRetryToken, setPriceRetryToken] = useState(0);

    const [notice, setNotice] = useState("");

    const seatRequestRef = useRef(0);
    // Thời điểm quầy này giữ / nhả ghế gần nhất (để bỏ qua dữ liệu tải về đã cũ).
    const localChangeAtRef = useRef(0);
    // Đi tiếp sang trang xác nhận -> không nhả ghế khi rời trang.
    const continuingRef = useRef(false);

    useEffect(() => {
        if (!holdToken) return;
        hashHoldToken(holdToken).then(setMyOwner).catch(() => setMyOwner(null));
    }, [holdToken]);

    /*
     * Lấy / tạo đơn nháp cho suất này:
     * - Mở lại từ danh sách tạm gác (state.orderCode) hoặc quay lại từ trang xác nhận / F5
     *   -> dùng lại đơn DRAFT cùng suất.
     * - Còn lại -> tạo đơn mới. Đơn nháp của suất khác trong tab này bị huỷ (trả ghế).
     * Dùng chung 1 promise để StrictMode chạy effect 2 lần cũng không tạo 2 đơn.
     */
    useEffect(() => {
        if (!showtimeId) return;

        let alive = true;
        const key = `${showtimeId}:${orderRetry}`;

        if (!orderPromiseRef.current || orderPromiseRef.current.key !== key) {
            const wantedCode = (location.state as { orderCode?: string } | null)?.orderCode;
            const stored = getCurrentOrderRef();

            const promise = (async () => {
                const code = wantedCode ?? (stored && stored.showtimeId === showtimeId ? stored.code : null);

                if (code) {
                    const existing = await getCounterOrder(code).catch(() => null);

                    if (existing && existing.status === "DRAFT" && existing.showtimeId === showtimeId) {
                        return existing;
                    }
                }

                if (stored && stored.showtimeId !== showtimeId) {
                    cancelCounterOrder(stored.code).catch(() => undefined);
                }

                return createCounterOrder(showtimeId);
            })();

            orderPromiseRef.current = { key, promise };
        }

        setOrderError("");

        orderPromiseRef.current.promise
            .then((result) => {
                if (!alive) return;

                setCurrentOrder(result);
                setOrder(result);

                if (result.expiresInSeconds) {
                    setNow(Date.now());
                    setHoldExpiresAt(Date.now() + result.expiresInSeconds * 1000);
                    setSelectedSeatIds(result.heldSeatIds);
                }
            })
            .catch((err: unknown) => {
                if (alive) setOrderError(getApiErrorMessage(err, "Không tạo được đơn bán vé."));
            });

        return () => {
            alive = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showtimeId, orderRetry]);

    const maxSeats = order ? order.maxSeats : DEFAULT_MAX_SEATS;
    const isGroup = order?.mode === "GROUP";

    /* ================= TRẠNG THÁI SỐNG ================= */

    const mergeLive = useCallback((list: SeatStateDto[], replaceAll = false) => {
        const receivedAt = Date.now();

        // Server gửi trạng thái mới -> từ giờ tin server cho các ghế này.
        list.forEach((dto) => confirmedMineRef.current.delete(dto.showtimeSeatId));

        setLive((prev) => {
            const next: Record<number, LiveSeat> = replaceAll ? {} : { ...prev };
            list.forEach((dto) => {
                next[dto.showtimeSeatId] = toLive(dto, receivedAt);
            });
            return next;
        });
    }, []);

    const socketStatus = useSeatSocket(showtimeId, (list) => mergeLive(list));

    /* ================= LOAD / REFRESH ================= */

    const loadSeats = useCallback(
        async (silent: boolean) => {
            if (!showtimeId) return;

            const requestId = ++seatRequestRef.current;
            const startedAt = Date.now();

            if (!silent) {
                setLoading(true);
                setError("");
            }

            try {
                const [data, states] = await Promise.all([
                    getShowtimeSeats(showtimeId),
                    // Backend cũ chưa có API này -> vẫn chạy với trạng thái từ danh sách ghế.
                    getSeatStates(showtimeId).catch(() => null),
                ]);

                if (requestId !== seatRequestRef.current) return;

                setSeats(Array.isArray(data) ? data : []);

                // Trong lúc chờ phản hồi, quầy vừa giữ / nhả ghế -> dữ liệu này đã cũ,
                // ghi đè sẽ làm ghế vừa giữ bị coi là "mất". Bỏ qua và tải lại ngay sau đó.
                if (states && startedAt > localChangeAtRef.current) {
                    mergeLive(states, true);
                } else if (states) {
                    window.setTimeout(() => reloadRef.current(true), 800);
                }
                setLastUpdated(Date.now());
                setError("");
            } catch (err) {
                if (requestId !== seatRequestRef.current) return;

                console.error("Không thể tải sơ đồ ghế:", err);

                if (!silent) {
                    setError(getApiErrorMessage(err, "Không thể tải danh sách ghế."));
                }
            } finally {
                if (!silent) setLoading(false);
            }
        },
        [showtimeId, mergeLive]
    );

    const reloadRef = useRef(loadSeats);
    reloadRef.current = loadSeats;

    useEffect(() => {
        loadSeats(false);
    }, [loadSeats]);

    useEffect(() => {
        const ms = socketStatus === "online" ? SEAT_REFRESH_ONLINE_MS : SEAT_REFRESH_OFFLINE_MS;
        const id = window.setInterval(() => loadSeats(true), ms);
        return () => window.clearInterval(id);
    }, [loadSeats, socketStatus]);

    useEffect(() => () => {
        seatRequestRef.current += 1;
    }, []);

    /* ================= GHẾ: TRẠNG THÁI HIỂN THỊ ================= */

    const seatById = useMemo(() => {
        const map = new Map<number, ShowtimeSeat>();
        seats.forEach((seat) => map.set(seat.id, seat));
        return map;
    }, [seats]);

    const liveStatusOf = useCallback(
        (seat: ShowtimeSeat): { status: string; owner: string | null; expiresAt: number | null } => {
            const state = live[seat.id];
            const status = state?.status ?? seat.status;
            const expiresAt = state?.expiresAt ?? null;

            // Giữ đã quá hạn nhưng job server chưa kịp thu hồi -> coi như trống.
            if (String(status).toUpperCase() === "HELD" && expiresAt !== null && expiresAt <= now) {
                return { status: "AVAILABLE", owner: null, expiresAt: null };
            }

            return { status, owner: state?.holdOwner ?? null, expiresAt };
        },
        [live, now]
    );

    const isHeldByMe = useCallback(
        (seat: ShowtimeSeat) => {
            const { status, owner } = liveStatusOf(seat);
            return (
                String(status).toUpperCase() === "HELD" &&
                (owner === SELF_OWNER || (!!myOwner && owner === myOwner))
            );
        },
        [liveStatusOf, myOwner]
    );

    /* ================= KHÔI PHỤC GHẾ ĐANG GIỮ (quay lại / F5) ================= */

    useEffect(() => {
        if (resumedRef.current || !myOwner || seats.length === 0 || Object.keys(live).length === 0) return;

        resumedRef.current = true;

        const mine = seats.filter(isHeldByMe);

        setSelectedSeatIds(mine.map((seat) => seat.id));

        const expiries = mine
            .map((seat) => live[seat.id]?.expiresAt)
            .filter((value): value is number => typeof value === "number");

        setNow(Date.now());
        setHoldExpiresAt(expiries.length > 0 ? Math.min(...expiries) : null);
    }, [myOwner, seats, live, isHeldByMe]);

    /* ================= GHẾ BỊ MẤT (bán / hết hạn / nơi khác lấy) ================= */

    useEffect(() => {
        if (!myOwner || selectedSeatIds.length === 0) return;

        const lost = selectedSeatIds.filter((id) => {
            if (pendingHoldRef.current.has(id) || confirmedMineRef.current.has(id)) return false;

            const seat = seatById.get(id);
            if (!seat || !live[id]) return false; // chưa biết trạng thái sống -> chờ

            return !isHeldByMe(seat);
        });

        if (lost.length === 0) return;

        const codes = lost
            .map((id) => seatById.get(id))
            .filter((seat): seat is ShowtimeSeat => Boolean(seat))
            .map(seatCode);

        setSelectedSeatIds((current) => current.filter((id) => !lost.includes(id)));
        setNotice(`Ghế ${codes.join(", ")} không còn do quầy này giữ nên đã bị bỏ chọn.`);
    }, [live, myOwner, selectedSeatIds, seatById, isHeldByMe]);

    /* ================= ĐẾM NGƯỢC GIỮ GHẾ ================= */

    useEffect(() => {
        if (holdExpiresAt === null) return;

        const id = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(id);
    }, [holdExpiresAt]);

    const holdRemainingMs = holdExpiresAt === null ? null : holdExpiresAt - now;

    useEffect(() => {
        if (holdRemainingMs === null || holdRemainingMs > 0 || !showtimeId) return;

        setHoldExpiresAt(null);

        if (selectedSeatIds.length > 0) {
            setSelectedSeatIds([]);
            setNotice("Hết 5 phút giữ ghế, các ghế đã được trả lại. Vui lòng chọn lại.");
            releaseSeats(showtimeId).catch(() => undefined);
        }
    }, [holdRemainingMs, selectedSeatIds.length, showtimeId]);

    /* ================= NHẢ GHẾ KHI ĐÓNG TAB ================= */

    useEffect(() => {
        if (!showtimeId) return;

        function onBeforeUnload() {
            if (!continuingRef.current && selectedSeatIds.length > 0) {
                releaseSeatsOnUnload(showtimeId!);
            }
        }

        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [showtimeId, selectedSeatIds.length]);

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

        seats.forEach((seat) => {
            if (getSeatState(liveStatusOf(seat).status) === "available") available += 1;
            kinds.add(getSeatKind(seat.seatType));
        });

        return { available, total: seats.length, kinds };
    }, [seats, liveStatusOf]);

    const selectedSeats = useMemo(
        () =>
            selectedSeatIds
                .map((id) => seatById.get(id))
                .filter((seat): seat is ShowtimeSeat => Boolean(seat))
                .sort(compareSeat),
        [selectedSeatIds, seatById]
    );

    const selectedRows = useMemo(() => {
        const counts = new Map<string, number>();
        selectedSeats.forEach((seat) => counts.set(seat.rowLabel, (counts.get(seat.rowLabel) ?? 0) + 1));
        return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
    }, [selectedSeats]);

    /* ================= TÍNH GIÁ ================= */

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

    const hasPending = pendingIds.length > 0;
    const holdActive = holdRemainingMs !== null && holdRemainingMs > 0;

    const canContinue =
        selectedSeats.length > 0 && !priceLoading && !priceError && !hasPending && holdActive && !!order;

    /* ================= GIỮ / NHẢ ================= */

    function setPending(id: number, value: boolean) {
        setPendingIds((current) =>
            value ? [...current.filter((x) => x !== id), id] : current.filter((x) => x !== id)
        );
    }

    // Kết quả server là nguồn chính; cộng thêm các ghế đang chờ giữ để không bị "nháy".
    function applyHoldResult(result: SeatHoldDto) {
        if (result.heldSeatIds.length === 0 && pendingHoldRef.current.size === 0) {
            resetGroupMode();
        }

        const receivedAt = Date.now();
        localChangeAtRef.current = receivedAt;
        const held = new Set(result.heldSeatIds);

        confirmedMineRef.current = new Set(result.heldSeatIds);

        if (result.skippedSeats && result.skippedSeats.length > 0) {
            setNotice(`Bỏ qua ${result.skippedSeats.length} ghế đã có nơi khác giữ: ${result.skippedSeats.slice(0, 8).join(", ")}${result.skippedSeats.length > 8 ? "…" : ""}`);
        }

        // Đồng hồ `now` chỉ chạy khi đang giữ ghế -> trước lần giữ đầu tiên nó còn
        // là giá trị cũ (lúc mở trang). Cập nhật ngay để không hiện 5:08 rồi mới về 4:59.
        setNow(receivedAt);

        pendingHoldRef.current.forEach((id) => held.add(id));

        setSelectedSeatIds(Array.from(held));
        setHoldExpiresAt(result.heldSeatIds.length > 0 ? receivedAt + result.expiresInSeconds * 1000 : null);

        // Cập nhật lạc quan trạng thái sống của ghế mình (WebSocket sẽ gửi lại sau).
        const owner = myOwnerRef.current ?? SELF_OWNER;

        {
            setLive((prev) => {
                const next = { ...prev };
                result.heldSeatIds.forEach((id) => {
                    next[id] = {
                        status: "HELD",
                        holdOwner: owner,
                        expiresAt: receivedAt + result.expiresInSeconds * 1000,
                    };
                });
                return next;
            });
        }
    }

    async function toggleSeat(seat: ShowtimeSeat, event?: MouseEvent) {
        if (!showtimeId || pendingIds.includes(seat.id)) return;

        if (!order) {
            setNotice("Đang tạo đơn bán vé, vui lòng đợi…");
            return;
        }

        // Shift + bấm: chọn dải ghế liền nhau trong cùng hàng.
        const last = lastClickedRef.current;
        lastClickedRef.current = seat;

        if (event?.shiftKey && last && last.rowLabel === seat.rowLabel && last.id !== seat.id) {
            const [from, to] = [last.seatNumber, seat.seatNumber].sort((a, b) => a - b);
            const range = seats.filter(
                (item) => item.rowLabel === seat.rowLabel && item.seatNumber >= from && item.seatNumber <= to
            );
            await holdMany(range);
            return;
        }

        const isSelected = selectedSeatIds.includes(seat.id);

        if (isSelected) {
            setSelectedSeatIds((current) => current.filter((id) => id !== seat.id));
            setPending(seat.id, true);

            try {
                localChangeAtRef.current = Date.now();
                applyHoldResult(await releaseSeats(showtimeId, [seat.id]));
                markReleased([seat.id]);
            } catch (err) {
                // Nhả lỗi không nghiêm trọng: server tự thu hồi khi hết hạn.
                console.warn("Nhả ghế lỗi:", err);
            } finally {
                setPending(seat.id, false);
            }

            return;
        }

        if (getSeatState(liveStatusOf(seat).status) !== "available") return;

        if (maxSeats !== null && selectedSeatIds.length >= maxSeats) {
            setNotice(`Đơn thường tối đa ${maxSeats} ghế. Bấm "Bao rạp" để chọn nhiều hơn.`);
            return;
        }

        pendingHoldRef.current.add(seat.id);
        setSelectedSeatIds((current) => [...current, seat.id]);
        setPending(seat.id, true);

        try {
            localChangeAtRef.current = Date.now();
            const result = await holdSeats(showtimeId, [seat.id]);
            pendingHoldRef.current.delete(seat.id);
            applyHoldResult(result);
        } catch (err) {
            pendingHoldRef.current.delete(seat.id);
            setSelectedSeatIds((current) => current.filter((id) => id !== seat.id));
            setNotice(getApiErrorMessage(err, `Không giữ được ghế ${seatCode(seat)}.`));
            loadSeats(true);
        } finally {
            setPending(seat.id, false);
        }
    }

    // Ghế vừa nhả: hiện "trống" ngay, không chờ WebSocket / làm mới.
    function markReleased(ids: number[]) {
        ids.forEach((id) => confirmedMineRef.current.delete(id));
        setLive((prev) => {
            const next = { ...prev };
            ids.forEach((id) => {
                next[id] = { status: "AVAILABLE", holdOwner: null, expiresAt: null };
            });
            return next;
        });
    }

    // Bỏ hết ghế -> đơn quay về đơn thường (server cũng tự đổi), thẻ "Bao rạp" tắt.
    function resetGroupMode() {
        setOrder((current) =>
            current && current.mode === "GROUP"
                ? { ...current, mode: "NORMAL", maxSeats: DEFAULT_MAX_SEATS }
                : current
        );
    }

    async function releaseAll() {
        if (!showtimeId) return;

        markReleased(selectedSeatIds);
        resetGroupMode();
        setSelectedSeatIds([]);
        setHoldExpiresAt(null);

        try {
            await releaseSeats(showtimeId);
        } catch (err) {
            console.warn("Nhả ghế lỗi:", err);
        }
    }

    // Esc = bỏ chọn (nhả) tất cả.
    useEffect(() => {
        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") releaseAll();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [showtimeId]);

    /* ================= CHỌN NHIỀU GHẾ (cả hàng / dải / tất cả) ================= */

    // limit: giới hạn ghế dùng cho lần chọn này (mặc định theo đơn; bao rạp truyền null ngay
    // sau khi bật đơn đoàn, vì state `order` chưa kịp cập nhật).
    async function holdMany(targets: ShowtimeSeat[], limit: number | null = maxSeats) {
        if (!showtimeId || !order) return;

        const free = targets.filter(
            (seat) =>
                !selectedSeatIds.includes(seat.id) &&
                !pendingIds.includes(seat.id) &&
                getSeatState(liveStatusOf(seat).status) === "available"
        );

        if (free.length === 0) {
            setNotice("Không còn ghế trống trong vùng đã chọn.");
            return;
        }

        const room = limit === null ? free.length : limit - selectedSeatIds.length;

        if (room <= 0) {
            setNotice(`Đơn thường tối đa ${limit} ghế. Bấm "Bao rạp" để chọn nhiều hơn.`);
            return;
        }

        const picked = free.slice(0, room);
        const ids = picked.map((seat) => seat.id);

        ids.forEach((id) => pendingHoldRef.current.add(id));
        setSelectedSeatIds((current) => Array.from(new Set([...current, ...ids])));
        setPendingIds((current) => Array.from(new Set([...current, ...ids])));

        try {
            localChangeAtRef.current = Date.now();
            const result = await holdSeats(showtimeId, ids, true);
            ids.forEach((id) => pendingHoldRef.current.delete(id));
            applyHoldResult(result);

            if (picked.length < free.length) {
                setNotice(`Chỉ giữ được ${picked.length} ghế do giới hạn ${limit} ghế. Bấm "Bao rạp" để chọn thêm.`);
            }
        } catch (err) {
            ids.forEach((id) => pendingHoldRef.current.delete(id));
            setSelectedSeatIds((current) => current.filter((id) => !ids.includes(id)));
            setNotice(getApiErrorMessage(err, "Không giữ được các ghế đã chọn."));
            loadSeats(true);
        } finally {
            setPendingIds((current) => current.filter((id) => !ids.includes(id)));
        }
    }

    // Bấm nhãn hàng: giữ cả hàng; nếu cả hàng (phần còn trống) đã là của mình thì nhả cả hàng.
    async function toggleRow(rowLabel: string) {
        if (!showtimeId || !order) return;

        const rowSeats = seats.filter((seat) => seat.rowLabel === rowLabel);
        const mineInRow = rowSeats.filter((seat) => selectedSeatIds.includes(seat.id));
        const freeInRow = rowSeats.filter(
            (seat) => !selectedSeatIds.includes(seat.id) && getSeatState(liveStatusOf(seat).status) === "available"
        );

        if (freeInRow.length === 0 && mineInRow.length > 0) {
            const ids = mineInRow.map((seat) => seat.id);
            setSelectedSeatIds((current) => current.filter((id) => !ids.includes(id)));
            markReleased(ids);

            try {
                localChangeAtRef.current = Date.now();
                applyHoldResult(await releaseSeats(showtimeId, ids));
            } catch (err) {
                console.warn("Nhả ghế lỗi:", err);
            }

            return;
        }

        await holdMany(rowSeats);
    }

    /* ================= ĐƠN: GIA HẠN / TẠM GÁC / ĐƠN ĐOÀN ================= */

    function applyOrder(next: CounterOrderDto) {
        setOrder(next);

        if (next.expiresInSeconds) {
            setNow(Date.now());
            setHoldExpiresAt(Date.now() + next.expiresInSeconds * 1000);
        }
    }

    async function handleExtend() {
        if (!order || extending) return;

        setExtending(true);

        try {
            applyOrder(await extendCounterOrder(order.code));
            setNotice("Đã gia hạn thêm 2 phút.");
        } catch (err) {
            setNotice(getApiErrorMessage(err, "Không gia hạn được."));
        } finally {
            setExtending(false);
        }
    }

    async function handlePark(name: string, phone: string) {
        if (!order) return;

        setParkBusy(true);
        setParkError("");

        try {
            const parked = await parkCounterOrder(order.code, name, phone);
            continuingRef.current = true;
            clearCurrentOrder();
            navigate("/counter-sale", {
                state: { notice: `Đã tạm gác đơn ${parked.code} (${name}). Ghế được giữ 15 phút.` },
            });
        } catch (err) {
            setParkError(getApiErrorMessage(err, "Không tạm gác được đơn."));
        } finally {
            setParkBusy(false);
        }
    }

    // Đơn đoàn / bao rạp: 1 lần bấm -> bỏ giới hạn ghế và giữ luôn tất cả ghế còn trống.
    async function handleGroupSelectAll() {
        if (!order || groupBusy) return;

        setGroupBusy(true);

        try {
            if (order.mode !== "GROUP") {
                applyOrder(await enableGroupMode(order.code));
            }

            await holdMany(seats, null);
        } catch (err) {
            setNotice(getApiErrorMessage(err, "Không chọn được các ghế còn trống."));
        } finally {
            setGroupBusy(false);
        }
    }

    async function handleChangeShowtime() {
        if (order) {
            setSelectedSeatIds([]);
            setHoldExpiresAt(null);
            await cancelCounterOrder(order.code).catch(() => releaseSeats(showtimeId!).catch(() => undefined));
            clearCurrentOrder();
        } else {
            await releaseAll();
        }

        navigate("/counter-sale");
    }

    function handleContinue() {
        if (!canContinue) return;

        continuingRef.current = true;

        navigate("/counter-sale/confirm", {
            state: {
                showtime,
                selectedSeatIds: selectedSeats.map((seat) => seat.id),
                selectedSeats,
                price,
                holdExpiresAt,
                orderCode: order?.code,
            },
        });
    }

    /* ================= EMPTY ================= */

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

    /* ================= RENDER ================= */

    return (
        <div className="cs-seats-page">
            <CounterSaleStepper
                current={2}
                showtime={showtime}
                seatCodes={selectedSeats.map(seatCode)}
                orderCode={order?.code}
                isGroup={isGroup}
                holdExpiresAt={selectedSeats.length > 0 ? holdExpiresAt : null}
                extendsLeft={order ? order.maxExtends - order.extendCount : 0}
                extending={extending}
                onExtend={handleExtend}
                onPark={selectedSeats.length > 0 ? () => setParkOpen(true) : undefined}
                onStepClick={(step) => {
                    if (step === 1) handleChangeShowtime();
                }}
            />

            {orderError && (
                <div className="cs-order-error" role="alert">
                    <span>{orderError}</span>
                    <button type="button" className="cs-btn cs-btn-ghost" onClick={() => setOrderRetry((v) => v + 1)}>
                        Thử lại
                    </button>
                </div>
            )}

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

                                <span className={`cs-live is-${socketStatus}`}>
                                    {socketStatus === "online"
                                        ? "Trực tuyến"
                                        : socketStatus === "connecting"
                                            ? "Đang kết nối…"
                                            : "Mất kết nối, tự làm mới"}
                                </span>

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
                            <li><i className="cs-legend-seat is-selected" />Quầy này giữ</li>
                            <li><i className="cs-legend-seat is-held" />Nơi khác giữ</li>
                            <li><i className="cs-legend-seat is-sold" />Đã bán</li>
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
                                    <button type="button" className="cs-btn cs-btn-ghost" onClick={() => loadSeats(false)}>
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
                                            <button
                                                type="button"
                                                className="cs-row-label cs-row-toggle"
                                                onClick={() => toggleRow(row.label)}
                                                title={`Chọn / bỏ cả hàng ${row.label}`}
                                            >
                                                {row.label}
                                            </button>

                                            <div className="cs-row-seats">
                                                {row.cells.map((cell) => {
                                                    if (cell.type === "gap") {
                                                        return (
                                                            <span key={cell.key} className="cs-seat-gap" aria-hidden="true" />
                                                        );
                                                    }

                                                    const { seat } = cell;
                                                    const isSelected = selectedSeatIds.includes(seat.id);
                                                    const isPending = pendingIds.includes(seat.id);
                                                    const state: SeatState = isSelected
                                                        ? "available"
                                                        : getSeatState(liveStatusOf(seat).status);
                                                    const kind = getSeatKind(seat.seatType);

                                                    const className = [
                                                        "cs-seat",
                                                        `is-${state}`,
                                                        kind !== "standard" && `is-${kind}`,
                                                        isSelected && "is-selected",
                                                        isPending && "is-pending",
                                                    ]
                                                        .filter(Boolean)
                                                        .join(" ");

                                                    const label = `Ghế ${seatCode(seat)}, ${SEAT_KIND_LABEL[kind]}, ${
                                                        isSelected ? "Quầy này đang giữ" : SEAT_STATE_LABEL[state]
                                                    }`;

                                                    return (
                                                        <button
                                                            key={seat.id}
                                                            type="button"
                                                            className={className}
                                                            disabled={!isSelected && state !== "available"}
                                                            onClick={(event) => toggleSeat(seat, event)}
                                                            aria-pressed={isSelected}
                                                            aria-busy={isPending}
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
                            {selectedSeats.length}/{maxSeats ?? "∞"} ghế
                        </span>
                    </div>

                    <div className="cs-seat-tools">
                        <button
                            type="button"
                            className={`cs-tool-btn ${isGroup ? "is-gold" : ""}`}
                            onClick={handleGroupSelectAll}
                            disabled={!order || groupBusy}
                            title="Chọn tất cả ghế còn trống, không giới hạn số ghế"
                        >
                            {groupBusy ? "Đang chọn ghế…" : "Bao rạp"}
                        </button>
                        <small>Bấm nhãn hàng để chọn cả hàng · Shift + bấm để chọn dải ghế</small>
                    </div>

                    <div className="cs-summary-seats">
                        <div className="cs-summary-label">
                            <span>Ghế đang giữ</span>
                            {selectedSeats.length > 0 && (
                                <button type="button" className="cs-link" onClick={releaseAll}>
                                    Bỏ chọn tất cả
                                </button>
                            )}
                        </div>

                        {selectedSeats.length === 0 ? (
                            <p className="cs-summary-empty">
                                Bấm vào ghế trống để giữ ghế trong 5 phút.
                                <br />
                                <kbd>Esc</kbd> để bỏ chọn tất cả.
                            </p>
                        ) : (
                            selectedSeats.length > 20 ? (
                                // Đơn đoàn / bao rạp: gom theo hàng cho gọn, bấm × để bỏ cả hàng.
                                <ul className="cs-seat-chips">
                                    {selectedRows.map((row) => (
                                        <li key={row.label} className="cs-seat-chip is-row">
                                            <b>Hàng {row.label}</b>
                                            <small>{row.count} ghế</small>
                                            <button
                                                type="button"
                                                onClick={() => toggleRow(row.label)}
                                                aria-label={`Bỏ chọn hàng ${row.label}`}
                                            >
                                                ×
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <ul className="cs-seat-chips">
                                    {selectedSeats.map((seat) => {
                                        const kind = getSeatKind(seat.seatType);

                                        return (
                                            <li
                                                key={seat.id}
                                                className={`cs-seat-chip is-${kind} ${pendingIds.includes(seat.id) ? "is-pending" : ""}`}
                                            >
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
                            )
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
                            : hasPending
                                ? "Đang giữ ghế…"
                                : `Tiếp tục · ${selectedSeats.length} ghế`}
                        <span aria-hidden="true">→</span>
                    </button>
                </aside>
            </div>

            <ParkOrderDialog
                open={parkOpen}
                busy={parkBusy}
                error={parkError}
                initialName={order?.customerName ?? ""}
                initialPhone={order?.customerPhone ?? ""}
                onCancel={() => setParkOpen(false)}
                onSubmit={handlePark}
            />

        </div>
    );
}

export default CounterSaleSeats;
