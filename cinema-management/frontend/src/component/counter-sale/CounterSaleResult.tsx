import { useEffect, useMemo, useRef, useState } from "react";
import type { SyntheticEvent } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";

import type { ShowtimeData } from "../../types/showtime/showtime";
import type { ShowtimeSeat } from "../../types/showtimeSeat/showtimeSeat";
import type { CounterSaleResponse } from "../../service/counterSale/counterSaleService";

import "./CounterSaleResult.css";


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
};

type TicketView = {
    code: string;
    seat?: ShowtimeSeat;
};

type ResponseTicket = {
    ticketCode?: string;
    code?: string;
    rowLabel?: string;
    seatNumber?: number;
    showtimeSeatId?: number;
    seatId?: number;
};


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


type TicketCardProps = {
    ticket: TicketView;
    index: number;
    total: number;
    showtime: ShowtimeData;
    bookingCode: string;
    onPrint?: () => void;
    onCopy?: () => void;
    copied?: boolean;
};

function TicketCard({
                        ticket,
                        index,
                        total,
                        showtime,
                        bookingCode,
                        onPrint,
                        onCopy,
                        copied,
                    }: TicketCardProps) {
    const kind = getSeatKindLabel(ticket.seat?.seatType);

    return (
        <article className={`cs-ticket ${kind === "VIP" ? "is-vip" : ""}`}>
            <div className="cs-ticket-main">
                <header>
                    <span className="cs-ticket-brand">
                        PREMIERE <b>CINEMAS</b>
                    </span>
                    <span className="cs-ticket-index">
                        Vé {index + 1}/{total}
                    </span>
                </header>

                <h3 title={showtime.movieTitle}>{showtime.movieTitle}</h3>

                <dl className="cs-ticket-grid">
                    <div>
                        <dt>Ngày</dt>
                        <dd>{formatDate(showtime.startTime, false)}</dd>
                    </div>
                    <div>
                        <dt>Suất</dt>
                        <dd className="is-big">{formatTime(showtime.startTime)}</dd>
                    </div>
                    <div>
                        <dt>Phòng</dt>
                        <dd>{getRoomName(showtime)}</dd>
                    </div>
                    <div>
                        <dt>Ghế</dt>
                        <dd className="is-seat">
                            {seatCode(ticket.seat)}
                            {ticket.seat && <small>{kind}</small>}
                        </dd>
                    </div>
                </dl>

                <footer>
                    <span>{getFormatLabel(showtime)}</span>
                    <span>Đơn {bookingCode}</span>
                </footer>
            </div>

            <div className="cs-ticket-stub">
                <div className="cs-ticket-qr">
                    <QRCodeSVG value={ticket.code} size={92} marginSize={1} level="M" />
                </div>

                <code>{ticket.code}</code>

                {(onPrint || onCopy) && (
                    <div className="cs-ticket-actions cs-no-print">
                        {onCopy && (
                            <button type="button" onClick={onCopy} title="Sao chép mã vé">
                                {copied ? "✓" : "⧉"}
                            </button>
                        )}
                        {onPrint && (
                            <button type="button" onClick={onPrint} title="In vé này">
                                🖨
                            </button>
                        )}
                    </div>
                )}
            </div>
        </article>
    );
}



function CounterSaleResult() {
    const navigate = useNavigate();
    const location = useLocation();

    const state = (location.state ?? null) as ResultLocationState | null;
    const response = state?.response;
    const showtime = state?.showtime;
    const selectedSeats = useMemo(() => state?.selectedSeats ?? [], [state?.selectedSeats]);
    const payment = state?.payment;

    // Thời điểm bán: ưu tiên thời gian backend trả về, nếu không thì lúc mở trang.
    const [soldAt] = useState(() => {
        const raw = (response as unknown as { createdAt?: string; paidAt?: string } | undefined);
        const value = raw?.paidAt ?? raw?.createdAt;
        const date = value ? new Date(value) : new Date();
        return Number.isNaN(date.getTime()) ? new Date() : date;
    });

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



    const [copiedKey, setCopiedKey] = useState<string | null>(null);

    async function handleCopy(key: string, text: string) {
        if (await copyText(text)) {
            setCopiedKey(key);
            window.setTimeout(() => setCopiedKey((current) => (current === key ? null : current)), 1500);
        }
    }


    const [printTarget, setPrintTarget] = useState<string | null>(null);
    const [printedCount, setPrintedCount] = useState(0);

    useEffect(() => {
        if (!printTarget) return;

        function handleAfterPrint() {
            setPrintTarget(null);
        }

        window.addEventListener("afterprint", handleAfterPrint);

        // Đợi React render vùng in xong rồi mới mở hộp thoại in.
        const id = window.requestAnimationFrame(() => {
            window.print();
            setPrintedCount((value) => value + 1);
        });

        return () => {
            window.cancelAnimationFrame(id);
            window.removeEventListener("afterprint", handleAfterPrint);
        };
    }, [printTarget]);

    const printTickets = printTarget === "all" ? tickets : tickets.filter((t) => t.code === printTarget);

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

    /* ---------- Render ---------- */

    return (
        <div className="cs-result-page">
            {/* ================= SUCCESS ================= */}

            <section className="cs-result-hero cs-no-print">
                <div className="cs-result-check" aria-hidden="true">
                    ✓
                </div>

                <div className="cs-result-hero-text">
                    <span className="cs-eyebrow">Giao dịch hoàn tất</span>
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
                                <button
                                    type="button"
                                    className="cs-icon-btn"
                                    onClick={() => handleCopy("booking", response.bookingCode)}
                                    title="Sao chép mã đặt vé"
                                >
                                    {copiedKey === "booking" ? "✓ Đã chép" : "⧉ Sao chép"}
                                </button>
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
                            {tickets.map((ticket, index) => (
                                <TicketCard
                                    key={ticket.code || index}
                                    ticket={ticket}
                                    index={index}
                                    total={tickets.length}
                                    showtime={showtime}
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

            {printTarget &&
                createPortal(
                    <div className="cs-print-area" aria-hidden="true">
                        {printTickets.map((ticket) => {
                            const index = tickets.indexOf(ticket);

                            return (
                                <div className="cs-print-page" key={ticket.code}>
                                    <TicketCard
                                        ticket={ticket}
                                        index={index}
                                        total={tickets.length}
                                        showtime={showtime}
                                        bookingCode={response.bookingCode}
                                    />
                                    <p className="cs-print-note">
                                        {methodLabel} · In lúc {new Date().toLocaleString("vi-VN")}
                                    </p>
                                </div>
                            );
                        })}
                    </div>,
                    document.body
                )}
        </div>
    );
}

export default CounterSaleResult;
