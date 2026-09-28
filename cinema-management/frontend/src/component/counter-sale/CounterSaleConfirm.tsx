import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, CSSProperties, SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

import type { ShowtimeData } from "../../types/showtime/showtime";
import type { ShowtimeSeat } from "../../types/showtimeSeat/showtimeSeat";
import { previewSale, sellTickets } from "../../service/counterSale/counterSaleService";
import {
    buildTransferNote,
    cancelQrPayment,
    createGatewayQrPayment,
    createVietQrPayment,
    getQrPaymentStatus,
    isVietQrConfigured,
} from "../../service/payment/paymentService";
import type { QrPayment, QrProvider } from "../../service/payment/paymentService";

import "./CounterSaleConfirm.css";


// TODO: lấy từ thông tin đăng nhập của nhân viên (context / token).
const EMPLOYEE_ID = 1;

const QR_POLL_MS = 3_000;

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
};

type QrState =
    | { phase: "idle" }
    | { phase: "creating"; provider: QrProvider }
    | { phase: "ready"; payment: QrPayment }
    | { phase: "paid"; payment: QrPayment }
    | { phase: "failed"; provider: QrProvider; message: string; payment?: QrPayment };

const QR_PROVIDERS: {
    id: QrProvider;
    name: string;
    hint: string;
    color: string;
}[] = [
    { id: "MOMO", name: "MoMo", hint: "Ví MoMo · tự xác nhận", color: "#a50064" },
    { id: "VNPAY", name: "VNPay", hint: "VNPAY-QR · tự xác nhận", color: "#005baa" },
    { id: "VIETQR", name: "VietQR", hint: "Mọi app ngân hàng · xác nhận tay", color: "#0f8a5f" },
];

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

