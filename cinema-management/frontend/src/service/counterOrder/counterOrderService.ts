import { clearHoldToken, client, setHoldToken } from "../seatHold/seatHoldService";
import type { ShowtimeData } from "../../types/showtime/showtime";

/*
 * ĐƠN NHÁP BÁN VÉ TẠI QUẦY + KHÁCH HÀNG + MÃ GIẢM GIÁ
 * Ghế giữ theo đơn (holdToken của đơn), nên đơn tạm gác mở lại được ở quầy khác.
 */

export type CounterOrderMode = "NORMAL" | "GROUP";
export type CounterOrderStatus = "DRAFT" | "PARKED" | "COMPLETED" | "EXPIRED" | "CANCELLED";

export type CounterOrderDto = {
    code: string;
    holdToken: string | null;
    showtimeId: number;
    mode: CounterOrderMode;
    status: CounterOrderStatus;
    // null = không giới hạn (đơn đoàn)
    maxSeats: number | null;
    extendCount: number;
    maxExtends: number;
    expiresInSeconds: number | null;
    heldSeatIds: number[];
    customerName: string | null;
    customerPhone: string | null;
    showtime: ShowtimeData | null;
};

export type CustomerLookupDto = {
    found: boolean;
    id: number | null;
    phone: string | null;
    fullName: string | null;
    visitCount: number;
};

export type PromotionQuoteDto = {
    valid: boolean;
    promotionId: number | null;
    code: string | null;
    title: string | null;
    discountType: string | null;
    discountValue: number | null;
    orderAmount: number;
    discountAmount: number;
    finalAmount: number;
    message: string;
};

export type SalePreviewDto = {
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    promotion: PromotionQuoteDto | null;
};

/* ================= ĐƠN HIỆN TẠI CỦA TAB ================= */

const ORDER_KEY = "premiere.counterOrder";

type StoredOrder = { code: string; showtimeId: number };

export function getCurrentOrderRef(): StoredOrder | null {
    try {
        const raw = sessionStorage.getItem(ORDER_KEY);
        return raw ? (JSON.parse(raw) as StoredOrder) : null;
    } catch {
        return null;
    }
}

/** Gắn đơn vào tab: mọi API giữ / nhả / bán sau đó dùng holdToken của đơn. */
export function setCurrentOrder(order: CounterOrderDto): void {
    try {
        sessionStorage.setItem(ORDER_KEY, JSON.stringify({ code: order.code, showtimeId: order.showtimeId }));
    } catch {
        // bỏ qua
    }

    if (order.holdToken) setHoldToken(order.holdToken);
}

export function clearCurrentOrder(): void {
    try {
        sessionStorage.removeItem(ORDER_KEY);
    } catch {
        // bỏ qua
    }

    clearHoldToken();
}

export function isActiveOrder(order: CounterOrderDto | null | undefined): order is CounterOrderDto {
    return !!order && (order.status === "DRAFT" || order.status === "PARKED");
}

/* ================= API ĐƠN ================= */

export async function createCounterOrder(showtimeId: number): Promise<CounterOrderDto> {
    const { data } = await client.post<CounterOrderDto>("/api/counter-orders", { showtimeId });
    return data;
}

export async function getCounterOrder(code: string): Promise<CounterOrderDto> {
    const { data } = await client.get<CounterOrderDto>(`/api/counter-orders/${code}`);
    return data;
}

export async function extendCounterOrder(code: string): Promise<CounterOrderDto> {
    const { data } = await client.post<CounterOrderDto>(`/api/counter-orders/${code}/extend`);
    return data;
}

export async function parkCounterOrder(
    code: string,
    customerName: string,
    customerPhone: string
): Promise<CounterOrderDto> {
    const { data } = await client.post<CounterOrderDto>(`/api/counter-orders/${code}/park`, {
        customerName,
        customerPhone,
    });
    return data;
}

export async function resumeCounterOrder(code: string): Promise<CounterOrderDto> {
    const { data } = await client.post<CounterOrderDto>(`/api/counter-orders/${code}/resume`);
    return data;
}

export async function cancelCounterOrder(code: string): Promise<CounterOrderDto> {
    const { data } = await client.post<CounterOrderDto>(`/api/counter-orders/${code}/cancel`);
    return data;
}

/** Đơn đoàn / bao rạp: bỏ giới hạn số ghế, giữ ghế 15 phút. */
export async function enableGroupMode(code: string): Promise<CounterOrderDto> {
    const { data } = await client.post<CounterOrderDto>(`/api/counter-orders/${code}/group`);
    return data;
}

export async function listParkedOrders(): Promise<CounterOrderDto[]> {
    const { data } = await client.get<CounterOrderDto[]>("/api/counter-orders/parked");
    return Array.isArray(data) ? data : [];
}

/* ================= KHÁCH HÀNG ================= */

export async function lookupCustomer(phone: string): Promise<CustomerLookupDto> {
    const { data } = await client.get<CustomerLookupDto>("/api/customers/lookup", { params: { phone } });
    return data;
}

/** Chuẩn hoá giống backend: bỏ khoảng trắng / dấu chấm, +84 -> 0. */
export function normalizePhone(raw: string): string {
    let digits = raw.replace(/[\s.\-()]/g, "");

    if (digits.startsWith("+84")) digits = `0${digits.slice(3)}`;
    else if (digits.startsWith("84") && digits.length === 11) digits = `0${digits.slice(2)}`;

    return digits;
}

export function isValidPhone(raw: string): boolean {
    return /^0[35789]\d{8}$/.test(normalizePhone(raw));
}

/** 0901234567 -> 0901 *** 567 (in trên vé / màn hình). */
export function maskPhone(phone?: string | null): string {
    if (!phone || phone.length < 7) return phone ?? "";
    return `${phone.slice(0, 4)} *** ${phone.slice(-3)}`;
}

/* ================= GIÁ + MÃ GIẢM GIÁ ================= */

export async function previewSaleWithPromotion(
    showtimeId: number,
    showtimeSeatIds: number[],
    promotionCode?: string | null
): Promise<SalePreviewDto> {
    const { data } = await client.post<SalePreviewDto>("/api/counter-sales/preview", {
        showtimeId,
        showtimeSeatIds,
        promotionCode: promotionCode || null,
    });

    return {
        totalAmount: Number(data.totalAmount) || 0,
        discountAmount: Number(data.discountAmount) || 0,
        finalAmount: Number(data.finalAmount) || 0,
        promotion: data.promotion ?? null,
    };
}

export async function listApplicablePromotions(orderAmount: number): Promise<PromotionQuoteDto[]> {
    const { data } = await client.get<PromotionQuoteDto[]>("/api/counter-sales/promotions", {
        params: { orderAmount },
    });
    return Array.isArray(data) ? data : [];
}