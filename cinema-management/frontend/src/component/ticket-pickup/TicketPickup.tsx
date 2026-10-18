import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";

import {
    confirmPickup,
    getPickupInfo,
    pickupErrorMessage,
    searchPickup,
} from "../../service/ticket-pickup/ticketPickupService";
import type { PickupBookingItem, PickupInfo } from "../../service/ticket-pickup/ticketPickupService";
import { reprintTickets } from "../../service/bookingManagement/bookingManagementService";
import { TicketPrintArea, seatKindLabel } from "../ticket-print/TicketPrint";
import type { PrintableTicket } from "../ticket-print/TicketPrint";
import QrCameraScanner from "./QrCameraScanner";

import "./TicketPickup.css";


type View =
    | { kind: "idle" }
    | { kind: "searching" }
    | { kind: "empty"; keyword: string }
    | { kind: "list"; items: PickupBookingItem[] }
    | { kind: "info"; info: PickupInfo };

const PAYMENT_LABEL: Record<string, string> = {
    CASH: "Tiền mặt",
    TRANSFER: "Chuyển khoản",
    MOMO: "MoMo",
    VNPAY: "VNPay",
    VIETQR: "VietQR",
    CARD: "Thẻ",
};

function formatMoney(value?: number | null): string {
    return `${Math.round(Number(value) || 0).toLocaleString("vi-VN")}đ`;
}

