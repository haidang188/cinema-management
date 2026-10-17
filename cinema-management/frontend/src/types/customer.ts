export interface CustomerPromotion {
  id: number
  title: string
  description: string | null
  imageUrl: string | null
  code: string
  discountType: "FIXED" | "PERCENTAGE"
  discountValue: number
  minOrderAmount: number | null
  maxDiscountAmount: number | null
  startDate: string
  endDate: string
}

export interface BookingHistoryItem {
  id: number
  bookingCode: string
  channel: string
  status: string
  movieTitle: string
  posterUrl: string | null
  showtimeStart: string
  roomName: string
  seats: string[]
  totalAmount: number
  discountAmount: number
  paymentMethod: string | null
  paymentStatus: string | null
  createdAt: string
}

export interface BookingHistoryPage {
  content: BookingHistoryItem[]
  number: number
  totalPages: number
  totalElements: number
  first: boolean
  last: boolean
}
