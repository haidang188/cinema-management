import { request } from "../httpClient"
import type {
  BookingDetail,
  BookingPreview,
  OnlineBookingResult,
  PaymentMethod,
  PromotionQuote,
} from "../../types/booking"

export function previewBooking(userId: number, holdToken: string, promotionCode?: string) {
  return request<BookingPreview>("/api/bookings/preview", {
    method: "POST",
    body: JSON.stringify({ userId, holdToken, promotionCode: promotionCode || null }),
  })
}

export function createOnlineBooking(userId: number, holdToken: string, paymentMethod: PaymentMethod, promotionCode?: string) {
  return request<OnlineBookingResult>("/api/bookings", {
    method: "POST",
    body: JSON.stringify({ userId, holdToken, paymentMethod, promotionCode: promotionCode || null }),
  })
}

export function getApplicablePromotions(userId: number, holdToken: string) {
  const params = new URLSearchParams({ userId: String(userId), holdToken })
  return request<PromotionQuote[]>(`/api/bookings/promotions?${params.toString()}`)
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
