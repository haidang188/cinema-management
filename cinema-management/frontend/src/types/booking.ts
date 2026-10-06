export type PaymentMethod = "VIETQR" | "VNPAY"

export interface ShowtimeSeatData {
  price: number
  id: number
  seatId: number
  rowLabel: string
  seatNumber: number
  seatType: string
  status: "AVAILABLE" | "HELD" | "SOLD"
}

export interface SeatHoldData {
  holdToken: string
  userId: number
  showtimeId: number
  showtimeSeatIds: number[]
  heldAt: string
  expiresAt: string
  status: string
}

export interface BookingSeatPrice {
  showtimeSeatId: number
  seatId: number
  seatName: string
  seatType: string
  price: number
}

export interface BookingPreview {
  holdToken: string
  showtimeId: number
  movieTitle: string
  posterUrl: string
  roomName: string
  format: string | null
  startTime: string
  expiresAt: string
  seats: BookingSeatPrice[]
  subtotal: number
  discountAmount: number
  totalAmount: number
  promotionMessage: string
}

export interface PaymentInstruction {
  method: PaymentMethod
  amount: number
  paymentUrl: string | null
  qrImageUrl: string | null
  bankName: string | null
  accountNumber: string | null
  accountName: string | null
  transferContent: string
}

export interface OnlineBookingResult {
  bookingCode: string
  status: string
  paymentDeadline: string
  payment: PaymentInstruction
}

export interface BookingTicket {
  ticketCode: string | null
  seatName: string
  seatType: string
  price: number
  status: string
}

export interface BookingDetail {
  bookingCode: string
  bookingStatus: string
  paymentMethod: PaymentMethod
  paymentStatus: string
  paidAt: string | null
  paymentDeadline: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  movieTitle: string
  posterUrl: string
  ageRating: string | null
  roomName: string
  roomType: string
  format: string | null
  startTime: string
  subtotal: number
  discountAmount: number
  totalAmount: number
  bookingQrToken: string
  tickets: BookingTicket[]
}

export interface SeatStatusEvent {
  type: "SEATS_HELD" | "SEATS_RELEASED" | "SEATS_SOLD"
  showtimeId: number
  showtimeSeatIds: number[]
  heldUntil: string | null
}
