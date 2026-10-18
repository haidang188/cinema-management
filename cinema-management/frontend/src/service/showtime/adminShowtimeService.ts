import { API_BASE_URL } from "../apiBase"

export interface ShowtimeFilters {
  from: string
  to: string
  movieId: string
  roomId: string
  status: string
}

export interface AdminShowtime {
  id: number
  movieId: number
  movieTitle: string
  roomId: number
  roomName: string
  roomType: string
  format: string | null
  startTime: string
  endTime: string
  status: string | null
  totalSeats: number
}

export interface ShowtimeOptions {
  movies: {
    id: number
    title: string
    durationMinutes: number | null
    releaseDate: string | null
    status: string | null
  }[]

  rooms: {
    id: number
    name: string
    roomType: string
    status: string | null
  }[]

  statuses: string[]
  turnaroundMinutes: number
}

export interface ShowtimePageData {
  rows: AdminShowtime[]
  totalElements: number
  page: number
  size: number
  totalPages: number
}

export interface CreateShowtime {
  movieId: number
  roomId: number
  startTime: string
  format: string
}

export interface ShowtimePreview {
  endTime: string
  roomReadyAt: string
  turnaroundMinutes: number
  totalSeats: number
}

export interface BusySlot {
  id: number
  movieTitle: string
  startTime: string
  endTime: string
  readyAt: string
}

export interface FreeSlot {
  from: string
  to: string
  earliestStart: string
  latestStart: string
}

export interface RoomAvailability {
  roomId: number
  roomName: string
  movieId: number
  movieTitle: string
  durationMinutes: number
  date: string
  dayStart: string
  lastStart: string
  turnaroundMinutes: number
  available: boolean
  message: string
  busy: BusySlot[]
  freeSlots: FreeSlot[]
  suggestedStarts: string[]
}

export interface CreateShowtimeBatch {
  movieId: number
  roomId: number
  startTimes: string[]
  format: string
}

export interface BatchPreviewItem {
  startTime: string
  endTime: string | null
  readyAt: string | null
  ok: boolean
  message: string
}

export class ShowtimeError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = "ShowtimeError"
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}/admin/showtimes${path}`,
    {
      ...init,
      credentials: "include",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    },
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    throw new ShowtimeError(
      response.status,
      data?.message || "Không thể xử lý lịch chiếu",
    )
  }

  if (data == null) {
    throw new ShowtimeError(
      502,
      "Dữ liệu lịch chiếu không hợp lệ",
    )
  }

  return data as T
}

export const getShowtimeOptions = (
  signal?: AbortSignal,
) => request<ShowtimeOptions>("/options", { signal })

export function getAdminShowtimes(
  filters: ShowtimeFilters,
  page: number,
  size: number,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    ...filters,
    page: String(page),
    size: String(size),
  })

  for (const key of ["movieId", "roomId", "status"]) {
    if (!query.get(key)) {
      query.delete(key)
    }
  }

  return request<ShowtimePageData>(`?${query}`, { signal })
}

export const previewShowtime = (
  data: CreateShowtime,
) => request<ShowtimePreview>("/preview", {
  method: "POST",
  body: JSON.stringify(data),
})

export const createShowtime = (
  data: CreateShowtime,
) => request<AdminShowtime>("", {
  method: "POST",
  body: JSON.stringify(data),
})

export function getRoomAvailability(
  movieId: number,
  roomId: number,
  date: string,
  signal?: AbortSignal,
) {
  const query = new URLSearchParams({
    movieId: String(movieId),
    roomId: String(roomId),
    date,
  })

  return request<RoomAvailability>(`/availability?${query}`, { signal })
}

export const previewShowtimeBatch = (
  data: CreateShowtimeBatch,
) => request<BatchPreviewItem[]>("/batch/preview", {
  method: "POST",
  body: JSON.stringify(data),
})

export const createShowtimeBatch = (
  data: CreateShowtimeBatch,
) => request<{ created: AdminShowtime[] }>("/batch", {
  method: "POST",
  body: JSON.stringify(data),
})

export function vietnamNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date())

  const value = (key: string) =>
    parts.find(part => part.type === key)?.value || ""

  return `${value("year")}-${value("month")}-${value("day")}T${value("hour")}:${value("minute")}`
}

export function calculateEnd(
  start: string,
  minutes: number,
) {
  // Cộng thời lượng trên giờ nhập, không đổi theo múi giờ của trình duyệt.
  const value = Date.parse(`${start}Z`)

  return Number.isFinite(value)
    && Number.isFinite(minutes)
    && minutes >= 0
    ? new Date(value + minutes * 60000)
      .toISOString()
      .slice(0, 16)
    : ""
}

export function displayTime(value: string) {
  const [date, time] = value.split("T")

  return date && time
    ? `${time.slice(0, 5)} ${date.split("-").reverse().join("/")}`
    : "Chưa xác định"
}