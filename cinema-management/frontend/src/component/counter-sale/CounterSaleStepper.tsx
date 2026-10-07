import { useEffect, useState } from "react";

import type { ShowtimeData } from "../../types/showtime/showtime";

import "./CounterSaleStepper.css";

/*
 * THANH TRẠNG THÁI BÁN VÉ TẠI QUẦY (dùng chung cho 4 trang)
 *   ① Suất chiếu ─ ② Ghế ─ ③ Khách hàng & Thanh toán ─ ④ Hoàn tất
 * Bước đã xong bấm được để quay lại. Bên phải: mã đơn, chế độ đoàn,
 * đồng hồ giữ ghế (+2 phút) và nút tạm gác.
 */

export type CounterStep = 1 | 2 | 3 | 4;

const STEPS: { id: CounterStep; label: string }[] = [
    { id: 1, label: "Suất chiếu" },
    { id: 2, label: "Ghế" },
    { id: 3, label: "Khách hàng & Thanh toán" },
    { id: 4, label: "Hoàn tất" },
];

const HOLD_WARNING_MS = 60_000;

type Props = {
    current: CounterStep;
    showtime?: ShowtimeData | null;
    seatCodes?: string[];
    orderCode?: string | null;
    isGroup?: boolean;
    // Mốc hết hạn giữ ghế theo đồng hồ máy này (ms); null = chưa giữ.
    holdExpiresAt?: number | null;
    extendsLeft?: number;
    extending?: boolean;
    onExtend?: () => void;
    onPark?: () => void;
    // Bấm vào bước đã hoàn thành để quay lại.
    onStepClick?: (step: CounterStep) => void;
};

function formatCountdown(ms: number): string {
    const total = Math.max(0, Math.ceil(ms / 1000));
    return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function formatTime(value?: string | null): string {
    if (!value) return "--:--";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "--:--"
        : date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
}

function formatDate(value?: string | null): string {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? ""
        : date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}

export default function CounterSaleStepper({
                                               current,
                                               showtime,
                                               seatCodes = [],
                                               orderCode,
                                               isGroup,
                                               holdExpiresAt,
                                               extendsLeft,
                                               extending,
                                               onExtend,
                                               onPark,
                                               onStepClick,
                                           }: Props) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        if (!holdExpiresAt) return;

        setNow(Date.now());
        const id = window.setInterval(() => setNow(Date.now()), 1_000);
        return () => window.clearInterval(id);
    }, [holdExpiresAt]);

    const remaining = holdExpiresAt ? holdExpiresAt - now : null;
    const showTimer = remaining !== null && current < 4;
    const warning = remaining !== null && remaining <= HOLD_WARNING_MS;

    return (
        <div className="cs-stepper" role="navigation" aria-label="Tiến trình bán vé">
            <ol className="cs-stepper-steps">
                {STEPS.map((step, index) => {
                    const done = step.id < current;
                    const active = step.id === current;
                    const clickable = done && !!onStepClick && current < 4;

                    return (
                        <li
                            key={step.id}
                            className={`cs-step ${done ? "is-done" : ""} ${active ? "is-active" : ""}`}
                        >
                            {index > 0 && <span className="cs-step-line" aria-hidden="true" />}

                            <button
                                type="button"
                                className="cs-step-button"
                                onClick={() => clickable && onStepClick?.(step.id)}
                                disabled={!clickable}
                                aria-current={active ? "step" : undefined}
                                title={clickable ? `Quay lại bước ${step.label}` : undefined}
                            >
                                <span className="cs-step-dot">{done ? "✓" : step.id}</span>
                                <span className="cs-step-label">{step.label}</span>
                            </button>
                        </li>
                    );
                })}
            </ol>

            {(showtime || orderCode) && (
                <div className="cs-stepper-summary">
                    {showtime && (
                        <span className="cs-stepper-movie" title={showtime.movieTitle}>
                            <b>{showtime.movieTitle}</b>
                            <small>
                                {formatTime(showtime.startTime)} {formatDate(showtime.startTime)}
                                {showtime.roomName ? ` · ${showtime.roomName}` : ""}
                                {seatCodes.length > 0
                                    ? ` · ${seatCodes.length > 6 ? `${seatCodes.length} ghế` : seatCodes.join(", ")}`
                                    : ""}
                            </small>
                        </span>
                    )}

                    {orderCode && <span className="cs-stepper-chip">Đơn {orderCode}</span>}
                    {isGroup && <span className="cs-stepper-chip is-group">Bao rạp</span>}

                    {showTimer && (
                        <span className={`cs-stepper-timer ${warning ? "is-warning" : ""}`} role="timer">
                            <span aria-hidden="true">⏱</span>
                            <b>{formatCountdown(remaining!)}</b>

                            {onExtend && (extendsLeft ?? 0) > 0 && (
                                <button
                                    type="button"
                                    onClick={onExtend}
                                    disabled={extending}
                                    title={`Gia hạn thêm 2 phút (còn ${extendsLeft} lần)`}
                                >
                                    +2 phút
                                </button>
                            )}
                        </span>
                    )}

                    {onPark && current < 4 && (
                        <button type="button" className="cs-stepper-park" onClick={onPark}>
                            Tạm gác đơn
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
