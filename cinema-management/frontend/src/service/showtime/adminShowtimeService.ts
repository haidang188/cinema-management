import { request } from "../httpClient"
import { getMovies } from "../movie/movieService"
import { getRooms } from "../cinema-room/cinemaRoomService"
import type { AdminMovie, CinemaRoom, PageResponse } from "../../types/admin"
import type { ShowtimeData } from "../../types/showtime/showtime"

export interface SchedulePayload {
  movieId: number
  roomId: number
  startTime: string
  format: string
}

async function allPages<T>(getPage: (page: number) => Promise<PageResponse<T>>): Promise<T[]> {
  const first = await getPage(0)
  const rows = [...first.content]
  for (let page = 1; page < first.totalPages; page++) rows.push(...(await getPage(page)).content)
  return rows
}

export async function getSchedulingOptions(): Promise<{ movies: AdminMovie[]; rooms: CinemaRoom[] }> {
  const [movies, rooms] = await Promise.all([
    allPages((page) => getMovies({ page, size: 100 })),
    allPages((page) => getRooms({ page, size: 100 })),
  ])
  return { movies: movies.filter((m) => m.status === "SHOWING" || m.status === "UPCOMING"), rooms: rooms.filter((r) => r.status === "ACTIVE") }
}

export function getAdminShowtimes(date: string): Promise<ShowtimeData[]> {
  return request(`/api/admin/showtimes?${new URLSearchParams({ date })}`)
}

export function saveShowtime(payload: SchedulePayload, id?: number): Promise<ShowtimeData> {
  return request(`/api/admin/showtimes${id ? `/${id}` : ""}`, { method: id ? "PUT" : "POST", body: JSON.stringify(payload) })
}

export function cancelShowtime(id: number): Promise<void> {
  return request(`/api/admin/showtimes/${id}/cancel`, { method: "POST" })
}
