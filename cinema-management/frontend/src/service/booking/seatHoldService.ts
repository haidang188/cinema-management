import { request } from "../httpClient"
import type { SeatHoldData, ShowtimeSeatData } from "../../types/booking"

export function getShowtimeSeats(showtimeId: number) {
  return request<ShowtimeSeatData[]>(`/api/showtime-seats?showtimeId=${showtimeId}`)
}

export function createSeatHold(userId: number, showtimeId: number, showtimeSeatIds: number[]) {
  return request<SeatHoldData>("/api/seat-holds", {
    method: "POST",
    body: JSON.stringify({ userId, showtimeId, showtimeSeatIds }),
  })
}

export function updateSeatHold(holdToken: string, userId: number, showtimeSeatIds: number[]) {
  return request<SeatHoldData>(`/api/seat-holds/${holdToken}`, {
    method: "PUT",
    body: JSON.stringify({ userId, showtimeSeatIds }),
  })
}

export function getSeatHold(holdToken: string, userId: number) {
  return request<SeatHoldData>(`/api/seat-holds/${holdToken}?userId=${userId}`)
}

export function releaseSeatHold(holdToken: string, userId: number) {
  return request<void>(`/api/seat-holds/${holdToken}?userId=${userId}`, { method: "DELETE" })
}
