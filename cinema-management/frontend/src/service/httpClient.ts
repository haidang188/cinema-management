import type { ApiRequestError } from "../types/admin"

const API_BASE_URL = import.meta.env?.VITE_API_BASE_URL || "http://localhost:8080"

function safeMessage(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim() || value.length > 350) return undefined
  if (/(exception|stacktrace|\bat [\w.$]+\(|\b(select|insert into|update)\b.*\b(from|set|values)\b|<[^>]+>|\b(?:java|org|com)\.[\w.]+)/i.test(value)) return undefined
  return value
}

const STATUS_MESSAGES: Record<number, string> = {
  400: "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại thông tin.",
  401: "Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.",
  403: "Bạn không có quyền thực hiện thao tác này.",
  404: "Không tìm thấy dữ liệu yêu cầu.",
  409: "Dữ liệu bị trùng hoặc đã thay đổi. Vui lòng kiểm tra lại.",
}

export async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)

  if (options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers })
  } catch {
    throw new Error("Không thể kết nối máy chủ. Vui lòng kiểm tra mạng và thử lại.")
  }

  const text = await response.text()
  let data = null
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    if (response.ok) throw new Error("Phản hồi từ máy chủ không hợp lệ. Vui lòng thử lại.")
  }

  if (!response.ok) {
    const fallback = STATUS_MESSAGES[response.status] || "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
    const error = new Error(response.status >= 500 ? fallback : safeMessage(data?.message) || fallback) as ApiRequestError
    error.status = response.status
    if (response.status < 500 && data?.fieldErrors && typeof data.fieldErrors === "object") {
      error.fieldErrors = Object.fromEntries(Object.entries(data.fieldErrors).map(([field, message]) => [field, safeMessage(message) || "Thông tin không hợp lệ."]))
    }
    throw error
  }

  return data as T
}
