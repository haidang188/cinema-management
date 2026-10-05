import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { ShowtimeData } from "../../types/showtime/showtime";
import type { ShowtimeSeat } from "../../types/showtimeSeat/showtimeSeat";
import type { CounterSaleResponse } from "../../service/counterSale/counterSaleService";

import { maskPhone } from "../../service/counterOrder/counterOrderService";
import CounterSaleStepper from "./CounterSaleStepper";
import { TicketCard, TicketPrintArea, seatKindLabel } from "../../component/ticket-print/TicketPrint";
import type { PrintableTicket, TicketShowInfo } from "../../component/ticket-print/TicketPrint";

import "./CounterSaleResult.css";

/*
 * Class dùng tiền tố "cs-" và scope trong .cs-result-page
 * để không đụng CSS trang khác (CSS của Vite là global).
 */

type PaymentInfo = {
    method?: string;
    provider?: string;
    reference?: string;
    cashReceived?: number;
    cashChange?: number;
};

type ResultLocationState = {
    response?: CounterSaleResponse;
    showtime?: ShowtimeData;
    selectedSeats?: ShowtimeSeat[];
    payment?: PaymentInfo;
    customer?: { name?: string | null; phone?: string | null };
    promotion?: { code?: string | null; title?: string | null } | null;
};

type TicketView = {
    code: string;
    seat?: ShowtimeSeat;
};

// Một số backend trả kèm danh sách vé có ghế; nếu có thì ưu tiên dùng.
type ResponseTicket = {
    ticketCode?: string;
    code?: string;
    rowLabel?: string;
    seatNumber?: number;
    showtimeSeatId?: number;
    seatId?: number;
};

/* ============================================================
 * HELPERS
 * ============================================================ */

function formatMoney(value?: number | null): string {
    return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
}

