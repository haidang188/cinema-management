

export type QrProvider = "MOMO" | "VNPAY" | "VIETQR";

export type QrPaymentStatus = "PENDING" | "PAID" | "FAILED" | "EXPIRED";

export type QrPayment = {
    provider: QrProvider;
    // Mã giao dịch, backend dùng để đối soát IPN (MoMo orderId / VNPay vnp_TxnRef).
    reference: string;
    amount: number;
    // Một trong hai: ảnh QR có sẵn, hoặc chuỗi nội dung để frontend tự vẽ QR.
    qrImageUrl?: string;
    qrContent?: string;
    // Link thanh toán dự phòng (mở trên máy khách / điện thoại).
    payUrl?: string;
    expiresAt?: string;
    // true = không có xác nhận tự động (VietQR), nhân viên tự xác nhận.
    manual: boolean;
    // Thông tin hiển thị cho VietQR.
    bankName?: string;
    accountNo?: string;
    accountName?: string;
    transferNote?: string;
};

export type CreateQrPaymentRequest = {
    provider: Exclude<QrProvider, "VIETQR">;
    showtimeId: number;
    showtimeSeatIds: number[];
    amount: number;
    orderInfo: string;
};

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

const API_BASE_URL = env.VITE_API_BASE_URL ?? "http://localhost:8080";

// Cấu hình tài khoản nhận tiền cho VietQR (đặt trong file .env của frontend).
// VITE_VIETQR_BANK_ID: mã ngân hàng theo VietQR, vd "VCB", "MB", "TCB", "970436".
export const VIETQR_CONFIG = {
    bankId: env.VITE_VIETQR_BANK_ID ?? "",
    bankName: env.VITE_VIETQR_BANK_NAME ?? env.VITE_VIETQR_BANK_ID ?? "",
    accountNo: env.VITE_VIETQR_ACCOUNT_NO ?? "",
    accountName: env.VITE_VIETQR_ACCOUNT_NAME ?? "",
    template: env.VITE_VIETQR_TEMPLATE ?? "compact2",
};

export function isVietQrConfigured(): boolean {
    return Boolean(VIETQR_CONFIG.bankId && VIETQR_CONFIG.accountNo);
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
    const token = localStorage.getItem("token") ?? localStorage.getItem("accessToken");

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...init?.headers,
        },
    });

    if (!response.ok) {
        let message = `Yêu cầu thất bại (HTTP ${response.status})`;

        try {
            const body = await response.json();
            message = body?.message ?? body?.error ?? message;
        } catch {
            // body không phải JSON
        }

        throw new Error(message);
    }

    if (response.status === 204) {
        return undefined as T;
    }

    return response.json() as Promise<T>;
}

/* ================= MOMO / VNPAY (qua backend) ================= */

export async function createGatewayQrPayment(
    payload: CreateQrPaymentRequest
): Promise<QrPayment> {
    const data = await request<Omit<QrPayment, "manual">>("/api/payments/qr", {
        method: "POST",
        body: JSON.stringify(payload),
    });

    return { ...data, provider: payload.provider, manual: false };
}

export async function getQrPaymentStatus(reference: string): Promise<QrPaymentStatus> {
    const data = await request<{ status: QrPaymentStatus }>(
        `/api/payments/qr/${encodeURIComponent(reference)}`
    );

    return data.status;
}

export async function cancelQrPayment(reference: string): Promise<void> {
    await request<void>(`/api/payments/qr/${encodeURIComponent(reference)}`, {
        method: "DELETE",
    });
}

/* ================= VIETQR (tạo tại chỗ) ================= */

// Nội dung chuyển khoản: không dấu, không ký tự đặc biệt, tối đa 25 ký tự.
export function buildTransferNote(showtimeId: number): string {
    const suffix = Date.now().toString(36).toUpperCase().slice(-6);
    return `PC${showtimeId}${suffix}`.slice(0, 25);
}

export function createVietQrPayment(amount: number, transferNote: string): QrPayment {
    const { bankId, bankName, accountNo, accountName, template } = VIETQR_CONFIG;

    const params = new URLSearchParams({
        amount: String(Math.round(amount)),
        addInfo: transferNote,
    });

    if (accountName) {
        params.set("accountName", accountName);
    }

    return {
        provider: "VIETQR",
        reference: transferNote,
        amount,
        qrImageUrl: `https://img.vietqr.io/image/${encodeURIComponent(
            bankId
        )}-${encodeURIComponent(accountNo)}-${template}.png?${params.toString()}`,
        manual: true,
        bankName,
        accountNo,
        accountName,
        transferNote,
    };
}