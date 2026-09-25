import { request } from "../httpClient"
import type { AdminMovie, Genre, MoviePayload, PageResponse } from "../../types/admin"
import type { Movie } from "../../types/movie"

const MOVIE_API_BASE_URL = "http://localhost:8080/api/movies"

interface MovieSearchParams {
  page?: number
  size?: number
  keyword?: string
  status?: string
}

interface HomeMovieSearchParams {
  status?: string
  genreId?: string
  date?: string
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
export function getPublicMovie(id: string): Promise<Movie> {
  return request<Movie>(`/api/movies/${id}`)
}
export async function getNowShowingMovies(): Promise<Movie[]> {
  const response = await fetch(`${MOVIE_API_BASE_URL}/now-showing`)

  if (!response.ok) {
    throw new Error("Không thể tải danh sách phim")
  }

  return response.json()
}

export function getHomeMovies({ status = "SHOWING", genreId = "", date = "" }: HomeMovieSearchParams = {}): Promise<Movie[]> {
  const params = new URLSearchParams()

  if (status) {
    params.set("status", status)
  }
  if (genreId) {
    params.set("genreId", genreId)
  }
  if (date) {
    params.set("date", date)
  }

  const query = params.toString()
  return request<Movie[]>(`/api/movies${query ? `?${query}` : ""}`)
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