function formatTime(value?: string | null): string {
    if (!value) return "--:--";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "--:--";

    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(value?: string | null, weekday = true): string {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toLocaleDateString("vi-VN", {
        ...(weekday ? { weekday: "short" as const } : {}),
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

function getPaymentStatusLabel(status?: string | null): { label: string; ok: boolean } {
    const value = String(status ?? "").toUpperCase();

    if (["PAID", "SUCCESS", "COMPLETED"].includes(value)) return { label: "Đã thanh toán", ok: true };
    if (["PENDING", "PROCESSING"].includes(value)) return { label: "Đang xử lý", ok: false };
    if (["FAILED", "CANCELLED", "CANCELED"].includes(value)) return { label: "Thất bại", ok: false };

    return { label: status || "—", ok: false };
}

const PROVIDER_LABEL: Record<string, string> = {
    MOMO: "MoMo",
    VNPAY: "VNPay",
    VIETQR: "VietQR",
};

function getPaymentMethodLabel(method?: string | null, provider?: string): string {
    const value = String(method ?? "").toUpperCase();

    if (value === "CASH") return "Tiền mặt";

    if (["TRANSFER", "BANK_TRANSFER", "QR"].includes(value)) {
        const name = provider ? PROVIDER_LABEL[provider.toUpperCase()] ?? provider : "";
        return name ? `Chuyển khoản · ${name}` : "Chuyển khoản";
    }

    return method || "—";
}

function seatCode(seat?: ShowtimeSeat): string {
    return seat ? `${seat.rowLabel}${seat.seatNumber}` : "--";
}

async function copyText(text: string): Promise<boolean> {
    try {
        await navigator.clipboard.writeText(text);
        return true;
    } catch {
        return false;
    }
}

/* ============================================================
 * PAGE
 * ============================================================ */

function CounterSaleResult() {
    const navigate = useNavigate();
    const location = useLocation();

    const state = (location.state ?? null) as ResultLocationState | null;
    const response = state?.response;
    const showtime = state?.showtime;
    const selectedSeats = useMemo(() => state?.selectedSeats ?? [], [state?.selectedSeats]);
    const payment = state?.payment;
    const customer = state?.customer;
    const promotion = state?.promotion;

    // Thời điểm bán: ưu tiên thời gian backend trả về, nếu không thì lúc mở trang.
    const [soldAt] = useState(() => {
        const raw = (response as unknown as { createdAt?: string; paidAt?: string } | undefined);
        const value = raw?.paidAt ?? raw?.createdAt;
        const date = value ? new Date(value) : new Date();
        return Number.isNaN(date.getTime()) ? new Date() : date;
    });

    /*
     * Ghép mã vé với ghế.
     * 1) Nếu response có mảng tickets kèm thông tin ghế -> ghép theo ghế (chính xác).
     * 2) Nếu chỉ có ticketCodes -> ghép theo thứ tự. Backend tạo vé theo thứ tự
     *    showtimeSeatIds gửi lên; trang xác nhận gửi đúng thứ tự selectedSeats.
     */
    const tickets = useMemo<TicketView[]>(() => {
        if (!response) return [];

        const rich = (response as unknown as { tickets?: ResponseTicket[] }).tickets;

        if (Array.isArray(rich) && rich.length > 0) {
            return rich.map((item, index) => {
                const code = String(item.ticketCode ?? item.code ?? "");
                const seat =
                    selectedSeats.find(
                        (s) =>
                            (item.showtimeSeatId !== undefined && s.id === item.showtimeSeatId) ||
                            (item.rowLabel !== undefined &&
                                s.rowLabel === item.rowLabel &&
                                s.seatNumber === item.seatNumber)
                    ) ?? selectedSeats[index];

                return { code, seat };
            });
        }

        return (response.ticketCodes ?? []).map((code, index) => ({
            code,
            seat: selectedSeats[index],
        }));
    }, [response, selectedSeats]);

    /* ---------- Copy ---------- */

    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    async function handleCopy(key: string, text: string) {
        if (await copyText(text)) {
            setCopiedKey(key);
            window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
        }
    }

    /* ---------- Print ---------- */

    // null = không in; "all" = in tất cả; mã vé = in 1 vé.
    const [printTarget, setPrintTarget] = useState<string | null>(null);
    const [printedCount, setPrintedCount] = useState(0);

    // Dạng vé dùng chung cho màn hình và bản in.
    const printable = useMemo<PrintableTicket[]>(
        () =>
            tickets.map((ticket) => ({
                code: ticket.code,
                seatLabel: ticket.seat ? seatCode(ticket.seat) : "",
                seatKind: seatKindLabel(ticket.seat?.seatType),
            })),
        [tickets]
    );

    const printTickets = printTarget === "all" ? printable : printable.filter((t) => t.code === printTarget);

    /* ---------- Phím tắt ---------- */

    const newSaleRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        newSaleRef.current?.focus();

        function onKeyDown(event: KeyboardEvent) {
            const target = event.target as HTMLElement | null;
            if (target && /INPUT|TEXTAREA|SELECT/.test(target.tagName)) return;

            if (event.key === "F2") {
                event.preventDefault();
                navigate("/counter-sale");
            }

            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "p") {
                event.preventDefault();
                setPrintTarget("all");
            }
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [navigate]);

    function handlePosterError(event: SyntheticEvent<HTMLImageElement>) {
        event.currentTarget.classList.add("is-broken");
    }

    /* ---------- Empty ---------- */

    if (!response || !showtime) {
        return (
            <div className="cs-result-page">
                <div className="cs-result-empty">
                    <span aria-hidden="true">🎟</span>
                    <h2>Không có thông tin giao dịch</h2>
                    <p>Trang này chỉ hiển thị ngay sau khi bán vé thành công.</p>
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

    const status = getPaymentStatusLabel(response.paymentStatus);
    const methodLabel = getPaymentMethodLabel(
        response.paymentMethod ?? payment?.method,
        payment?.provider
    );
    const isCash = String(response.paymentMethod ?? payment?.method ?? "").toUpperCase() === "CASH";

    const showInfo: TicketShowInfo = {
        movieTitle: showtime.movieTitle,
        startTime: showtime.startTime,
        roomName: getRoomName(showtime),
        format: getFormatLabel(showtime),
    };

    /* ---------- Render ---------- */

    return (
        <div className="cs-result-page">
            {/* ================= SUCCESS ================= */}

            <div className="cs-no-print">
                <CounterSaleStepper current={4} showtime={showtime} seatCodes={selectedSeats.map(seatCode)} />
            </div>

            <section className="cs-result-hero cs-no-print">
                <div className="cs-result-check" aria-hidden="true">
                    ✓
                </div>

                <div className="cs-result-hero-text">
                    <h1>Bán vé thành công</h1>
                    <p>
                        {tickets.length} vé · {showtime.movieTitle} · {formatTime(showtime.startTime)}{" "}
                        {formatDate(showtime.startTime)}
                    </p>
                </div>

                <div className="cs-result-hero-total">
                    <span>Đã thu</span>
                    <strong>{formatMoney(response.finalAmount)}</strong>
                </div>
            </section>

            <div className="cs-result-body cs-no-print">
                {/* ================= LEFT ================= */}

                <div className="cs-result-left">
                    {/* Booking */}
                    <section className="cs-card cs-booking">
                        <div className="cs-booking-code">
                            <span>Mã đặt vé</span>

                            <div>
                                <code>{response.bookingCode}</code>
                            </div>
                        </div>

                        <dl className="cs-booking-meta">
                            <div>
                                <dt>Trạng thái</dt>
                                <dd>
                                    <span className={`cs-status ${status.ok ? "is-ok" : "is-warn"}`}>
                                        {status.label}
                                    </span>
                                </dd>
                            </div>
                            <div>
                                <dt>Thanh toán</dt>
                                <dd>{methodLabel}</dd>
                            </div>
                            <div>
                                <dt>Thời gian</dt>
                                <dd>
                                    {soldAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}{" "}
                                    {soldAt.toLocaleDateString("vi-VN")}
                                </dd>
                            </div>
                            {(customer?.name || customer?.phone) && (
                                <div>
                                    <dt>Khách</dt>
                                    <dd>
                                        {[customer.name, maskPhone(customer.phone)].filter(Boolean).join(" · ")}
                                    </dd>
                                </div>
                            )}
                            {promotion?.code && (
                                <div>
                                    <dt>Mã giảm giá</dt>
                                    <dd className="is-code">{promotion.code}</dd>
                                </div>
                            )}
                            {payment?.reference && (
                                <div>
                                    <dt>Mã GD</dt>
                                    <dd className="is-code">{payment.reference}</dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    {/* Showtime */}
                    <section className="cs-card cs-result-movie">
                        <div className="cs-result-poster">
                            {showtime.posterUrl && (
                                <img src={showtime.posterUrl} alt="" onError={handlePosterError} />
                            )}
                        </div>

                        <div className="cs-result-movie-info">
                            <h2>{showtime.movieTitle}</h2>

                            <div className="cs-chips">
                                <span className="cs-chip">{formatDate(showtime.startTime)}</span>
                                <span className="cs-chip cs-chip-strong">
                                    {formatTime(showtime.startTime)} – {formatTime(showtime.endTime)}
                                </span>
                                <span className="cs-chip cs-chip-red">{getRoomName(showtime)}</span>
                                <span className="cs-chip">{getFormatLabel(showtime)}</span>
                            </div>

                            <div className="cs-result-seats">
                                {selectedSeats.map((seat) => (
                                    <span
                                        key={seat.id}
                                        className={getSeatKindLabel(seat.seatType) === "VIP" ? "is-vip" : ""}
                                    >
                                        {seatCode(seat)}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    {/* Payment */}
                    <section className="cs-card cs-result-price">
                        <div>
                            <span>Tiền vé ({tickets.length} vé)</span>
                            <strong>{formatMoney(response.totalAmount)}</strong>
                        </div>
                        <div>
                            <span>Giảm giá</span>
                            <strong className={response.discountAmount > 0 ? "is-discount" : ""}>
                                {response.discountAmount > 0 ? "−" : ""}
                                {formatMoney(response.discountAmount)}
                            </strong>
                        </div>
                        <div className="cs-result-total">
                            <span>Tổng thanh toán</span>
                            <strong>{formatMoney(response.finalAmount)}</strong>
                        </div>

                        {isCash && payment?.cashReceived !== undefined && (
                            <div className="cs-result-cash">
                                <div>
                                    <span>Khách đưa</span>
                                    <strong>{formatMoney(payment.cashReceived)}</strong>
                                </div>
                                <div className="is-change">
                                    <span>Tiền thối</span>
                                    <strong>{formatMoney(payment.cashChange)}</strong>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                {/* ================= RIGHT: TICKETS ================= */}

                <section className="cs-card cs-result-tickets">
                    <div className="cs-tickets-head">
                        <div>
                            <h2>Vé điện tử</h2>
                            <p>Khách quét mã QR tại cửa soát vé</p>
                        </div>

                        <span className="cs-tickets-count">{tickets.length} vé</span>
                    </div>

                    {tickets.length === 0 ? (
                        <div className="cs-tickets-empty">
                            Backend không trả về mã vé. Tra cứu theo mã đặt vé {response.bookingCode}.
                        </div>
                    ) : (
                        <div className="cs-tickets-list">
                            {printable.map((ticket, index) => (
                                <TicketCard
                                    key={ticket.code || index}
                                    ticket={ticket}
                                    index={index}
                                    total={printable.length}
                                    show={showInfo}
                                    bookingCode={response.bookingCode}
                                    copied={copiedKey === ticket.code}
                                    onCopy={() => handleCopy(ticket.code, ticket.code)}
                                    onPrint={() => setPrintTarget(ticket.code)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* ================= ACTION BAR ================= */}

            <div className="cs-result-action cs-no-print">
                <div className="cs-result-action-hint">
                    <kbd>Ctrl</kbd>+<kbd>P</kbd> in vé · <kbd>F2</kbd> bán vé mới
                    {printedCount > 0 && <span className="cs-printed">✓ Đã gửi lệnh in</span>}
                </div>

                <div className="cs-result-action-buttons">
                    <button
                        type="button"
                        className="cs-btn cs-btn-ghost"
                        onClick={() => setPrintTarget("all")}
                        disabled={tickets.length === 0}
                    >
                        🖨 In {tickets.length > 1 ? `tất cả ${tickets.length} vé` : "vé"}
                    </button>

                    <button
                        ref={newSaleRef}
                        type="button"
                        className="cs-btn cs-btn-primary cs-new-sale"
                        onClick={() => navigate("/counter-sale")}
                    >
                        ＋ Bán vé mới
                    </button>
                </div>
            </div>

            {/* ================= PRINT AREA (chỉ hiện khi in) ================= */}

            {/*
             * Portal thẳng vào <body> để khi in có thể ẩn TOÀN BỘ layout
             * (sidebar, header...) bằng display:none, không sinh trang trắng.
             */}
            {printTarget && (
                <TicketPrintArea
                    tickets={printTickets}
                    allTickets={printable}
                    show={showInfo}
                    bookingCode={response.bookingCode}
                    note={methodLabel}
                    onPrinted={() => setPrintedCount((value) => value + 1)}
                    onDone={() => setPrintTarget(null)}
                />
            )}
        </div>
    );
}

export default CounterSaleResult;
