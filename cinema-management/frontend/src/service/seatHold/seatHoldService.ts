import axios from "axios";

/*
 * GIỮ GHẾ (frontend)
 * - holdToken: chuỗi ngẫu nhiên riêng cho TỪNG TAB (sessionStorage), là "chìa khoá"
 *   để giữ / nhả / bán ghế. Không gửi token lên WebSocket.
 * - Server chỉ công khai SHA-256 của token (holdOwner); tab tự băm token của mình
 *   để nhận ra ghế nào đang do mình giữ.
 * Nếu dự án có axios instance dùng chung (kèm token đăng nhập), thay `client` bằng instance đó.
 */

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};

export const API_BASE_URL = env.VITE_API_BASE_URL ?? "http://localhost:8080";
export const WS_URL = env.VITE_WS_URL ?? `${API_BASE_URL.replace(/^http/, "ws")}/ws`;

export const client = axios.create({ baseURL: API_BASE_URL });

client.interceptors.request.use((config) => {
    const token = localStorage.getItem("token") ?? localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

export type SeatStateDto = {
    showtimeSeatId: number;
    status: string;
    holdOwner: string | null;
    expiresInSeconds: number | null;
};

export type SeatHoldDto = {
    showtimeId: number;
    heldSeatIds: number[];
    expiresInSeconds: number;
    // Ghế bị bỏ qua khi chọn cả hàng / tất cả (đã có nơi khác giữ), vd ["D5"].
    skippedSeats?: string[];
};

const TOKEN_KEY = "premiere.holdToken";

function randomToken(): string {
    // randomUUID chỉ có trên HTTPS / localhost; getRandomValues có ở mọi nơi.
    if (typeof crypto.randomUUID === "function") {
        return crypto.randomUUID().replace(/-/g, "");
    }

    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Quầy bán vé: token là của ĐƠN NHÁP (server cấp), đặt vào đây bằng setHoldToken()
 * để mở lại đơn tạm gác ở quầy khác vẫn giữ / nhả / bán đúng ghế.
 */
export function setHoldToken(token: string): void {
    try {
        sessionStorage.setItem(TOKEN_KEY, token);
    } catch {
        // sessionStorage bị chặn: bỏ qua.
    }
}

export function clearHoldToken(): void {
    try {
        sessionStorage.removeItem(TOKEN_KEY);
    } catch {
        // bỏ qua
    }
}

/** Token hiện tại (F5 vẫn giữ nguyên, tab khác có token khác). */
export function getHoldToken(): string {
    try {
        const existing = sessionStorage.getItem(TOKEN_KEY);
        if (existing && /^[A-Za-z0-9_-]{16,128}$/.test(existing)) return existing;

        const token = randomToken();
        sessionStorage.setItem(TOKEN_KEY, token);
        return token;
    } catch {
        return randomToken();
    }
}

/**
 * SHA-256 hex của token, khớp HoldTokens.owner() ở backend.
 * crypto.subtle chỉ có trên HTTPS hoặc localhost; nếu không có thì trả null
 * (vẫn chạy được, chỉ không tự khôi phục ghế đang giữ sau khi F5).
 */
export async function hashHoldToken(token: string): Promise<string | null> {
    if (typeof crypto === "undefined" || !crypto.subtle) return null;

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** allowPartial: chọn cả hàng / tất cả -> ghế đã có người giữ thì bỏ qua thay vì báo lỗi. */
export async function holdSeats(
    showtimeId: number,
    showtimeSeatIds: number[],
    allowPartial = false
): Promise<SeatHoldDto> {
    const { data } = await client.post<SeatHoldDto>(`/api/showtimes/${showtimeId}/holds`, {
        holdToken: getHoldToken(),
        showtimeSeatIds,
        allowPartial,
    });
    return data;
}

/** Không truyền ghế = nhả toàn bộ ghế tab này đang giữ trong suất. */
export async function releaseSeats(showtimeId: number, showtimeSeatIds?: number[]): Promise<SeatHoldDto> {
    const { data } = await client.post<SeatHoldDto>(`/api/showtimes/${showtimeId}/holds/release`, {
        holdToken: getHoldToken(),
        showtimeSeatIds: showtimeSeatIds ?? [],
    });
    return data;
}

/** Nhả ghế khi đóng tab / tải lại trang: sendBeacon vẫn gửi được khi trang đang đóng. */
export function releaseSeatsOnUnload(showtimeId: number): void {
    // Form urlencoded: không cần CORS preflight (sendBeacon không hỗ trợ preflight),
    // backend đọc bằng @RequestParam. Không gửi showtimeSeatIds = nhả toàn bộ.
    const body = new URLSearchParams({ holdToken: getHoldToken() });
    const url = `${API_BASE_URL}/api/showtimes/${showtimeId}/holds/release`;

    try {
        navigator.sendBeacon?.(url, body);
    } catch {
        // Bỏ qua: server tự thu hồi khi hết 5 phút.
    }
}

export async function getSeatStates(showtimeId: number): Promise<SeatStateDto[]> {
    const { data } = await client.get<SeatStateDto[]>(`/api/showtimes/${showtimeId}/seat-states`);
    return Array.isArray(data) ? data : [];
}