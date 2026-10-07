import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { ShowtimeData } from "../../types/showtime/showtime";
import type { ShowtimeSeat } from "../../types/showtimeSeat/showtimeSeat";
import { sellTickets } from "../../service/counterSale/counterSaleService";
import {
    cancelCounterOrder,
    clearCurrentOrder,
    extendCounterOrder,
    getCounterOrder,
    getCurrentOrderRef,
    isValidPhone,
    listApplicablePromotions,
    normalizePhone,
    parkCounterOrder,
    previewSaleWithPromotion,
} from "../../service/counterOrder/counterOrderService";
import type { CounterOrderDto, PromotionQuoteDto } from "../../service/counterOrder/counterOrderService";
import CounterSaleStepper from "./CounterSaleStepper";
import { CustomerFields, ParkOrderDialog } from "./CounterSaleDialogs";
import {
    buildTransferNote,
    createVietQrPayment,
    isVietQrConfigured,
} from "../../service/payment/paymentService";
import type { QrPayment } from "../../service/payment/paymentService";
import {
    getHoldToken,
    releaseSeats,
    releaseSeatsOnUnload,
} from "../../service/seatHold/seatHoldService";

import "./CounterSaleConfirm.css";

/*
 * Class dùng tiền tố "cs-" và scope trong .cs-confirm-page
 * để không đụng CSS của trang khác (CSS trong Vite là global).
 */

// TODO: lấy từ thông tin đăng nhập của nhân viên (context / token).
const EMPLOYEE_ID = 1;


type PaymentMethod = "CASH" | "TRANSFER";

type PriceState = {
    total: number;
    discount: number;
    final: number;
};

type ConfirmLocationState = {
    showtime?: ShowtimeData;
    selectedSeatIds?: number[];
    selectedSeats?: ShowtimeSeat[];
    price?: PriceState;
    // Mốc hết hạn giữ ghế (ms theo đồng hồ máy này), truyền từ trang chọn ghế.
    holdExpiresAt?: number;
};

/*
 * Chuyển khoản chỉ dùng VietQR: khách quét bằng mọi app ngân hàng và cả app MoMo.
 * Không có xác nhận tự động -> nhân viên kiểm tra tài khoản rồi bấm "Đã nhận tiền".
 */
type QrState =
    | { phase: "idle" }
    | { phase: "ready"; payment: QrPayment }
    | { phase: "paid"; payment: QrPayment }
    | { phase: "failed"; message: string };

/* ============================================================
 * HELPERS
 * ============================================================ */

function formatMoney(value: number): string {
    return `${Math.round(value).toLocaleString("vi-VN")}đ`;
}

