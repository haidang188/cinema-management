import type { AuthResponse, LoginPayload, RegisterPayload } from '../types/auth'

const API_BASE_URL = 'http://localhost:8080/api/auth'

async function requestAuth<TPayload>(
  path: string,
  payload: TPayload,
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || 'Có lỗi xảy ra, vui lòng thử lại')
  }

  return data
}

export function login(payload: LoginPayload) {
  return requestAuth('/login', payload)
}

export function register(payload: RegisterPayload) {
  return requestAuth('/register', payload)
}
