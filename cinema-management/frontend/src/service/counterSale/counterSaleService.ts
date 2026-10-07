import axios from "axios";

const URL = import.meta.env.VITE_API_URL;

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
    request: CounterSaleRequest,
    employeeId: number
): Promise<CounterSaleResponse> {
    const response = await axios.post<CounterSaleResponse>(
        `${URL}/counter-sales`,
        request,
        {
            params: {
                employeeId,
            },
        }
    );

    return response.data;
}