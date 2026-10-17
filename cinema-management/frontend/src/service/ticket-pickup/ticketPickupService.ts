import { client } from "../seatHold/seatHoldService";

export type PickupBookingItem = {
    id: number;
    bookingCode: string;
    channel: string;
    customerName: string | null;
    customerPhone: string | null;
    movieTitle: string;
    posterUrl: string | null;
    startTime: string;
    roomName: string;
    seats: string[];
    pickedUp: boolean;
    canPickUp: boolean;
};

export type PickupInfo = {
    id: number;
    bookingCode: string;
    channel: string;
    status: string;
    createdAt: string;
    customer: { name: string | null; phone: string | null; email: string | null };
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
        ticketCode: string | null;
        qrToken: string | null;
        ticketStatus: string | null;
    }[];
    totalAmount: number;
    paymentMethod: string | null;
    paymentStatus: string | null;
    paidAt: string | null;
    pickup: { pickedUp: boolean; pickedUpAt: string | null; pickedUpBy: string | null };
    canPickUp: boolean;
    blockedReason: string | null;
};

export async function searchPickup(keyword: string): Promise<PickupBookingItem[]> {
    const { data } = await client.get<PickupBookingItem[]>("/api/ticket-pickup/search", { params: { keyword } });
    return Array.isArray(data) ? data : [];
}

export async function getPickupInfo(bookingId: number): Promise<PickupInfo> {
    const { data } = await client.get<PickupInfo>(`/api/ticket-pickup/${bookingId}`);
    return data;
}

export async function confirmPickup(bookingId: number): Promise<PickupInfo> {
    const { data } = await client.post<PickupInfo>(`/api/ticket-pickup/${bookingId}/confirm`);
    return data;
}

export function pickupErrorMessage(err: unknown, fallback: string): string {
    const anyErr = err as { response?: { data?: { message?: string } }; message?: string };
    return anyErr?.response?.data?.message ?? fallback;
}