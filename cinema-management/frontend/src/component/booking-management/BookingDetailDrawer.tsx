import { useEffect, useRef, useState } from "react";

import {
    CHANNEL_LABEL,
    getBookingDetail,
    paymentLabel,
    reprintTickets,
    statusLabel,
    statusTone,
} from "../../service/bookingManagement/bookingManagementService";
import type { BookingDetail } from "../../service/bookingManagement/bookingManagementService";
import { TicketPrintArea, seatKindLabel } from "../ticket-print/TicketPrint";
import type { PrintableTicket } from "../ticket-print/TicketPrint";

type Props = {
    bookingId: number | null;
    onClose: () => void;
};

function formatMoney(value?: number | null): string {
    return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
}

function formatDateTime(value?: string | null): string {
    if (!value) return "—";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? "—"
        : d.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour12: false,
        });
}

function formatTime(value?: string | null): string {
    if (!value) return "--:--";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? "--:--"
        : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}


/** Ngăn kéo bên phải: chi tiết 1 đơn đặt vé. Esc hoặc bấm ra ngoài để đóng. */
export default function BookingDetailDrawer({ bookingId, onClose }: Props) {
    const [detail, setDetail] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const closeRef = useRef<HTMLButtonElement>(null);

    // In lại vé: null = không in; danh sách mã vé = đang in các vé đó.
    const [printCodes, setPrintCodes] = useState<string[] | null>(null);
    const [reprintBusy, setReprintBusy] = useState(false);
    const [reprintError, setReprintError] = useState("");
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    const open = bookingId !== null;

    useEffect(() => {
        if (bookingId === null) return;

        let cancelled = false;

        setDetail(null);
        setLoading(true);
        setError("");
        setReprintError("");
        setPrintCodes(null);

        getBookingDetail(bookingId)
            .then((data) => {
                if (!cancelled) setDetail(data);
            })
            .catch((err: unknown) => {
                if (!cancelled) setError(err instanceof Error ? err.message : "Không tải được chi tiết đơn.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [bookingId]);

    useEffect(() => {
        if (!open) return;

        closeRef.current?.focus();

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") onCloseRef.current();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    if (!open) return null;

    // Ghi nhận in lại ở server TRƯỚC, thành công mới mở hộp thoại in.
    async function handleReprint(codes: string[]) {
        if (!detail || reprintBusy) return;

        setReprintBusy(true);
        setReprintError("");

        try {
            const updated = await reprintTickets(detail.id, codes);
            setDetail(updated);
            setPrintCodes(codes.length > 0 ? codes : updated.tickets.map((t) => t.ticketCode ?? "").filter(Boolean));
        } catch (err) {
            const anyErr = err as { response?: { data?: { message?: string } } };
            setReprintError(anyErr?.response?.data?.message ?? "Không in lại được vé.");
        } finally {
            setReprintBusy(false);
        }
    }

    const printable: PrintableTicket[] = (detail?.tickets ?? [])
        .filter((t) => t.ticketCode)
        .map((t) => ({ code: t.ticketCode!, seatLabel: t.seat, seatKind: seatKindLabel(t.seatType) }));

    const channel = String(detail?.channel ?? "").toUpperCase();
    const payment = detail?.payment;
    const isCash = String(payment?.method ?? "").toUpperCase() === "CASH";

    return (
        <div
            className="bm-drawer-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <aside className="bm-drawer" role="dialog" aria-modal="true" aria-label="Chi tiết đơn đặt vé">
                <header className="bm-drawer-head">
                    <div>
                        <span className="bm-drawer-label">Đơn đặt vé</span>
                        <h2>{detail?.bookingCode ?? "…"}</h2>
                    </div>

                    <button ref={closeRef} type="button" className="bm-drawer-close" onClick={onClose} aria-label="Đóng">
                        ×
                    </button>
                </header>

                {loading && <div className="bm-drawer-state">Đang tải chi tiết…</div>}
                {error && <div className="bm-drawer-state is-error">{error}</div>}

                {detail && (
                    <div className="bm-drawer-body">
                        <div className="bm-drawer-tags">
                            <span className={`bm-channel is-${channel.toLowerCase()}`}>
                                {CHANNEL_LABEL[channel] ?? detail.channel}
                            </span>
                            <span className={`bm-status is-${statusTone(detail.status)}`}>
                                {statusLabel(detail.status)}
                            </span>
                            <span className="bm-sub">Đặt lúc {formatDateTime(detail.createdAt)}</span>
                        </div>

                        {/* ---------- Suất chiếu ---------- */}
                        <section className="bm-drawer-movie">
                            <div className="bm-drawer-poster">
                                {detail.showtime.posterUrl && <img src={detail.showtime.posterUrl} alt="" />}
                            </div>
                            <div>
                                <h3>{detail.showtime.movieTitle}</h3>
                                <p>
                                    {formatTime(detail.showtime.startTime)}
                                    {detail.showtime.endTime ? `–${formatTime(detail.showtime.endTime)}` : ""},{" "}
                                    {new Date(detail.showtime.startTime).toLocaleDateString("vi-VN", {
                                        weekday: "long",
                                        day: "2-digit",
                                        month: "2-digit",
                                        year: "numeric",
                                    })}
                                </p>
                                <p>
                                    {detail.showtime.roomName}
                                    {detail.showtime.roomType ? `, ${detail.showtime.roomType}` : ""}
                                </p>
                            </div>
                        </section>

                        {/* ---------- Khách ---------- */}
                        <section className="bm-drawer-section">
                            <h4>Khách hàng</h4>
                            {detail.customer.name || detail.customer.phone ? (
                                <dl className="bm-dl">
                                    <dt>Tên</dt>
                                    <dd>{detail.customer.name ?? "—"}</dd>
                                    <dt>Điện thoại</dt>
                                    <dd>
                                        {detail.customer.phone ? (
                                            <a href={`tel:${detail.customer.phone}`}>{detail.customer.phone}</a>
                                        ) : (
                                            "—"
                                        )}
                                    </dd>
                                </dl>
                            ) : (
                                <p className="bm-muted">Khách không để lại thông tin.</p>
                            )}
                        </section>

                        {/* ---------- Vé ---------- */}
                        <section className="bm-drawer-section">
                            <div className="bm-section-head">
                                <h4>{detail.tickets.length} vé</h4>
                                <button
                                    type="button"
                                    className="bm-reprint-all"
                                    onClick={() => handleReprint([])}
                                    disabled={!detail.reprintable || reprintBusy || printable.length === 0}
                                    title={detail.reprintBlockedReason ?? "In lại tất cả vé của đơn"}
                                >
                                    {reprintBusy ? "Đang chuẩn bị…" : "In lại tất cả vé"}
                                </button>
                            </div>

                            {!detail.reprintable && detail.reprintBlockedReason && (
                                <p className="bm-reprint-note">{detail.reprintBlockedReason}</p>
                            )}

                            {reprintError && (
                                <p className="bm-reprint-note is-error" role="alert">
                                    {reprintError}
                                </p>
                            )}

                            <ul className="bm-ticket-list">
                                {detail.tickets.map((ticket) => (
                                    <li key={ticket.seat}>
                                        <b>{ticket.seat}</b>
                                        <span className="bm-sub">{seatKindLabel(ticket.seatType)}</span>
                                        <span className="bm-ticket-code">
                                            <code>{ticket.ticketCode ?? "Chưa xuất vé"}</code>
                                            {ticket.reprintCount > 0 && (
                                                <small title={`Lần gần nhất: ${formatDateTime(ticket.lastReprintedAt)}`}>
                                                    Đã in lại {ticket.reprintCount} lần
                                                </small>
                                            )}
                                        </span>
                                        <span className="bm-ticket-price">{formatMoney(ticket.price)}</span>
                                        <button
                                            type="button"
                                            className="bm-reprint-one"
                                            onClick={() => ticket.ticketCode && handleReprint([ticket.ticketCode])}
                                            disabled={!detail.reprintable || reprintBusy || !ticket.ticketCode}
                                            aria-label={`In lại vé ghế ${ticket.seat}`}
                                            title={detail.reprintBlockedReason ?? `In lại vé ghế ${ticket.seat}`}
                                        >
                                            In
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        {/* ---------- Thanh toán ---------- */}
                        <section className="bm-drawer-section">
                            <h4>Thanh toán</h4>
                            <dl className="bm-dl">
                                <dt>Tiền vé</dt>
                                <dd>{formatMoney(detail.subtotalAmount)}</dd>

                                {detail.discountAmount > 0 && (
                                    <>
                                        <dt>Giảm giá{detail.promotionCode ? ` (${detail.promotionCode})` : ""}</dt>
                                        <dd className="is-discount">−{formatMoney(detail.discountAmount)}</dd>
                                    </>
                                )}

                                <dt className="is-total">Tổng thanh toán</dt>
                                <dd className="is-total">{formatMoney(detail.totalAmount)}</dd>

                                <dt>Hình thức</dt>
                                <dd>{paymentLabel(payment?.method, payment?.provider)}</dd>

                                {isCash && payment?.cashReceived != null && (
                                    <>
                                        <dt>Khách đưa</dt>
                                        <dd>{formatMoney(payment.cashReceived)}</dd>
                                        <dt>Tiền thối</dt>
                                        <dd>{formatMoney(payment.changeAmount)}</dd>
                                    </>
                                )}

                                {payment?.transactionCode && (
                                    <>
                                        <dt>Mã giao dịch</dt>
                                        <dd className="is-code">{payment.transactionCode}</dd>
                                    </>
                                )}

                                {payment?.paidAt && (
                                    <>
                                        <dt>Thanh toán lúc</dt>
                                        <dd>{formatDateTime(payment.paidAt)}</dd>
                                    </>
                                )}

                                {detail.employeeName && (
                                    <>
                                        <dt>Nhân viên bán</dt>
                                        <dd>{detail.employeeName}</dd>
                                    </>
                                )}
                            </dl>
                        </section>
                    </div>
                )}
            </aside>

            {detail && printCodes && (
                <TicketPrintArea
                    tickets={printable.filter((t) => printCodes.includes(t.code))}
                    allTickets={printable}
                    show={{
                        movieTitle: detail.showtime.movieTitle,
                        startTime: detail.showtime.startTime,
                        roomName: detail.showtime.roomName,
                        format: detail.showtime.roomType,
                    }}
                    bookingCode={detail.bookingCode}
                    note="Bản in lại"
                    onDone={() => setPrintCodes(null)}
                />
            )}
        </div>
    );
}
