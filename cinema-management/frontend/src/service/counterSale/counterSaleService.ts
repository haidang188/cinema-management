import axios from "axios";
import { API_BASE_URL } from "../apiBase";

const URL = API_BASE_URL;

export interface CounterSaleRequest {
    showtimeId: number;
    showtimeSeatIds: number[];
    promotionId: number | null;
    paymentMethod: string;
}

export interface CounterSaleResponse {
    bookingId: number;
    bookingCode: string;
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
    paymentMethod: string;
    paymentStatus: string;
    pointsEarned: number;
    memberPointBalance: number | null;
    membershipLevel: string | null;
    ticketCodes: string[];
}

export interface SeatPriceResponse {
    showtimeSeatId: number;
    rowLabel: string;
    seatNumber: number;
    seatType: string;
    price: number;
}

export interface CounterSalePreviewResponse {
    seats: SeatPriceResponse[];
    totalAmount: number;
    discountAmount: number;
    finalAmount: number;
}

export async function previewSale(
    showtimeId: number,
    showtimeSeatIds: number[]
): Promise<CounterSalePreviewResponse> {

    const response =
        await axios.post<CounterSalePreviewResponse>(
            `${URL}/counter-sales/preview`,
            {
                showtimeId,
                showtimeSeatIds,
            }
        );

    return response.data;
}

export async function sellTickets(
    request: CounterSaleRequest
): Promise<CounterSaleResponse> {
    // Backend xác định nhân viên bán từ session đăng nhập, nên phải gửi kèm cookie.
    const response = await axios.post<CounterSaleResponse>(
        `${URL}/counter-sales`,
        request,
        { withCredentials: true }
    );

    return response.data;
}
