import { request } from "../httpClient"
import type { CinemaRoom, CinemaRoomPayload, CinemaRoomUpdatePayload, PageResponse, SeatTypeUpdate } from "../../types/admin"

interface RoomSearchParams {
  page?: number
  size?: number
  keyword?: string
  status?: string
}

export function getRooms({
  page = 0,
  size = 10,
  keyword = "",
  status = "",
}: RoomSearchParams = {}): Promise<PageResponse<CinemaRoom>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (keyword.trim()) {
    params.set("keyword", keyword.trim())
  }
  if (status) {
    params.set("status", status)
  }

  return request<PageResponse<CinemaRoom>>(`/api/admin/cinema-rooms?${params.toString()}`)
}

export function getRoomDetail(id: string): Promise<CinemaRoom> {
  return request<CinemaRoom>(`/api/admin/cinema-rooms/${id}`)
}

export function createRoom(payload: CinemaRoomPayload): Promise<CinemaRoom> {
  return request<CinemaRoom>("/api/admin/cinema-rooms", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateRoom(id: string, payload: CinemaRoomUpdatePayload): Promise<CinemaRoom> {
  return request<CinemaRoom>(`/api/admin/cinema-rooms/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function updateSeatTypes(roomId: string, seats: SeatTypeUpdate[]): Promise<CinemaRoom> {
  return request<CinemaRoom>(`/api/admin/cinema-rooms/${roomId}/seats`, {
    method: "PUT",
    body: JSON.stringify({ seats }),
  })
}
