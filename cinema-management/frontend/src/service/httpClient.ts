import type { ApiRequestError } from "../types/admin"
import { API_ORIGIN } from "./apiBase"
import { authHeaders } from "./auth/authStorage"

// Các service dùng request() truyền path dạng "/api/...", nên ghép với origin của backend.
const API_BASE_URL = API_ORIGIN

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)

  for (const [name, value] of Object.entries(authHeaders())) {
    headers.set(name, value)
  }

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    ...options,
    headers,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const error = new Error(data?.message || "Có lỗi xảy ra, vui lòng thử lại") as ApiRequestError
    error.status = response.status
    error.fieldErrors = data?.fieldErrors
    throw error
  }

  return data as T
}
