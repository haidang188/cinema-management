import type { AuthFieldErrors, AuthResponse, LoginPayload, RegisterPayload } from '../../types/auth'

const API_BASE_URL = import.meta.env.VITE_API_URL + "/auth";
interface AuthErrorData {
  message?: string
  fieldErrors?: AuthFieldErrors
}

export class AuthRequestError extends Error {
  fieldErrors: AuthFieldErrors

  constructor(message: string, fieldErrors: AuthFieldErrors = {}) {
    super(message)
    this.name = 'AuthRequestError'
    this.fieldErrors = fieldErrors
  }
}

function parseAuthResponse(text: string): AuthResponse | AuthErrorData | null {
  if (!text) {
    return null
  }

  try {
    return JSON.parse(text) as AuthResponse | AuthErrorData
  } catch {
    return { message: text }
  }
}

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

  const data = parseAuthResponse(await response.text())

  if (!response.ok) {
    const errorData = (data ?? {}) as AuthErrorData
    const message = errorData.message || 'Có lỗi xảy ra, vui lòng thử lại'
    const fieldErrors = errorData.fieldErrors || { system: message }

    throw new AuthRequestError(message, fieldErrors)
  }

  return data as AuthResponse
}

export function login(payload: LoginPayload) {
  return requestAuth('/login', payload)
}

export function register(payload: RegisterPayload) {
  return requestAuth('/register', payload)
}