function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.floor(ms / 1000));
    const minutes = Math.floor(total / 60);
    const seconds = total % 60;
    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

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


    const [price, setPrice] = useState<PriceState>(
        state?.price ?? { total: 0, discount: 0, final: 0 }
    );
    const [priceLoading, setPriceLoading] = useState(false);
    const [priceError, setPriceError] = useState("");

    const showtimeId = showtime?.id;

    useEffect(() => {
        if (!showtimeId || selectedSeatIds.length === 0) return;

        let cancelled = false;

        setPriceLoading(true);
        setPriceError("");

        previewSale(showtimeId, selectedSeatIds)
            .then((data) => {
                if (cancelled) return;

                setPrice({
                    total: Number(data.totalAmount) || 0,
                    discount: Number(data.discountAmount) || 0,
                    final: Number(data.finalAmount) || 0,
                });
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
    }, [showtimeId, selectedSeatIds]);

    /* ---------- Phương thức thanh toán ---------- */

    const [method, setMethod] = useState<PaymentMethod>("CASH");

    // Tiền mặt
    const [cashInput, setCashInput] = useState("");
    const cashReceived = Number(cashInput.replace(/\D/g, "")) || 0;
    const cashChange = cashReceived - price.final;
    const cashSuggestions = useMemo(() => getCashSuggestions(price.final), [price.final]);

    // QR
    const [qrProvider, setQrProvider] = useState<QrProvider | null>(null);
    const [qr, setQr] = useState<QrState>({ phase: "idle" });
    const [now, setNow] = useState(() => Date.now());
    // Giao dịch QR đang hiệu lực (để huỷ khi tạo mã mới / rời trang).
    const activePaymentRef = useRef<QrPayment | null>(null);

    const createQr = useCallback(
        async (provider: QrProvider) => {
            if (!showtimeId || price.final <= 0) return;


            const oldPayment = activePaymentRef.current;
            activePaymentRef.current = null;

            if (oldPayment && !oldPayment.manual) {
                cancelQrPayment(oldPayment.reference).catch(() => undefined);
            }

            setQr({ phase: "creating", provider });

            try {
                let payment: QrPayment;

                if (provider === "VIETQR") {
                    if (!isVietQrConfigured()) {
                        throw new Error(
                            "Chưa cấu hình tài khoản nhận tiền VietQR (VITE_VIETQR_BANK_ID, VITE_VIETQR_ACCOUNT_NO)."
                        );
                    }

                    payment = createVietQrPayment(price.final, buildTransferNote(showtimeId));
                } else {
                    payment = await createGatewayQrPayment({
                        provider,
                        showtimeId,
                        showtimeSeatIds: selectedSeatIds,
                        amount: price.final,
                        orderInfo: `Ve xem phim suat ${showtimeId}`,
                    });
                }

                activePaymentRef.current = payment;
                setQr({ phase: "ready", payment });
            } catch (err) {
                console.error("Tạo QR lỗi:", err);
                setQr({
                    phase: "failed",
                    provider,
                    message: getApiErrorMessage(err, "Không tạo được mã QR."),
                });
            }
        },
        [showtimeId, price.final, selectedSeatIds, qr]
    );

    function handleSelectProvider(provider: QrProvider) {
        if (qr.phase === "paid") return;

        setQrProvider(provider);
        createQr(provider);
    }

    // Thăm dò trạng thái giao dịch MoMo / VNPay.
    useEffect(() => {
        if (qr.phase !== "ready" || qr.payment.manual) return;

        const payment = qr.payment;
        let stopped = false;

        const id = window.setInterval(async () => {
            try {
                const status = await getQrPaymentStatus(payment.reference);

                if (stopped || activePaymentRef.current?.reference !== payment.reference) return;

                if (status === "PAID") {
                    // Đã thanh toán: không được huỷ khi rời trang.
                    activePaymentRef.current = null;
                    setQr({ phase: "paid", payment });
                } else if (status === "FAILED" || status === "EXPIRED") {
                    setQr({
                        phase: "failed",
                        provider: payment.provider,
                        payment,
                        message:
                            status === "EXPIRED"
                                ? "Mã QR đã hết hạn. Tạo mã mới để khách thanh toán."
                                : "Giao dịch thất bại hoặc bị huỷ trên ứng dụng.",
                    });
                }
            } catch (err) {
                // Lỗi mạng tạm thời: thử lại ở lần sau.
                console.warn("Không kiểm tra được trạng thái QR:", err);
            }
        }, QR_POLL_MS);

        return () => {
            stopped = true;
            window.clearInterval(id);
        };
    }, [qr]);

    // Đồng hồ đếm ngược hạn QR.
    useEffect(() => {
        if (qr.phase !== "ready" || !qr.payment.expiresAt) return;

        const id = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(id);
    }, [qr]);

    const qrRemainingMs =
        qr.phase === "ready" && qr.payment.expiresAt
            ? new Date(qr.payment.expiresAt).getTime() - now
            : null;

    useEffect(() => {
        if (qr.phase === "ready" && qrRemainingMs !== null && qrRemainingMs <= 0) {
            setQr({
                phase: "failed",
                provider: qr.payment.provider,
                payment: qr.payment,
                message: "Mã QR đã hết hạn. Tạo mã mới để khách thanh toán.",
            });
        }
    }, [qr, qrRemainingMs]);

    // Rời trang khi còn giao dịch cổng đang chờ -> huỷ để không treo giao dịch.
    useEffect(
        () => () => {
            const payment = activePaymentRef.current;
            if (payment && !payment.manual) {
                cancelQrPayment(payment.reference).catch(() => undefined);
            }
        },
        []
    );

    function handleManualPaid() {
        if (qr.phase === "ready" && qr.payment.manual) {
            setQr({ phase: "paid", payment: qr.payment });
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
        selectedSeatIds.length > 0 &&
        price.final >= 0 &&
        !priceLoading &&
        !priceError &&
        paymentReady;

    const blockReason = priceLoading
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
                    : qr.phase === "ready" && qr.payment.manual
                        ? "Kiểm tra tài khoản rồi bấm “Đã nhận tiền”"
                        : "Chờ khách quét mã và thanh toán";

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

            const request = {
                showtimeId: showtime.id,
                showtimeSeatIds: selectedSeatIds,
                promotionId: null,
                paymentMethod: method,
                ...(method === "TRANSFER" && paidPayment
                    ? {
                        paymentProvider: paidPayment.provider,
                        paymentReference: paidPayment.reference,
                    }
                    : {}),
            };

            const response = await sellTickets(request, EMPLOYEE_ID);

            activePaymentRef.current = null;

            navigate("/counter-sale/result", {
                replace: true,
                state: {
                    response,
                    showtime,
                    selectedSeats,
                    price,
                    payment: {
                        method,
                        provider: paidPayment?.provider,
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
            state: { showtime, selectedSeatIds },
        });
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

    const methodLabel =
        method === "CASH"
            ? "Tiền mặt"
            : `Chuyển khoản QR · ${
                QR_PROVIDERS.find((item) => item.id === (qr.phase === "paid" ? qr.payment.provider : qrProvider))
                    ?.name ?? ""
            }`;

    const modalLines =
        method === "CASH"
            ? [
                { label: "Khách đưa", value: formatMoney(cashReceived) },
                { label: "Tiền thối", value: formatMoney(Math.max(0, cashChange)), strong: true },
            ]
            : qr.phase === "paid"
                ? [{ label: "Mã giao dịch", value: qr.payment.reference }]
                : [];

    const selectedProvider = QR_PROVIDERS.find((item) => item.id === qrProvider);

    /* ---------- Render ---------- */

    return (
        <div className="cs-confirm-page">
            {/* ================= HEADER ================= */}

            <header className="cs-confirm-header">
                <button
                    type="button"
                    className="cs-btn cs-btn-ghost"
                    onClick={handleBack}
                    disabled={submitting || qr.phase === "paid"}
                    title={qr.phase === "paid" ? "Khách đã thanh toán, không thể đổi ghế" : undefined}
                >
                    ← Đổi ghế
                </button>

                <div>
                    <span className="cs-eyebrow">Bước 3 / 3</span>
                    <h1>Xác nhận bán vé</h1>
                </div>

                <ol className="cs-steps" aria-label="Tiến trình">
                    <li className="is-done">Suất chiếu</li>
                    <li className="is-done">Ghế</li>
                    <li className="is-current">Thanh toán</li>
                </ol>
            </header>

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
                                <small>MoMo · VNPay · Ngân hàng</small>
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
                            <div className="cs-provider-list">
                                {QR_PROVIDERS.map((provider) => (
                                    <button
                                        key={provider.id}
                                        type="button"
                                        className={`cs-provider ${qrProvider === provider.id ? "is-active" : ""}`}
                                        style={{ "--provider": provider.color } as CSSProperties}
                                        onClick={() => handleSelectProvider(provider.id)}
                                        disabled={qr.phase === "creating" || qr.phase === "paid" || priceLoading}
                                    >
                                        <i aria-hidden="true">{provider.name.slice(0, 2)}</i>
                                        <span>
                                            <b>{provider.name}</b>
                                            <small>{provider.hint}</small>
                                        </span>
                                    </button>
                                ))}
                            </div>

                            <div className="cs-qr-stage">
                                {qr.phase === "idle" && (
                                    <div className="cs-qr-placeholder">
                                        <span aria-hidden="true">▦</span>
                                        <p>Chọn MoMo, VNPay hoặc VietQR để tạo mã cho khách quét.</p>
                                    </div>
                                )}

                                {qr.phase === "creating" && (
                                    <div className="cs-qr-placeholder">
                                        <span className="cs-spinner is-large" aria-hidden="true" />
                                        <p>Đang tạo mã {selectedProvider?.name}…</p>
                                    </div>
                                )}

                                {qr.phase === "failed" && (
                                    <div className="cs-qr-placeholder is-error">
                                        <span aria-hidden="true">!</span>
                                        <p>{qr.message}</p>
                                        <button
                                            type="button"
                                            className="cs-btn cs-btn-ghost"
                                            onClick={() => createQr(qr.provider)}
                                        >
                                            Tạo mã mới
                                        </button>
                                    </div>
                                )}

                                {(qr.phase === "ready" || qr.phase === "paid") && (
                                    <div className={`cs-qr-ready ${qr.phase === "paid" ? "is-paid" : ""}`}>
                                        <div className="cs-qr-code">
                                            {qr.payment.qrImageUrl ? (
                                                <img src={qr.payment.qrImageUrl} alt="Mã QR thanh toán" />
                                            ) : (
                                                <QRCodeSVG
                                                    value={qr.payment.qrContent ?? qr.payment.payUrl ?? ""}
                                                    size={196}
                                                    marginSize={2}
                                                    level="M"
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

                                            {qr.payment.manual ? (
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
                                            ) : (
                                                <dl>
                                                    <div>
                                                        <dt>Mã GD</dt>
                                                        <dd className="is-code">{qr.payment.reference}</dd>
                                                    </div>
                                                    {qrRemainingMs !== null && qr.phase === "ready" && (
                                                        <div>
                                                            <dt>Hết hạn</dt>
                                                            <dd className={qrRemainingMs < 60_000 ? "is-warn" : ""}>
                                                                {formatCountdown(qrRemainingMs)}
                                                            </dd>
                                                        </div>
                                                    )}
                                                </dl>
                                            )}

                                            {qr.phase === "ready" && !qr.payment.manual && (
                                                <p className="cs-qr-status">
                                                    <span className="cs-pulse" aria-hidden="true" />
                                                    Đang chờ khách thanh toán trên {selectedProvider?.name}…
                                                </p>
                                            )}

                                            {qr.phase === "ready" && qr.payment.manual && (
                                                <button
                                                    type="button"
                                                    className="cs-btn cs-btn-success"
                                                    onClick={handleManualPaid}
                                                >
                                                    ✓ Đã nhận tiền
                                                </button>
                                            )}

                                            {qr.phase === "ready" && (
                                                <button
                                                    type="button"
                                                    className="cs-link"
                                                    onClick={() => createQr(qr.payment.provider)}
                                                >
                                                    Tạo mã mới
                                                </button>
                                            )}

                                            {qr.phase === "paid" && (
                                                <p className="cs-qr-status is-paid">
                                                    Thanh toán thành công. Bấm “Bán vé” để xuất vé.
                                                </p>
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
                paymentLines={modalLines}
                onCancel={closeModal}
                onConfirm={handleSell}
            />
        </div>
    );
}

export default CounterSaleConfirm;
