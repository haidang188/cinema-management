import { request } from "../httpClient"
import type { AdminMovie, Genre, MoviePayload, PageResponse } from "../../types/admin"

interface MovieSearchParams {
  page?: number
  size?: number
  keyword?: string
  status?: string
}

function buildMovieFormData(payload: MoviePayload, posterFile: File | null): FormData {
  const formData = new FormData()
  const { posterUrl: _posterUrl, ...moviePayload } = payload

  formData.append("movie", new Blob([JSON.stringify(moviePayload)], { type: "application/json" }))
  if (posterFile) {
    formData.append("poster", posterFile)
  }

  return formData
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

export function createMovie(payload: MoviePayload, posterFile: File | null): Promise<AdminMovie> {
  return request<AdminMovie>("/api/movies/admin", {
    method: "POST",
    body: buildMovieFormData(payload, posterFile),
  })
}

export function updateMovie(id: string, payload: MoviePayload, posterFile: File | null): Promise<AdminMovie> {
  return request<AdminMovie>(`/api/movies/admin/${id}`, {
    method: "PUT",
    body: buildMovieFormData(payload, posterFile),
  })
}

export function getGenres(): Promise<Genre[]> {
  return request<Genre[]>("/api/admin/genres")
}
