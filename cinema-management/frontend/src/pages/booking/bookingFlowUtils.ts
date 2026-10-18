import { seatKind } from "../../component/seat-map/seatMapUtils"

/** Đồng hồ giữ ghế: 125 → "02:05". */
export function formatCountdown(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`
}

/** Nhãn loại ghế viết thường kiểu câu: "Thường" / "VIP" / "Đôi". */
export function seatTypeLabel(type?: string | null) {
  const kind = seatKind(type)
  return kind === "vip" ? "VIP" : kind === "couple" ? "Đôi" : "Thường"
}

export function paymentMethodLabel(method?: string | null) {
  if (method === "VIETQR") return "VietQR"
  if (method === "VNPAY") return "VNPay"
  return method || "—"
}

export function paymentStatusLabel(status?: string | null) {
  switch (status) {
    case "PAID": return "Đã thanh toán"
    case "PENDING": return "Chờ thanh toán"
    case "FAILED": return "Thanh toán thất bại"
    case "EXPIRED": return "Đã hết hạn"
    case "CANCELLED": return "Đã hủy"
    default: return status || "—"
  }
}
