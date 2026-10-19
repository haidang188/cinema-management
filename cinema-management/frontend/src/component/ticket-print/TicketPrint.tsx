import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { QRCodeSVG } from "qrcode.react";

import "./TicketPrint.css";

export type PrintableTicket = {
    code: string;
    seatLabel: string;
    seatKind?: string;
};

export type TicketShowInfo = {
    movieTitle: string;
    startTime: string;
    roomName: string;
    // vd "2D", "IMAX"
    format?: string | null;
};


function formatTime(value?: string | null): string {
    if (!value) return "--:--";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? "--:--"
        : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(value?: string | null): string {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Chuẩn hoá loại ghế từ mã backend (NORMAL / VIP / COUPLE...). */
export function seatKindLabel(type?: string | null): string {
    const value = String(type ?? "").toUpperCase();

    if (/COUPLE|DOUBLE|SWEET/.test(value)) return "Ghế đôi";
    if (/VIP|PREMIUM/.test(value)) return "VIP";

    return "Thường";
}


type TicketCardProps = {
    ticket: PrintableTicket;
    show: TicketShowInfo;
    bookingCode: string;
    index: number;
    total: number;

    onPrint?: () => void;
    onCopy?: () => void;
    copied?: boolean;
};

export function TicketCard({ ticket, show, bookingCode, index, total, onPrint, onCopy, copied }: TicketCardProps) {
    const kind = ticket.seatKind ?? "Thường";

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

                <h3 title={show.movieTitle}>{show.movieTitle}</h3>

                <dl className="cs-ticket-grid">
                    <div>
                        <dt>Ngày</dt>
                        <dd>{formatDate(show.startTime)}</dd>
                    </div>
                    <div>
                        <dt>Suất</dt>
                        <dd className="is-big">{formatTime(show.startTime)}</dd>
                    </div>
                    <div>
                        <dt>Phòng</dt>
                        <dd>{show.roomName}</dd>
                    </div>
                    <div>
                        <dt>Ghế</dt>
                        <dd className="is-seat">
                            {ticket.seatLabel || "--"}
                            {ticket.seatLabel && <small>{kind}</small>}
                        </dd>
                    </div>
                </dl>

                <footer>
                    <span>{show.format || "2D"}</span>
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


type TicketPrintAreaProps = {

    tickets: PrintableTicket[];

    allTickets?: PrintableTicket[];
    show: TicketShowInfo;
    bookingCode: string;
    note?: string;
    onPrinted?: () => void;
    onDone: () => void;
};

export function TicketPrintArea({
                                    tickets,
                                    allTickets,
                                    show,
                                    bookingCode,
                                    note,
                                    onPrinted,
                                    onDone,
                                }: TicketPrintAreaProps) {
    const onPrintedRef = useRef(onPrinted);
    const onDoneRef = useRef(onDone);
    onPrintedRef.current = onPrinted;
    onDoneRef.current = onDone;

    useEffect(() => {
        function handleAfterPrint() {
            onDoneRef.current();
        }

        window.addEventListener("afterprint", handleAfterPrint);

        // Đợi React vẽ xong vùng in rồi mới mở hộp thoại in.
        const id = window.requestAnimationFrame(() => {
            onPrintedRef.current?.();
            window.print();
        });

        return () => {
            window.cancelAnimationFrame(id);
            window.removeEventListener("afterprint", handleAfterPrint);
        };
    }, []);

    const numbering = allTickets ?? tickets;
    const printedAt = new Date().toLocaleString("vi-VN");

    return createPortal(
        <div className="cs-print-area" aria-hidden="true">
            {tickets.map((ticket) => {
                const index = Math.max(0, numbering.findIndex((item) => item.code === ticket.code));

                return (
                    <div className="cs-print-page" key={ticket.code}>
                        <TicketCard
                            ticket={ticket}
                            show={show}
                            bookingCode={bookingCode}
                            index={index}
                            total={numbering.length}
                        />
                        <p className="cs-print-note">
                            {note ? `${note} · ` : ""}In lúc {printedAt}
                        </p>
                    </div>
                );
            })}
        </div>,
        document.body
    );
}
