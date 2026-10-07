import { useEffect, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { isValidPhone, lookupCustomer, normalizePhone } from "../../service/counterOrder/counterOrderService";

import "./CounterSaleStepper.css";

/* ============================================================
 * KHUNG HỘP THOẠI DÙNG CHUNG
 * ============================================================ */

type DialogProps = {
    open: boolean;
    title: string;
    description?: ReactNode;
    busy?: boolean;
    error?: string;
    confirmLabel: string;
    onCancel: () => void;
    onSubmit: () => void;
    children?: ReactNode;
};

function Dialog({ open, title, description, busy, error, confirmLabel, onCancel, onSubmit, children }: DialogProps) {
    const panelRef = useRef<HTMLFormElement>(null);

    // Giữ hàm mới nhất trong ref: trang cha render lại mỗi giây (đồng hồ giữ ghế)
    // nên onCancel / busy đổi liên tục; không được để effect focus chạy lại theo chúng.
    const onCancelRef = useRef(onCancel);
    const busyRef = useRef(busy);
    onCancelRef.current = onCancel;
    busyRef.current = busy;

    // Chỉ focus ô đầu tiên MỘT LẦN khi vừa mở hộp thoại.
    useEffect(() => {
        if (!open) return;

        panelRef.current?.querySelector<HTMLInputElement>("input")?.focus();

        function onKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape" && !busyRef.current) onCancelRef.current();
        }

        window.addEventListener("keydown", onKeyDown);
        return () => window.removeEventListener("keydown", onKeyDown);
    }, [open]);

    if (!open) return null;

    function handleSubmit(event: FormEvent) {
        event.preventDefault();
        if (!busy) onSubmit();
    }

    return (
        <div
            className="cs-dialog-backdrop"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget && !busy) onCancel();
            }}
        >
            <form ref={panelRef} className="cs-dialog" role="dialog" aria-modal="true" onSubmit={handleSubmit}>
                <h2>{title}</h2>
                {description && <p className="cs-dialog-desc">{description}</p>}

                {children}

                {error && (
                    <div className="cs-dialog-error" role="alert">
                        {error}
                    </div>
                )}

                <div className="cs-dialog-actions">
                    <button type="button" className="cs-dialog-btn is-ghost" onClick={onCancel} disabled={busy}>
                        Huỷ
                    </button>
                    <button type="submit" className="cs-dialog-btn is-primary" disabled={busy}>
                        {busy ? "Đang xử lý…" : confirmLabel}
                    </button>
                </div>
            </form>
        </div>
    );
}

/* ============================================================
 * Ô NHẬP KHÁCH HÀNG (tra khách cũ theo SĐT)
 * ============================================================ */

type CustomerFieldsProps = {
    name: string;
    phone: string;
    required?: boolean;
    onNameChange: (value: string) => void;
    onPhoneChange: (value: string) => void;
};

export function CustomerFields({ name, phone, required, onNameChange, onPhoneChange }: CustomerFieldsProps) {
    const [hint, setHint] = useState("");
    const nameRef = useRef(name);

    nameRef.current = name;

    // Nhập đủ SĐT hợp lệ -> tra khách cũ, tự điền tên nếu ô tên đang trống.
    useEffect(() => {
        setHint("");

        if (!isValidPhone(phone)) return;

        let cancelled = false;

        const timer = window.setTimeout(async () => {
            try {
                const result = await lookupCustomer(normalizePhone(phone));

                if (cancelled) return;

                if (result.found) {
                    if (!nameRef.current.trim() && result.fullName) onNameChange(result.fullName);
                    setHint(`Khách quen · đã mua ${result.visitCount} lần`);
                } else {
                    setHint("Khách mới");
                }
            } catch {
                // Tra cứu lỗi không chặn việc bán vé.
            }
        }, 350);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [phone]);

    const phoneInvalid = phone.trim() !== "" && !isValidPhone(phone);

    return (
        <div className="cs-customer-fields">
            <label>
                <span>
                    Số điện thoại {required ? <em>*</em> : <small>(không bắt buộc)</small>}
                </span>
                <input
                    type="tel"
                    inputMode="tel"
                    autoComplete="off"
                    placeholder="0901 234 567"
                    value={phone}
                    onChange={(event) => onPhoneChange(event.target.value)}
                    aria-invalid={phoneInvalid}
                />
                {phoneInvalid ? (
                    <small className="is-error">10 số, bắt đầu bằng 03/05/07/08/09</small>
                ) : (
                    hint && <small className="is-hint">{hint}</small>
                )}
            </label>

            <label>
                <span>
                    Tên khách {required ? <em>*</em> : <small>(không bắt buộc)</small>}
                </span>
                <input
                    type="text"
                    autoComplete="off"
                    placeholder="Nguyễn Văn A"
                    maxLength={100}
                    value={name}
                    onChange={(event) => onNameChange(event.target.value)}
                />
            </label>
        </div>
    );
}

/* ============================================================
 * TẠM GÁC ĐƠN
 * ============================================================ */

type ParkDialogProps = {
    open: boolean;
    busy?: boolean;
    error?: string;
    initialName?: string;
    initialPhone?: string;
    onCancel: () => void;
    onSubmit: (name: string, phone: string) => void;
};

export function ParkOrderDialog({ open, busy, error, initialName = "", initialPhone = "", onCancel, onSubmit }: ParkDialogProps) {
    const [name, setName] = useState(initialName);
    const [phone, setPhone] = useState(initialPhone);
    const [localError, setLocalError] = useState("");

    useEffect(() => {
        if (open) {
            setName(initialName);
            setPhone(initialPhone);
            setLocalError("");
        }
    }, [open, initialName, initialPhone]);

    function submit() {
        if (!name.trim() || !isValidPhone(phone)) {
            setLocalError("Cần tên và số điện thoại hợp lệ để liên lạc khi khách quay lại.");
            return;
        }

        onSubmit(name.trim(), normalizePhone(phone));
    }

    return (
        <Dialog
            open={open}
            title="Tạm gác đơn"
            description={
                <>
                    Ghế tiếp tục được giữ <b>15 phút</b> để khách đi lấy tiền / chuyển khoản. Quầy phục vụ khách tiếp theo;
                    đơn mở lại được ở <b>bất kỳ quầy nào</b> trong mục "Đơn đang tạm gác".
                </>
            }
            busy={busy}
            error={localError || error}
            confirmLabel="Tạm gác"
            onCancel={onCancel}
            onSubmit={submit}
        >
            <CustomerFields name={name} phone={phone} required onNameChange={setName} onPhoneChange={setPhone} />
        </Dialog>
    );
}