function formatTime(value?: string | null): string {
    if (!value) return "--:--";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? "--:--"
        : d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(value?: string | null, weekday = false): string {
    if (!value) return "";
    const d = new Date(value);
    return Number.isNaN(d.getTime())
        ? ""
        : d.toLocaleDateString("vi-VN", {
            ...(weekday ? { weekday: "long" as const } : {}),
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
}

export default function TicketPickup() {
    const [keyword, setKeyword] = useState("");
    const [view, setView] = useState<View>({ kind: "idle" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);
    const [notice, setNotice] = useState("");
    // Vé đang in (sau khi xác nhận hoặc in lại).
    const [printing, setPrinting] = useState<{ tickets: PrintableTicket[]; note: string } | null>(null);
    const [cameraOpen, setCameraOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    useEffect(() => {
        if (!notice) return;
        const id = window.setTimeout(() => setNotice(""), 6_000);
        return () => window.clearTimeout(id);
    }, [notice]);


    function handleSearch(event?: FormEvent) {
        event?.preventDefault();
        runSearch(keyword.trim());
    }

    // Camera đọc được mã: điền vào ô tìm (để nhân viên thấy mã đã quét) rồi tìm luôn.
    function handleScanned(text: string) {
        setCameraOpen(false);
        setKeyword(text);
        runSearch(text);
    }

    async function runSearch(value: string) {
        if (!value) return;

        setError("");
        setView({ kind: "searching" });

        try {
            const items = await searchPickup(value);

            if (items.length === 0) {
                setView({ kind: "empty", keyword: value });
            } else if (items.length === 1) {
                await openInfo(items[0].id);
            } else {
                setView({ kind: "list", items });
            }
        } catch (err) {
            setView({ kind: "idle" });
            setError(pickupErrorMessage(err, "Không tìm được đơn."));
        }
    }

    async function openInfo(bookingId: number) {
        setError("");

        try {
            setView({ kind: "info", info: await getPickupInfo(bookingId) });
        } catch (err) {
            setError(pickupErrorMessage(err, "Không tải được thông tin đơn."));
        }
    }

    function nextCustomer() {
        setKeyword("");
        setView({ kind: "idle" });
        setError("");
        window.requestAnimationFrame(() => inputRef.current?.focus());
    }


    function toPrintable(info: PickupInfo): PrintableTicket[] {
        return info.tickets
            .filter((t) => t.ticketCode)
            .map((t) => ({
                code: t.ticketCode!,
                qrValue: t.qrToken,
                seatLabel: t.seat,
                seatKind: seatKindLabel(t.seatType),
            }));
    }

    async function handleConfirm(info: PickupInfo) {
        if (busy) return;

        setBusy(true);
        setError("");

        try {
            const updated = await confirmPickup(info.id);
            setView({ kind: "info", info: updated });
            setNotice(`Đã giao vé đơn ${updated.bookingCode}.`);
            setPrinting({ tickets: toPrintable(updated), note: "Nhận vé tại quầy" });
        } catch (err) {
            setError(pickupErrorMessage(err, "Không xác nhận được."));
            openInfo(info.id);
        } finally {
            setBusy(false);
        }
    }

    async function handleReprint(info: PickupInfo) {
        if (busy) return;

        setBusy(true);
        setError("");

        try {
            await reprintTickets(info.id);
            setPrinting({ tickets: toPrintable(info), note: "Bản in lại" });
        } catch (err) {
            setError(pickupErrorMessage(err, "Không in lại được vé."));
        } finally {
            setBusy(false);
        }
    }


    const info = view.kind === "info" ? view.info : null;

    return (
        <div className="tp-page">
            <header className="tp-header">
                <div>
                    <h1>Nhận vé</h1>
                    <p>Khách đặt online tới quầy lấy vé in</p>
                </div>
            </header>

            <form className="tp-search" onSubmit={handleSearch}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 7V4h3M21 7V4h-3M3 17v3h3M21 17v3h-3M7 12h10" />
                </svg>
                <input
                    ref={inputRef}
                    value={keyword}
                    onChange={(event) => setKeyword(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === "Escape") nextCustomer();
                    }}
                    placeholder="Quét mã QR của khách, hoặc nhập mã đặt vé / mã vé / số điện thoại"
                    aria-label="Tìm đơn để nhận vé"
                    autoComplete="off"
                />
                <button
                    type="button"
                    className={`tp-cam-btn${cameraOpen ? " is-active" : ""}`}
                    onClick={() => setCameraOpen((open) => !open)}
                    aria-pressed={cameraOpen}
                    title="Dùng camera của máy để quét mã QR trên điện thoại / vé của khách"
                >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M4 8a2 2 0 0 1 2-2h1.5l1.5-2h6l1.5 2H18a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
                        <circle cx="12" cy="12.5" r="3.5" />
                    </svg>
                    {cameraOpen ? "Đang quét" : "Quét bằng camera"}
                </button>
                <button type="submit" disabled={!keyword.trim() || view.kind === "searching"}>
                    {view.kind === "searching" ? "Đang tìm…" : "Tìm"}
                </button>
            </form>

            {cameraOpen && (
                <QrCameraScanner onDetected={handleScanned} onClose={() => setCameraOpen(false)} />
            )}

            {error && (
                <div className="tp-alert is-error" role="alert">
                    {error}
                </div>
            )}

            {notice && (
                <div className="tp-alert is-ok" role="status">
                    {notice}
                </div>
            )}

            {view.kind === "idle" && !cameraOpen && (
                <div className="tp-empty">
                    <strong>Sẵn sàng nhận vé</strong>
                    <span>Quét mã QR trong email / ứng dụng của khách, hoặc hỏi mã đặt vé, số điện thoại.</span>
                </div>
            )}

            {view.kind === "empty" && (
                <div className="tp-empty">
                    <strong>Không tìm thấy đơn cho “{view.keyword}”</strong>
                    <span>
                        Tìm theo số điện thoại chỉ ra các đơn online đã thanh toán, suất chưa chiếu xong. Kiểm tra lại
                        mã hoặc hỏi khách mã đặt vé.
                    </span>
                </div>
            )}

            {view.kind === "list" && (
                <section className="tp-list" aria-label="Các đơn khớp">
                    <h2>{view.items.length} đơn khớp, chọn đơn khách cần nhận</h2>

                    {view.items.map((item) => (
                        <button key={item.id} type="button" className="tp-list-item" onClick={() => openInfo(item.id)}>
                            <span className="tp-poster">
                                {item.posterUrl && <img src={item.posterUrl} alt="" />}
                            </span>
                            <span className="tp-list-main">
                                <b>{item.movieTitle}</b>
                                <span>
                                    {formatTime(item.startTime)} {formatDate(item.startTime)}, {item.roomName}, ghế{" "}
                                    {item.seats.join(", ")}
                                </span>
                                <code>{item.bookingCode}</code>
                            </span>
                            <span className={`tp-pill ${item.pickedUp ? "is-done" : item.canPickUp ? "is-ok" : "is-bad"}`}>
                                {item.pickedUp ? "Đã nhận" : item.canPickUp ? "Chưa nhận" : "Không giao được"}
                            </span>
                        </button>
                    ))}
                </section>
            )}

            {info && (
                <section className="tp-info" aria-label="Thông tin nhận vé">
                    <div
                        className={`tp-banner ${info.canPickUp ? "is-ok" : info.pickup.pickedUp ? "is-done" : "is-bad"}`}
                        role="status"
                    >
                        <strong>
                            {info.canPickUp
                                ? `Giao được ${info.tickets.length} vé`
                                : info.pickup.pickedUp
                                    ? "Khách đã nhận vé"
                                    : "Không giao vé được"}
                        </strong>
                        {info.blockedReason && <span>{info.blockedReason}</span>}
                    </div>

                    <div className="tp-grid">
                        <div className="tp-card tp-movie">
                            <span className="tp-poster is-large">
                                {info.showtime.posterUrl && <img src={info.showtime.posterUrl} alt="" />}
                            </span>
                            <div>
                                <span className="tp-label">Đơn {info.bookingCode}</span>
                                <h2>{info.showtime.movieTitle}</h2>
                                <p className="tp-time">
                                    {formatTime(info.showtime.startTime)}
                                    {info.showtime.endTime ? ` – ${formatTime(info.showtime.endTime)}` : ""}
                                </p>
                                <p>{formatDate(info.showtime.startTime, true)}</p>
                                <p>
                                    {info.showtime.roomName}
                                    {info.showtime.roomType ? `, ${info.showtime.roomType}` : ""}
                                </p>
                            </div>
                        </div>

                        <div className="tp-card">
                            <h3>Khách hàng</h3>
                            <dl className="tp-dl">
                                <dt>Tên</dt>
                                <dd>{info.customer.name ?? "—"}</dd>
                                <dt>Điện thoại</dt>
                                <dd>{info.customer.phone ?? "—"}</dd>
                                {info.customer.email && (
                                    <>
                                        <dt>Email</dt>
                                        <dd>{info.customer.email}</dd>
                                    </>
                                )}
                            </dl>

                            <h3>Thanh toán</h3>
                            <dl className="tp-dl">
                                <dt>Tổng tiền</dt>
                                <dd className="is-strong">{formatMoney(info.totalAmount)}</dd>
                                <dt>Hình thức</dt>
                                <dd>{info.paymentMethod ? PAYMENT_LABEL[info.paymentMethod.toUpperCase()] ?? info.paymentMethod : "—"}</dd>
                                {info.paidAt && (
                                    <>
                                        <dt>Thanh toán lúc</dt>
                                        <dd>
                                            {formatTime(info.paidAt)} {formatDate(info.paidAt)}
                                        </dd>
                                    </>
                                )}
                            </dl>
                        </div>

                        <div className="tp-card">
                            <h3>{info.tickets.length} vé</h3>
                            <ul className="tp-seats">
                                {info.tickets.map((t) => (
                                    <li key={t.seat}>
                                        <b>{t.seat}</b>
                                        <span>{seatKindLabel(t.seatType)}</span>
                                        <code>{t.ticketCode ?? "Chưa xuất vé"}</code>
                                    </li>
                                ))}
                            </ul>

                            <h3>Nhận vé</h3>
                            <dl className="tp-dl">
                                <dt>Trạng thái</dt>
                                <dd className={info.pickup.pickedUp ? "is-done" : ""}>
                                    {info.pickup.pickedUp ? "Đã nhận" : "Chưa nhận"}
                                </dd>
                                {info.pickup.pickedUpAt && (
                                    <>
                                        <dt>Nhận lúc</dt>
                                        <dd>
                                            {formatTime(info.pickup.pickedUpAt)} {formatDate(info.pickup.pickedUpAt)}
                                        </dd>
                                    </>
                                )}
                                {info.pickup.pickedUpBy && (
                                    <>
                                        <dt>Nhân viên giao</dt>
                                        <dd>{info.pickup.pickedUpBy}</dd>
                                    </>
                                )}
                            </dl>
                        </div>
                    </div>

                    <div className="tp-actions">
                        <button type="button" className="tp-btn is-ghost" onClick={nextCustomer}>
                            Khách tiếp theo
                        </button>

                        {info.pickup.pickedUp ? (
                            <button
                                type="button"
                                className="tp-btn is-ghost"
                                onClick={() => handleReprint(info)}
                                disabled={busy}
                                title="Khách làm mất vé: in lại cùng mã vé"
                            >
                                In lại vé
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="tp-btn is-primary"
                                onClick={() => handleConfirm(info)}
                                disabled={!info.canPickUp || busy}
                            >
                                {busy ? "Đang xác nhận…" : `Xác nhận nhận vé và in ${info.tickets.length} vé`}
                            </button>
                        )}
                    </div>
                </section>
            )}

            {info && printing && (
                <TicketPrintArea
                    tickets={printing.tickets}
                    show={{
                        movieTitle: info.showtime.movieTitle,
                        startTime: info.showtime.startTime,
                        roomName: info.showtime.roomName,
                        format: info.showtime.roomType,
                    }}
                    bookingCode={info.bookingCode}
                    note={printing.note}
                    onDone={() => setPrinting(null)}
                />
            )}
        </div>
    );
}