function formatTime(value?: string | null): string {
    if (!value) return "--:--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "--:--";

    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDateLabel(value?: string | null): string {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("vi-VN", {
        weekday: "long",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
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

function getSeatKindLabel(type?: string | null): string {
    const value = String(type ?? "").toUpperCase();

    if (/COUPLE|DOUBLE|SWEET/.test(value)) return "Ghế đôi";
    if (/VIP|PREMIUM/.test(value)) return "VIP";

    return "Thường";
}

function compareSeat(a: ShowtimeSeat, b: ShowtimeSeat): number {
    return (
        a.rowLabel.length - b.rowLabel.length ||
        a.rowLabel.localeCompare(b.rowLabel, "vi") ||
        a.seatNumber - b.seatNumber
    );
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

    if (!message && err instanceof Error) {
        message = err.message;
    }

    message = message.trim() || fallback;

    return status ? `${message} (HTTP ${status})` : message;
}

// Gợi ý tiền khách đưa: đúng số tiền + các mệnh giá làm tròn lên.
function getCashSuggestions(amount: number): number[] {
    if (amount <= 0) return [];

    const values = new Set<number>([amount]);

    [50_000, 100_000, 200_000, 500_000].forEach((step) => {
        values.add(Math.ceil(amount / step) * step);
    });

    return Array.from(values)
        .filter((value) => value >= amount)
        .sort((a, b) => a - b)
        .slice(0, 5);
}


/* ============================================================
 * CONFIRM MODAL
 * ============================================================ */

type ConfirmModalProps = {
    open: boolean;
    submitting: boolean;
    error: string;
    showtime: ShowtimeData;
    seats: ShowtimeSeat[];
    finalAmount: number;
    methodLabel: string;
    paymentLines: { label: string; value: string; strong?: boolean }[];
    onCancel: () => void;
    onConfirm: () => void;
};

function ConfirmModal({
                          open,
                          submitting,
                          error,
                          showtime,
                          seats,
                          finalAmount,
                          methodLabel,
                          paymentLines,
                          onCancel,
                          onConfirm,
                      }: ConfirmModalProps) {
    const confirmRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (!open) return;

        confirmRef.current?.focus();

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !submitting) onCancel();
        }

        window.addEventListener("keydown", onKeyDown);
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = previousOverflow;
        };
    }, [open, submitting, onCancel]);

    if (!open) return null;

    return (
        <div
            className="cs-modal-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !submitting) onCancel();
            }}
        >
            <div
                className="cs-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="cs-modal-title"
            >
                <div className="cs-modal-icon" aria-hidden="true">🎟</div>

                <h2 id="cs-modal-title">Xác nhận bán vé?</h2>
                <p className="cs-modal-sub">
                    Sau khi xác nhận, ghế sẽ được ghi nhận là đã bán và không thể hoàn tác tại quầy.
                </p>

                <div className="cs-modal-ticket">
                    <strong>{showtime.movieTitle}</strong>
                    <span>
                        {formatDateLabel(showtime.startTime)} · {formatTime(showtime.startTime)} –{" "}
                        {formatTime(showtime.endTime)}
                    </span>
                    <span>
                        {getRoomName(showtime)} · {getFormatLabel(showtime)} · {seats.length} ghế:{" "}
                        <b>{seats.map((seat) => `${seat.rowLabel}${seat.seatNumber}`).join(", ")}</b>
                    </span>
                </div>

                <dl className="cs-modal-lines">
                    <div>
                        <dt>Thanh toán</dt>
                        <dd>{methodLabel}</dd>
                    </div>

                    {paymentLines.map((line) => (
                        <div key={line.label} className={line.strong ? "is-strong" : ""}>
                            <dt>{line.label}</dt>
                            <dd>{line.value}</dd>
                        </div>
                    ))}

                    <div className="is-total">
                        <dt>Tổng thu</dt>
                        <dd>{formatMoney(finalAmount)}</dd>
                    </div>
                </dl>

                {error && (
                    <div className="cs-modal-error" role="alert">
                        {error}
                    </div>
                )}

                <div className="cs-modal-actions">
                    <button
                        type="button"
                        className="cs-btn cs-btn-ghost"
                        onClick={onCancel}
                        disabled={submitting}
                    >
                        Huỷ
                    </button>

                    <button
                        ref={confirmRef}
                        type="button"
                        className="cs-btn cs-btn-primary"
                        onClick={onConfirm}
                        disabled={submitting}
                    >
                        {submitting ? (
                            <>
                                <span className="cs-spinner" aria-hidden="true" />
                                Đang xử lý…
                            </>
                        ) : (
                            "Xác nhận bán"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ============================================================
 * PAGE
 * ============================================================ */

function CounterSaleConfirm() {
    const navigate = useNavigate();
    const location = useLocation();

    const state = (location.state ?? null) as ConfirmLocationState | null;
    const showtime = state?.showtime;

    const selectedSeats = useMemo(
        () => [...(state?.selectedSeats ?? [])].sort(compareSeat),
        [state?.selectedSeats]
    );

    const selectedSeatIds = useMemo(
        () => state?.selectedSeatIds ?? selectedSeats.map((seat) => seat.id),
        [state?.selectedSeatIds, selectedSeats]
    );

    /* ---------- Giá: dùng giá từ trang chọn ghế cho khỏi nháy 0đ, rồi tính lại ---------- */

    const [price, setPrice] = useState<PriceState>(
        state?.price ?? { total: 0, discount: 0, final: 0 }
    );
    const [priceLoading, setPriceLoading] = useState(false);
    const [priceError, setPriceError] = useState("");

    const showtimeId = showtime?.id;
    const holdToken = useMemo(() => getHoldToken(), []);

    /* ---------- Đơn nháp ---------- */

    const orderCode =
        (location.state as { orderCode?: string } | null)?.orderCode ?? getCurrentOrderRef()?.code ?? null;
    const [order, setOrder] = useState<CounterOrderDto | null>(null);
    const [extending, setExtending] = useState(false);
    const [parkOpen, setParkOpen] = useState(false);
    const [parkBusy, setParkBusy] = useState(false);
    const [parkError, setParkError] = useState("");
    const [notice, setNotice] = useState("");

    useEffect(() => {
        if (!orderCode) return;

        getCounterOrder(orderCode)
            .then((result) => {
                setOrder(result);

                if (result.customerName) setCustomerName((v) => v || result.customerName || "");
                if (result.customerPhone) setCustomerPhone((v) => v || result.customerPhone || "");
            })
            .catch(() => setOrder(null));
    }, [orderCode]);

    const isGroup = order?.mode === "GROUP";

    /* ---------- Khách hàng ---------- */

    const [customerName, setCustomerName] = useState("");
    const [customerPhone, setCustomerPhone] = useState("");

    const phoneFilled = customerPhone.trim() !== "";
    const phoneValid = !phoneFilled || isValidPhone(customerPhone);
    // Không bắt buộc; nếu có nhập SĐT thì phải đúng định dạng.
    const customerReady = phoneValid;

    /* ---------- Mã giảm giá ---------- */

    const [promoInput, setPromoInput] = useState("");
    const [appliedCode, setAppliedCode] = useState<string | null>(null);
    const [promotion, setPromotion] = useState<PromotionQuoteDto | null>(null);
    const [promoMessage, setPromoMessage] = useState("");
    const [promoList, setPromoList] = useState<PromotionQuoteDto[]>([]);

    /* ---------- Hạn giữ ghế ---------- */

    const [holdExpiresAt, setHoldExpiresAt] = useState<number | null>(
        typeof state?.holdExpiresAt === "number" ? state.holdExpiresAt : null
    );
    const [holdNow, setHoldNow] = useState(() => Date.now());
    const soldRef = useRef(false);

    useEffect(() => {
        const id = window.setInterval(() => setHoldNow(Date.now()), 1_000);
        return () => window.clearInterval(id);
    }, []);

    const holdRemainingMs = holdExpiresAt === null ? null : holdExpiresAt - holdNow;
    // Không có thông tin hạn (vào từ bản cũ) -> để backend tự kiểm tra khi bán.
    const holdExpired = holdRemainingMs !== null && holdRemainingMs <= 0;

    // Đóng tab khi chưa bán -> nhả ghế ngay, không bắt quầy khác chờ hết 5 phút.
    useEffect(() => {
        if (!showtimeId) return;

        function onBeforeUnload() {
            if (!soldRef.current) releaseSeatsOnUnload(showtimeId!);
        }

        window.addEventListener("beforeunload", onBeforeUnload);
        return () => window.removeEventListener("beforeunload", onBeforeUnload);
    }, [showtimeId]);

    useEffect(() => {
        if (!showtimeId || selectedSeatIds.length === 0) return;

        let cancelled = false;

        setPriceLoading(true);
        setPriceError("");

        previewSaleWithPromotion(showtimeId, selectedSeatIds, appliedCode)
            .then((data) => {
                if (cancelled) return;

                setPrice({
                    total: data.totalAmount,
                    discount: data.discountAmount,
                    final: data.finalAmount,
                });

                // Mã không áp được (hết hạn, chưa đủ tối thiểu…) -> gỡ mã, báo lý do.
                if (appliedCode && data.promotion && !data.promotion.valid) {
                    setPromoMessage(data.promotion.message);
                    setAppliedCode(null);
                    setPromotion(null);
                } else {
                    setPromotion(data.promotion?.valid ? data.promotion : null);
                }
            })
            .catch((err: unknown) => {
                if (cancelled) return;
                console.error("previewSale lỗi:", err);
                setPriceError(getApiErrorMessage(err, "Không tính được giá vé."));
            })
            .finally(() => {
                if (!cancelled) setPriceLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [showtimeId, selectedSeatIds, appliedCode]);

    // Gợi ý các mã đang dùng được cho đơn này (theo tiền vé trước giảm).
    useEffect(() => {
        if (price.total <= 0) return;

        let cancelled = false;

        listApplicablePromotions(price.total)
            .then((list) => {
                if (!cancelled) setPromoList(list.slice(0, 4));
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [price.total]);

    function applyPromotion(code: string) {
        const value = code.trim().toUpperCase();

        if (!value) return;

        setPromoMessage("");
        setPromoInput(value);
        setAppliedCode(value);
    }

    function removePromotion() {
        setAppliedCode(null);
        setPromotion(null);
        setPromoMessage("");
        setPromoInput("");
    }

    /* ---------- Phương thức thanh toán ---------- */

    const [method, setMethod] = useState<PaymentMethod>("CASH");

    // Tiền mặt
    const [cashInput, setCashInput] = useState("");
    const cashReceived = Number(cashInput.replace(/\D/g, "")) || 0;
    const cashChange = cashReceived - price.final;
    const cashSuggestions = useMemo(() => getCashSuggestions(price.final), [price.final]);

    // VietQR
    const [qr, setQr] = useState<QrState>({ phase: "idle" });
    const [qrImageFailed, setQrImageFailed] = useState(false);

    // Nội dung chuyển khoản cố định cho cả đơn: tạo lại mã không đổi nội dung,
    // khách đã chuyển theo mã cũ vẫn đối soát được.
    const transferNote = useMemo(
        () => (showtimeId ? buildTransferNote(showtimeId) : ""),
        [showtimeId]
    );

    const createQr = useCallback(() => {
        if (!showtimeId || price.final <= 0) return;

        setQrImageFailed(false);

        if (!isVietQrConfigured()) {
            setQr({
                phase: "failed",
                message:
                    "Chưa cấu hình tài khoản nhận tiền VietQR (VITE_VIETQR_BANK_ID, VITE_VIETQR_ACCOUNT_NO).",
            });
            return;
        }

        setQr({ phase: "ready", payment: createVietQrPayment(price.final, transferNote) });
    }, [showtimeId, price.final, transferNote]);

    // Chọn chuyển khoản -> tạo mã ngay, không cần bấm thêm.
    // Giá thay đổi (tính lại xong) khi chưa nhận tiền -> tạo lại mã đúng số tiền.
    useEffect(() => {
        if (method !== "TRANSFER" || priceLoading || priceError) return;
        if (qr.phase === "paid") return;
        if (qr.phase === "ready" && qr.payment.amount === price.final) return;

        createQr();
    }, [method, priceLoading, priceError, price.final, qr, createQr]);

    function handleManualPaid() {
        if (qr.phase === "ready") {
            setQr({ phase: "paid", payment: qr.payment });
        }
    }

    // Bấm nhầm "Đã nhận tiền" -> hoàn tác trước khi bán.
    function handleUndoPaid() {
        if (qr.phase === "paid" && !submitting) {
            setQr({ phase: "ready", payment: qr.payment });
        }
    }

    function handleChangeMethod(next: PaymentMethod) {
        if (qr.phase === "paid") return; // đã nhận tiền QR thì khoá phương thức
        setMethod(next);
    }

    /* ---------- Điều kiện bán ---------- */

    const paymentReady =
        method === "CASH" ? cashReceived >= price.final : qr.phase === "paid";

    const canSell =
        Boolean(showtime) &&
        !holdExpired &&
        selectedSeatIds.length > 0 &&
        price.final >= 0 &&
        !priceLoading &&
        !priceError &&
        customerReady &&
        paymentReady;

    const blockReason = holdExpired
        ? "Hết thời gian giữ ghế"
        : !phoneValid
            ? "Số điện thoại khách không hợp lệ"
            : priceLoading
                ? "Đang tính giá…"
                : priceError
                    ? "Chưa tính được giá vé"
                    : method === "CASH"
                        ? cashReceived < price.final
                            ? cashInput
                                ? `Khách đưa còn thiếu ${formatMoney(price.final - cashReceived)}`
                                : "Nhập số tiền khách đưa"
                            : ""
                        : qr.phase === "paid"
                            ? ""
                            : qr.phase === "ready"
                                ? "Kiểm tra tài khoản đã nhận tiền rồi bấm “Đã nhận tiền”"
                                : "Chưa tạo được mã chuyển khoản";

    /* ---------- Modal + bán ---------- */

    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState("");

    const closeModal = useCallback(() => {
        setModalOpen(false);
        setSubmitError("");
    }, []);

    async function handleSell() {
        if (!showtime || !canSell || submitting) return;

        try {
            setSubmitting(true);
            setSubmitError("");

            const paidPayment = qr.phase === "paid" ? qr.payment : null;

            // Biến riêng (không phải object literal) để thêm trường mới mà
            // không vướng kiểm tra "excess property" của kiểu request cũ.
            const request = {
                showtimeId: showtime.id,
                showtimeSeatIds: selectedSeatIds,
                // Giữ để khớp kiểu request cũ; server dùng promotionCode.
                promotionId: null,
                paymentMethod: method,
                // Server tự kiểm tra lại mã, tính tiền giảm và trừ lượt dùng.
                promotionCode: appliedCode,
                customerName: customerName.trim() || null,
                customerPhone: phoneFilled ? normalizePhone(customerPhone) : null,
                // Ghế phải đang do chính tab này giữ.
                holdToken,
                // Tiền mặt: lưu tiền khách đưa, server tự tính và lưu tiền thối.
                ...(method === "CASH" ? { cashReceived } : {}),
                // Chuyển khoản: lưu nội dung chuyển khoản để cuối ngày đối soát sao kê.
                ...(method === "TRANSFER" && paidPayment
                    ? {
                        paymentProvider: "VIETQR",
                        paymentReference: paidPayment.transferNote ?? paidPayment.reference,
                    }
                    : {}),
            };

            const response = await sellTickets(request, EMPLOYEE_ID);

            soldRef.current = true;
            // Đơn đã bán xong: tab bắt đầu đơn mới cho khách tiếp theo.
            clearCurrentOrder();

            navigate("/counter-sale/result", {
                replace: true,
                state: {
                    response,
                    showtime,
                    selectedSeats,
                    price,
                    promotion,
                    customer: {
                        name: customerName.trim() || null,
                        phone: phoneFilled ? normalizePhone(customerPhone) : null,
                    },
                    payment: {
                        method,
                        provider: paidPayment ? "VIETQR" : undefined,
                        reference: paidPayment?.reference,
                        cashReceived: method === "CASH" ? cashReceived : undefined,
                        cashChange: method === "CASH" ? cashChange : undefined,
                    },
                },
            });
        } catch (err) {
            console.error("Bán vé lỗi:", err);
            setSubmitError(getApiErrorMessage(err, "Không thể xác nhận bán vé."));
        } finally {
            setSubmitting(false);
        }
    }

    function handleBack() {
        navigate("/counter-sale/seats", {
            state: { showtime, selectedSeatIds, holdExpiresAt, orderCode },
        });
    }

    // Khách đổi ý: huỷ đơn, nhả ghế ngay cho quầy khác / khách online.
    async function handleCancelOrder() {
        if (orderCode) {
            await cancelCounterOrder(orderCode).catch(() =>
                showtimeId ? releaseSeats(showtimeId).catch(() => undefined) : undefined
            );
        } else if (showtimeId) {
            await releaseSeats(showtimeId).catch(() => undefined);
        }

        soldRef.current = true; // không gửi thêm yêu cầu nhả ghế khi rời trang
        clearCurrentOrder();
        navigate("/counter-sale", { replace: true });
    }

    async function handleExtend() {
        if (!orderCode || extending) return;

        setExtending(true);

        try {
            const next = await extendCounterOrder(orderCode);
            setOrder(next);

            if (next.expiresInSeconds) setHoldExpiresAt(Date.now() + next.expiresInSeconds * 1000);
            setNotice("Đã gia hạn thêm 2 phút.");
        } catch (err) {
            setNotice(getApiErrorMessage(err, "Không gia hạn được."));
        } finally {
            setExtending(false);
        }
    }

    async function handlePark(name: string, phone: string) {
        if (!orderCode) return;

        setParkBusy(true);
        setParkError("");

        try {
            const parked = await parkCounterOrder(orderCode, name, phone);
            soldRef.current = true; // ghế vẫn giữ cho đơn tạm gác, không nhả khi rời trang
            clearCurrentOrder();
            navigate("/counter-sale", {
                replace: true,
                state: { notice: `Đã tạm gác đơn ${parked.code} (${name}). Ghế được giữ 15 phút.` },
            });
        } catch (err) {
            setParkError(getApiErrorMessage(err, "Không tạm gác được đơn."));
        } finally {
            setParkBusy(false);
        }
    }

    useEffect(() => {
        if (!notice) return;
        const id = window.setTimeout(() => setNotice(""), 4_000);
        return () => window.clearTimeout(id);
    }, [notice]);

    function handleReselect() {
        navigate("/counter-sale/seats", { state: { showtime } });
    }

    function handleCashChange(event: ChangeEvent<HTMLInputElement>) {
        const digits = event.target.value.replace(/\D/g, "").slice(0, 10);
        setCashInput(digits ? Number(digits).toLocaleString("vi-VN") : "");
    }

    function handlePosterError(event: SyntheticEvent<HTMLImageElement>) {
        event.currentTarget.classList.add("is-broken");
    }

    /* ---------- Empty ---------- */

    if (!showtime || selectedSeatIds.length === 0) {
        return (
            <div className="cs-confirm-page">
                <div className="cs-confirm-empty">
                    <span aria-hidden="true">🎟</span>
                    <h2>Không có thông tin bán vé</h2>
                    <p>Chọn phim, suất chiếu và ghế trước khi xác nhận.</p>
                    <button
                        type="button"
                        className="cs-btn cs-btn-primary"
                        onClick={() => navigate("/counter-sale")}
                    >
                        ← Về trang bán vé
                    </button>
                </div>
            </div>
        );
    }

    const methodLabel = method === "CASH" ? "Tiền mặt" : "Chuyển khoản · VietQR";

    const orderLines = [
        ...(customerName.trim() || phoneFilled
            ? [
                {
                    label: "Khách",
                    value: [customerName.trim(), phoneFilled ? normalizePhone(customerPhone) : ""]
                        .filter(Boolean)
                        .join(" · "),
                },
            ]
            : []),
        ...(promotion ? [{ label: `Mã ${promotion.code}`, value: `−${formatMoney(promotion.discountAmount)}` }] : []),
    ];

    const paymentLines =
        method === "CASH"
            ? [
                { label: "Khách đưa", value: formatMoney(cashReceived) },
                { label: "Tiền thối", value: formatMoney(Math.max(0, cashChange)), strong: true },
            ]
            : qr.phase === "paid"
                ? [{ label: "Nội dung CK", value: qr.payment.transferNote ?? qr.payment.reference }]
                : [];

    /* ---------- Render ---------- */

    return (
        <div className="cs-confirm-page">
            {/* ================= HEADER ================= */}

            <CounterSaleStepper
                current={3}
                showtime={showtime}
                seatCodes={selectedSeats.map((seat) => `${seat.rowLabel}${seat.seatNumber}`)}
                orderCode={orderCode}
                isGroup={isGroup}
                holdExpiresAt={holdExpired ? null : holdExpiresAt}
                extendsLeft={order ? order.maxExtends - order.extendCount : 0}
                extending={extending}
                onExtend={orderCode && qr.phase !== "paid" ? handleExtend : undefined}
                onPark={orderCode && qr.phase !== "paid" && !submitting ? () => setParkOpen(true) : undefined}
                onStepClick={(step) => {
                    if (submitting || qr.phase === "paid") return;
                    if (step === 1) handleCancelOrder();
                    if (step === 2) handleBack();
                }}
            />

            {notice && (
                <div className="cs-confirm-notice" role="status">
                    {notice}
                </div>
            )}

            {holdExpired && (
                <div className="cs-hold-expired" role="alert">
                    <div>
                        <strong>Hết thời gian giữ ghế</strong>
                        <span>Ghế đã được trả lại. Chọn lại ghế để tiếp tục bán cho khách.</span>
                    </div>
                    <button type="button" className="cs-btn cs-btn-primary" onClick={handleReselect}>
                        Chọn lại ghế
                    </button>
                </div>
            )}

            <div className="cs-confirm-body">
                {/* ================= LEFT: ORDER ================= */}

                <section className="cs-card cs-order">
                    <div className="cs-order-movie">
                        <div className="cs-order-poster">
                            {showtime.posterUrl && (
                                <img src={showtime.posterUrl} alt="" onError={handlePosterError} />
                            )}
                        </div>

                        <div className="cs-order-info">
                            <h2>{showtime.movieTitle}</h2>

                            <dl>
                                <div>
                                    <dt>Ngày</dt>
                                    <dd>{formatDateLabel(showtime.startTime)}</dd>
                                </div>
                                <div>
                                    <dt>Suất</dt>
                                    <dd className="is-time">
                                        {formatTime(showtime.startTime)} – {formatTime(showtime.endTime)}
                                    </dd>
                                </div>
                                <div>
                                    <dt>Phòng</dt>
                                    <dd>
                                        <span className="cs-chip cs-chip-red">{getRoomName(showtime)}</span>
                                        <span className="cs-chip">{getFormatLabel(showtime)}</span>
                                    </dd>
                                </div>
                            </dl>
                        </div>
                    </div>

                    <div className="cs-order-seats">
                        <div className="cs-section-label">
                            <span>Ghế</span>
                            <b>{selectedSeats.length} ghế</b>
                        </div>

                        <ul>
                            {selectedSeats.map((seat) => {
                                const kind = getSeatKindLabel(seat.seatType);

                                return (
                                    <li key={seat.id} className={kind === "VIP" ? "is-vip" : ""}>
                                        <b>
                                            {seat.rowLabel}
                                            {seat.seatNumber}
                                        </b>
                                        <small>{kind}</small>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>

                    {/* ---------- Khách hàng ---------- */}

                    <div className="cs-order-block">
                        <div className="cs-section-label">
                            <span>Khách hàng</span>
                            {isGroup && <b className="cs-badge-gold">Bao rạp</b>}
                        </div>

                        <CustomerFields
                            name={customerName}
                            phone={customerPhone}
                            onNameChange={setCustomerName}
                            onPhoneChange={setCustomerPhone}
                        />
                    </div>

                    {/* ---------- Mã giảm giá ---------- */}

                    <div className="cs-order-block">
                        <div className="cs-section-label">
                            <span>Mã giảm giá</span>
                        </div>

                        {appliedCode && promotion ? (
                            <div className="cs-promo-applied">
                                <div>
                                    <b>{promotion.code}</b>
                                    <span>{promotion.title}</span>
                                </div>
                                <strong>−{formatMoney(promotion.discountAmount)}</strong>
                                <button type="button" onClick={removePromotion} aria-label="Gỡ mã giảm giá">
                                    ×
                                </button>
                            </div>
                        ) : (
                            <>
                                <form
                                    className="cs-promo-form"
                                    onSubmit={(event) => {
                                        event.preventDefault();
                                        applyPromotion(promoInput);
                                    }}
                                >
                                    <input
                                        value={promoInput}
                                        onChange={(event) => setPromoInput(event.target.value.toUpperCase())}
                                        placeholder="Nhập mã, vd FAMILY20"
                                        aria-label="Mã giảm giá"
                                        disabled={qr.phase === "paid"}
                                    />
                                    <button
                                        type="submit"
                                        disabled={!promoInput.trim() || priceLoading || qr.phase === "paid"}
                                    >
                                        {appliedCode && priceLoading ? "Đang kiểm tra…" : "Áp dụng"}
                                    </button>
                                </form>

                                {promoMessage && <p className="cs-promo-message">{promoMessage}</p>}

                                {promoList.length > 0 && qr.phase !== "paid" && (
                                    <div className="cs-promo-suggest">
                                        {promoList.map((item) => (
                                            <button
                                                key={item.code ?? item.promotionId}
                                                type="button"
                                                onClick={() => item.code && applyPromotion(item.code)}
                                                title={item.title ?? undefined}
                                            >
                                                <b>{item.code}</b>
                                                <span>−{formatMoney(item.discountAmount)}</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    <div className={`cs-order-price ${priceLoading ? "is-loading" : ""}`}>
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
                        <div className="cs-order-total">
                            <span>Tổng thanh toán</span>
                            <strong>{priceLoading ? "Đang tính…" : formatMoney(price.final)}</strong>
                        </div>

                        {priceError && (
                            <p className="cs-inline-error" role="alert">
                                {priceError}
                            </p>
                        )}
                    </div>
                </section>

                {/* ================= RIGHT: PAYMENT ================= */}

                <section className="cs-card cs-payment">
                    <h2>Phương thức thanh toán</h2>

                    <div className="cs-method-tabs" role="radiogroup" aria-label="Phương thức thanh toán">
                        <button
                            type="button"
                            role="radio"
                            aria-checked={method === "CASH"}
                            className={`cs-method ${method === "CASH" ? "is-active" : ""}`}
                            onClick={() => handleChangeMethod("CASH")}
                            disabled={qr.phase === "paid"}
                        >
                            <span className="cs-method-icon" aria-hidden="true">💵</span>
                            <span>
                                <b>Tiền mặt</b>
                                <small>Thu tại quầy</small>
                            </span>
                        </button>

                        <button
                            type="button"
                            role="radio"
                            aria-checked={method === "TRANSFER"}
                            className={`cs-method ${method === "TRANSFER" ? "is-active" : ""}`}
                            onClick={() => handleChangeMethod("TRANSFER")}
                        >
                            <span className="cs-method-icon" aria-hidden="true">▦</span>
                            <span>
                                <b>Chuyển khoản QR</b>
                                <small>VietQR · App ngân hàng, MoMo</small>
                            </span>
                        </button>
                    </div>

                    {/* ---------- CASH ---------- */}

                    {method === "CASH" && (
                        <div className="cs-cash">
                            <label className="cs-cash-field">
                                <span>Tiền khách đưa</span>
                                <div>
                                    <input
                                        inputMode="numeric"
                                        autoComplete="off"
                                        placeholder="0"
                                        value={cashInput}
                                        onChange={handleCashChange}
                                        aria-label="Tiền khách đưa"
                                    />
                                    <i>đ</i>
                                </div>
                            </label>

                            <div className="cs-cash-quick">
                                {cashSuggestions.map((value) => (
                                    <button
                                        key={value}
                                        type="button"
                                        className={cashReceived === value ? "is-active" : ""}
                                        onClick={() => setCashInput(value.toLocaleString("vi-VN"))}
                                    >
                                        {value === price.final ? "Đủ tiền" : formatMoney(value)}
                                    </button>
                                ))}
                            </div>

                            <div
                                className={`cs-cash-change ${
                                    !cashInput ? "" : cashChange >= 0 ? "is-ok" : "is-short"
                                }`}
                            >
                                <span>{cashChange >= 0 || !cashInput ? "Tiền thối lại" : "Còn thiếu"}</span>
                                <strong>
                                    {cashInput ? formatMoney(Math.abs(cashChange)) : "—"}
                                </strong>
                            </div>
                        </div>
                    )}

                    {/* ---------- QR ---------- */}

                    {method === "TRANSFER" && (
                        <div className="cs-qr">
                            <div className="cs-qr-stage">
                                {qr.phase === "idle" && (
                                    <div className="cs-qr-placeholder">
                                        <span className="cs-spinner is-large" aria-hidden="true" />
                                        <p>Đang tạo mã chuyển khoản…</p>
                                    </div>
                                )}

                                {qr.phase === "failed" && (
                                    <div className="cs-qr-placeholder is-error">
                                        <span aria-hidden="true">!</span>
                                        <p>{qr.message}</p>
                                        <button type="button" className="cs-btn cs-btn-ghost" onClick={createQr}>
                                            Thử lại
                                        </button>
                                    </div>
                                )}

                                {(qr.phase === "ready" || qr.phase === "paid") && (
                                    <div className={`cs-qr-ready ${qr.phase === "paid" ? "is-paid" : ""}`}>
                                        <div className="cs-qr-code">
                                            {qrImageFailed ? (
                                                <div className="cs-qr-image-error">
                                                    <p>Không tải được ảnh mã QR. Kiểm tra kết nối internet.</p>
                                                    <button type="button" className="cs-link" onClick={createQr}>
                                                        Tải lại mã
                                                    </button>
                                                </div>
                                            ) : (
                                                <img
                                                    key={qr.payment.qrImageUrl}
                                                    src={qr.payment.qrImageUrl}
                                                    alt="Mã QR chuyển khoản"
                                                    onError={() => setQrImageFailed(true)}
                                                />
                                            )}

                                            {qr.phase === "paid" && (
                                                <div className="cs-qr-paid-overlay">
                                                    <span aria-hidden="true">✓</span>
                                                    <b>Đã nhận tiền</b>
                                                </div>
                                            )}
                                        </div>

                                        <div className="cs-qr-detail">
                                            <div className="cs-qr-amount">
                                                <span>Số tiền</span>
                                                <strong>{formatMoney(qr.payment.amount)}</strong>
                                            </div>

                                            <dl>
                                                {qr.payment.bankName && (
                                                    <div>
                                                        <dt>Ngân hàng</dt>
                                                        <dd>{qr.payment.bankName}</dd>
                                                    </div>
                                                )}
                                                <div>
                                                    <dt>Số TK</dt>
                                                    <dd>{qr.payment.accountNo}</dd>
                                                </div>
                                                {qr.payment.accountName && (
                                                    <div>
                                                        <dt>Chủ TK</dt>
                                                        <dd>{qr.payment.accountName}</dd>
                                                    </div>
                                                )}
                                                <div>
                                                    <dt>Nội dung</dt>
                                                    <dd className="is-code">{qr.payment.transferNote}</dd>
                                                </div>
                                            </dl>

                                            {qr.phase === "ready" && (
                                                <>
                                                    <p className="cs-qr-hint">
                                                        Khách quét bằng app ngân hàng hoặc app MoMo. Kiểm tra đúng số tiền
                                                        và nội dung trong thông báo nhận tiền trước khi xác nhận.
                                                    </p>

                                                    <button
                                                        type="button"
                                                        className="cs-btn cs-btn-success"
                                                        onClick={handleManualPaid}
                                                    >
                                                        ✓ Đã nhận tiền
                                                    </button>
                                                </>
                                            )}

                                            {qr.phase === "paid" && (
                                                <>
                                                    <p className="cs-qr-status is-paid">
                                                        Đã xác nhận nhận tiền. Bấm “Bán vé” để xuất vé.
                                                    </p>
                                                    <button
                                                        type="button"
                                                        className="cs-link"
                                                        onClick={handleUndoPaid}
                                                        disabled={submitting}
                                                    >
                                                        Hoàn tác (chưa nhận được tiền)
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </section>
            </div>

            {/* ================= ACTION BAR ================= */}

            <div className="cs-confirm-action">
                <div className="cs-confirm-action-info">
                    <span>Tổng thu</span>
                    <strong>{formatMoney(price.final)}</strong>
                    {blockReason && <small>{blockReason}</small>}
                </div>

                <button
                    type="button"
                    className="cs-btn cs-btn-ghost cs-cancel-order"
                    onClick={handleCancelOrder}
                    disabled={submitting || qr.phase === "paid"}
                    title={qr.phase === "paid" ? "Khách đã thanh toán, không thể huỷ tại đây" : "Huỷ đơn và trả ghế"}
                >
                    Huỷ đơn
                </button>

                <button
                    type="button"
                    className="cs-btn cs-btn-primary cs-sell-button"
                    disabled={!canSell}
                    onClick={() => setModalOpen(true)}
                >
                    Bán vé
                    <span aria-hidden="true">→</span>
                </button>
            </div>

            <ConfirmModal
                open={modalOpen}
                submitting={submitting}
                error={submitError}
                showtime={showtime}
                seats={selectedSeats}
                finalAmount={price.final}
                methodLabel={methodLabel}
                paymentLines={[...orderLines, ...paymentLines]}
                onCancel={closeModal}
                onConfirm={handleSell}
            />

            <ParkOrderDialog
                open={parkOpen}
                busy={parkBusy}
                error={parkError}
                initialName={customerName}
                initialPhone={customerPhone}
                onCancel={() => setParkOpen(false)}
                onSubmit={handlePark}
            />
        </div>
    );
}

export default CounterSaleConfirm;
