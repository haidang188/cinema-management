import { client } from "../seatHold/seatHoldService";

export type BookingChannel = "COUNTER" | "ONLINE";

export type BookingSort = "NEWEST" | "OLDEST" | "UPCOMING";

export type BookingSearchParams = {
    keyword?: string;
    channel?: "ALL" | BookingChannel;
    status?: string;
    showFrom?: string;
    showTo?: string;
    createdFrom?: string;
    createdTo?: string;
    movieId?: number;
    showtimeId?: number;
    sort?: BookingSort;
    page?: number;
    size?: number;
};

export type PageResponse<T> = {
    items: T[];
    page: number;
    size: number;
    totalItems: number;
    totalPages: number;
};

export type BookingListItem = {
    id: number;
    bookingCode: string;
    channel: BookingChannel | string;
    status: string;
    customerName: string | null;
    customerPhone: string | null;
    movieTitle: string;
    posterUrl: string | null;
    showtimeStart: string;
    roomName: string;
    seats: string[];
    totalAmount: number;
    discountAmount: number;
    paymentMethod: string | null;
    paymentStatus: string | null;
    employeeName: string | null;
    createdAt: string;
};

export type BookingDetail = {
    id: number;
    bookingCode: string;
    channel: BookingChannel | string;
    status: string;
    createdAt: string;
    customer: { name: string | null; phone: string | null };
    showtime: {
        id: number;
        movieTitle: string;
        posterUrl: string | null;
        startTime: string;
        endTime: string | null;
        roomName: string;
        roomType: string | null;
    };
    tickets: {
        seat: string;
        seatType: string | null;
        price: number;
        ticketCode: string | null;
        ticketStatus: string | null;
        issuedAt: string | null;

        reprintCount: number;
        lastReprintedAt: string | null;
    }[];
    payment: {
        method: string | null;
        provider: string | null;
        status: string | null;
        amount: number;
        cashReceived: number | null;
        changeAmount: number | null;
        transactionCode: string | null;
        paidAt: string | null;
    } | null;
    subtotalAmount: number;
    discountAmount: number;
    totalAmount: number;
    promotionCode: string | null;
    employeeName: string | null;

    reprintable: boolean;
    reprintBlockedReason: string | null;
};


function cleanParams(params: BookingSearchParams): Record<string, string | number> {
    const result: Record<string, string | number> = {};

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "" || value === "ALL") return;
        result[key] = value as string | number;
    });

    return result;
}

export async function searchBookings(params: BookingSearchParams): Promise<PageResponse<BookingListItem>> {
    const { data } = await client.get<PageResponse<BookingListItem>>("/api/booking-management", {
        params: cleanParams(params),
    });

    return {
        ...data,
        items: (data.items ?? []).map((item) => ({
            ...item,
            totalAmount: Number(item.totalAmount) || 0,
            discountAmount: Number(item.discountAmount) || 0,
        })),
    };
}

export async function getBookingDetail(id: number): Promise<BookingDetail> {
    const { data } = await client.get<BookingDetail>(`/api/booking-management/${id}`);
    return data;
}

export async function reprintTickets(id: number, ticketCodes: string[] = []): Promise<BookingDetail> {
    const { data } = await client.post<BookingDetail>(`/api/booking-management/${id}/reprint`, { ticketCodes });
    return data;
}


export const CHANNEL_LABEL: Record<string, string> = {
    COUNTER: "Tại quầy",
    ONLINE: "Online",
};

/** Trạng thái đơn đã biết; giá trị lạ vẫn hiển thị nguyên văn. */
export const BOOKING_STATUS_LABEL: Record<string, string> = {
    PENDING: "Chờ thanh toán",
    CONFIRMED: "Đã thanh toán",
    PAID: "Đã thanh toán",
    COMPLETED: "Hoàn tất",
    CHECKED_IN: "Đã nhận vé",
    PICKED_UP: "Đã nhận vé",
    CANCELLED: "Đã huỷ",
    CANCELED: "Đã huỷ",
    EXPIRED: "Hết hạn",
    REFUNDED: "Đã hoàn tiền",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
    CASH: "Tiền mặt",
    TRANSFER: "Chuyển khoản",
    BANK_TRANSFER: "Chuyển khoản",
    MOMO: "MoMo",
    VNPAY: "VNPay",
    CARD: "Thẻ",
};

export function statusLabel(status?: string | null): string {
    if (!status) return "—";
    return BOOKING_STATUS_LABEL[status.toUpperCase()] ?? status;
}


export function statusTone(status?: string | null): "ok" | "wait" | "bad" | "info" {
    const value = String(status ?? "").toUpperCase();

    if (["CONFIRMED", "PAID", "COMPLETED"].includes(value)) return "ok";
    if (["CHECKED_IN", "PICKED_UP"].includes(value)) return "info";
    if (["PENDING"].includes(value)) return "wait";
    return "bad";
}

export function paymentLabel(method?: string | null, provider?: string | null): string {
    if (!method) return "Chưa thanh toán";

    const base = PAYMENT_METHOD_LABEL[method.toUpperCase()] ?? method;
    return provider && method.toUpperCase() === "TRANSFER" ? `${base} (${provider})` : base;
}