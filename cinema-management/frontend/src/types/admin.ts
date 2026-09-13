export interface PageResponse<T> {
  content: T[]
  totalPages: number
}

export interface ApiRequestError extends Error {
  status?: number
  fieldErrors?: Record<string, string>
}

export interface Genre {
  id: number
  name: string
}

export interface AdminMovie {
  id: number
  title: string
  description?: string
  durationMinutes: number
  releaseDate?: string
  ageRating?: string
  director?: string
  cast?: string
  language?: string
  posterUrl?: string
  trailerUrl?: string
  status?: string
  genres?: Genre[]
}

export interface MovieFormValues {
  title: string
  description: string
  durationMinutes: number | string
  releaseDate: string
  ageRating: string
  director: string
  cast: string
  language: string
  posterUrl: string
  trailerUrl: string
  status: string
  genreIds: number[]
}

export interface MoviePayload extends Omit<MovieFormValues, "durationMinutes"> {
  durationMinutes: number
}

export interface Seat {
  id: number
  rowLabel?: string
  seatNumber: number
  seatName: string
  seatType: string
  status: string
}

export interface CinemaRoom {
  id: number
  name: string
  roomType?: string
  totalSeats?: number
  status?: string
  seats?: Seat[]
}

export interface SeatTypeUpdate {
  seatId: number
  seatType: string
}

export type NavigateHandler = (path: string) => void
