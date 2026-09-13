import { request } from "../httpClient"
import type { AdminMovie, Genre, MoviePayload, PageResponse } from "../../types/admin"

interface MovieSearchParams {
  page?: number
  size?: number
  keyword?: string
  status?: string
}

export function getMovies({
  page = 0,
  size = 10,
  keyword = "",
  status = "",
}: MovieSearchParams = {}): Promise<PageResponse<AdminMovie>> {
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

  return request<PageResponse<AdminMovie>>(`/api/movies/admin?${params.toString()}`)
}

export function getMovie(id: string): Promise<AdminMovie> {
  return request<AdminMovie>(`/api/movies/admin/${id}`)
}

export function createMovie(payload: MoviePayload): Promise<AdminMovie> {
  return request<AdminMovie>("/api/movies/admin", {
    method: "POST",
    body: JSON.stringify(payload),
  })
}

export function updateMovie(id: string, payload: MoviePayload): Promise<AdminMovie> {
  return request<AdminMovie>(`/api/movies/admin/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })
}

export function getGenres(): Promise<Genre[]> {
  return request<Genre[]>("/api/admin/genres")
}
