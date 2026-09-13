import type { ApiRequestError } from "../types/admin"

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080"

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null

  if (!response.ok) {
    const error = new Error(data?.message || "Co loi xay ra, vui long thu lai") as ApiRequestError
    error.status = response.status
    error.fieldErrors = data?.fieldErrors
    throw error
  }

  return data as T
}
