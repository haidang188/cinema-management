import { request } from "../httpClient"
import type {
  BookingDetail,
  BookingPreview,
  OnlineBookingResult,
  PaymentMethod,
} from "../../types/booking"

export function previewBooking(userId: number, holdToken: string) {
  return request<BookingPreview>("/api/bookings/preview", {
    method: "POST",
    body: JSON.stringify({ userId, holdToken }),
  })
}

export function createOnlineBooking(userId: number, holdToken: string, paymentMethod: PaymentMethod) {
  return request<OnlineBookingResult>("/api/bookings", {
    method: "POST",
    body: JSON.stringify({ userId, holdToken, paymentMethod }),
  })
}

export function confirmVietQr(bookingCode: string, userId: number) {
  return request<BookingDetail>(
    `/api/payments/vietqr/${encodeURIComponent(bookingCode)}/confirm?userId=${userId}`,
    { method: "POST" },
  )
}

export function getBooking(bookingCode: string, userId: number) {
  return request<BookingDetail>(
    `/api/bookings/${encodeURIComponent(bookingCode)}?userId=${userId}`,
  )
}
