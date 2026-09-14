export const API_URL = (
  import.meta.env.VITE_API_URL ??
  'http://localhost:8080/api'
).replace(/\/+$/, '')

export interface ApiErrorData {
  message?: string
  errors?: Record<string, string>
}

export class ApiError extends Error {
  status: number
  errors: Record<string, string>

  constructor(
    message: string,
    status: number,
    errors: Record<string, string> = {}
  ) {
    super(message)

    this.name = 'ApiError'
    this.status = status
    this.errors = errors
  }
}

/**
 * Đọc response từ Backend.
 * - Nếu response thành công -> trả dữ liệu
 * - Nếu response lỗi -> throw ApiError
 */
async function parseResponse<T>(
  response: Response
): Promise<T> {
  const text = await response.text()

  let data: unknown = null

  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = text
    }
  }

  if (!response.ok) {
    const errorData: ApiErrorData =
      typeof data === 'object' &&
        data !== null
        ? (data as ApiErrorData)
        : {}

    throw new ApiError(
      errorData.message ??
      `Request thất bại (${response.status})`,
      response.status,
      errorData.errors ?? {}
    )
  }

  return data as T
}

/**
 * Ghép API_URL với endpoint.
 *
 * Ví dụ:
 *
 * API_URL:
 * http://localhost:8080/api
 *
 * path:
 * /admin/promotions
 *
 * kết quả:
 * http://localhost:8080/api/admin/promotions
 */
function buildApiUrl(path: string): string {
  const normalizedPath =
    path.startsWith('/')
      ? path
      : `/${path}`

  return `${API_URL}${normalizedPath}`
}

/**
 * Hàm gọi API dùng chung.
 */
export async function apiRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = buildApiUrl(path)

  const response = await fetch(
    url,
    options
  )

  return parseResponse<T>(response)
}