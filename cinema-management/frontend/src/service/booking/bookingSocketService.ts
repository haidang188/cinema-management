import { Client } from "@stomp/stompjs"
import type { SeatStatusEvent } from "../../types/booking"

const API_ROOT = (import.meta.env.VITE_API_URL || "http://localhost:8080/api").replace(/\/api\/?$/, "")
const SOCKET_URL = API_ROOT.replace(/^http/, "ws") + "/ws"

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
      onEvent(JSON.parse(message.body) as SeatStatusEvent)
    })
  }

  client.activate()
  return () => void client.deactivate()
}
