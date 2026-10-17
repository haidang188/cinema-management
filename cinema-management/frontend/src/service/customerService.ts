import { request } from "./httpClient"
import type { BookingHistoryPage, CustomerPromotion } from "../types/customer"

export const getActivePromotions = () => request<CustomerPromotion[]>("/api/promotions")

export const getBookingHistory = (userId: number, page = 0, size = 8, fromDate = "", toDate = "", timeline = "") => {
  const params = new URLSearchParams({ page: String(page), size: String(size) })
  if (fromDate) params.set("fromDate", fromDate)
  if (toDate) params.set("toDate", toDate)
  if (timeline) params.set("timeline", timeline)
  return request<BookingHistoryPage>(`/api/account/${userId}/bookings?${params.toString()}`)
}
