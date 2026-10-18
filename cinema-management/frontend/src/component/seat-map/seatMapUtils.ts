export type SeatMapState = "available" | "held" | "sold" | "blocked"
export type SeatMapKind = "standard" | "vip" | "couple"

export function seatKind(type?: string | null): SeatMapKind {
  const value = String(type ?? "").toUpperCase()
  if (/COUPLE|DOUBLE|SWEET/.test(value)) return "couple"
  if (/VIP|PREMIUM/.test(value)) return "vip"
  return "standard"
}

export function seatStateOf(status?: string | null): SeatMapState {
  const value = String(status ?? "").toUpperCase()
  if (value === "AVAILABLE") return "available"
  if (["SOLD", "BOOKED", "PAID", "OCCUPIED"].includes(value)) return "sold"
  if (["HELD", "HOLD", "RESERVED", "LOCKED", "PENDING"].includes(value)) return "held"
  return "blocked"
}
