// Định dạng hiển thị dùng chung — cùng kết quả với trang "Quản lý đặt vé"
// (component/booking-management/BookingManagement.tsx + BookingDetailDrawer.tsx).

type DateInput = string | number | Date | null | undefined

function toDate(value: DateInput): Date | null {
  if (value === null || value === undefined || value === "") return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Tiền VND: 100000 → "100.000đ" (làm tròn, không có khoảng trắng trước "đ"). */
export function formatVnd(value: number | string | null | undefined): string {
  const amount = Number(value)
  return `${Math.round(Number.isFinite(amount) ? amount : 0).toLocaleString("vi-VN")}đ`
}

/** Ngày giờ: "14:30 17/10/2026"; giá trị rỗng/không hợp lệ → "—". */
export function formatDateTime(value: DateInput): string {
  const date = toDate(value)
  return date
    ? date.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour12: false,
      })
    : "—"
}

/** Ngày: "17/10/2026"; giá trị rỗng/không hợp lệ → "—". */
export function formatDate(value: DateInput): string {
  const date = toDate(value)
  return date
    ? date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "—"
}

/** Giờ: "14:30"; giá trị rỗng/không hợp lệ → "--:--". */
export function formatTime(value: DateInput): string {
  const date = toDate(value)
  return date
    ? date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false })
    : "--:--"
}
