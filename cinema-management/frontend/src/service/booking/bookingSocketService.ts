import { Client } from "@stomp/stompjs"
import type { SeatStatusEvent } from "../../types/booking"

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/api\/?$/, "")
const SOCKET_URL = API_ROOT.replace(/^http/, "ws") + "/ws"

type SeatStateMessage = {
  showtimeSeatId?: number
  status?: string
}

type RealtimeSeatPayload = {
  type?: string
  showtimeId?: number
  showtimeSeatIds?: number[]
  heldUntil?: string | null
  seats?: SeatStateMessage[]
}

function normalizeSeatEvents(payload: RealtimeSeatPayload): SeatStatusEvent[] {
  if (Array.isArray(payload.showtimeSeatIds) && typeof payload.type === "string") {
    return [{
      type: payload.type as SeatStatusEvent["type"],
      showtimeId: Number(payload.showtimeId),
      showtimeSeatIds: payload.showtimeSeatIds,
      heldUntil: payload.heldUntil ?? null,
    }]
  }

  if (!Array.isArray(payload.seats)) return []

  const byType = new Map<SeatStatusEvent["type"], number[]>()
  payload.seats.forEach((seat) => {
    if (!Number.isFinite(seat.showtimeSeatId)) return
    const type: SeatStatusEvent["type"] =
      seat.status === "AVAILABLE"
        ? "SEATS_RELEASED"
        : seat.status === "SOLD"
          ? "SEATS_SOLD"
          : "SEATS_HELD"
    byType.set(type, [...(byType.get(type) ?? []), Number(seat.showtimeSeatId)])
  })

  return Array.from(byType, ([type, showtimeSeatIds]) => ({
    type,
    showtimeId: Number(payload.showtimeId),
    showtimeSeatIds,
    heldUntil: null,
  }))
}

export function subscribeToSeatStatus(
  showtimeId: number,
  onEvent: (event: SeatStatusEvent) => void,
) {
  const client = new Client({
    brokerURL: SOCKET_URL,
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  })

  client.onConnect = () => {
    client.subscribe(`/topic/showtimes/${showtimeId}/seats`, (message) => {
      try {
        const payload = JSON.parse(message.body) as RealtimeSeatPayload
        normalizeSeatEvents(payload).forEach(onEvent)
      } catch (error) {
        console.warn("Tin nhắn trạng thái ghế không hợp lệ:", error)
      }
    })
  }

  client.activate()
  return () => void client.deactivate()
}
