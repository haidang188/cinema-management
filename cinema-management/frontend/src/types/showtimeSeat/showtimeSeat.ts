export interface ShowtimeSeat {
    id: number;
    seatId: number;
    rowLabel: string;
    seatNumber: number;
    seatType: string;
    status: "AVAILABLE" | "HELD" | "SOLD";
}