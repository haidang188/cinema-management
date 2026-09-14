export type AuthMode = 'login' | 'register'
export type AccountType = 'MEMBER' | 'EMPLOYEE'

export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  fullName: string
  email: string
  phone: string
  password: string
  confirmPassword: string
  accountType: AccountType
}

export type AuthFieldErrors = Partial<Record<keyof LoginPayload | keyof RegisterPayload | 'system', string>>

export interface AuthResponse {
  userId: number
  profileId: number | null
  fullName: string | null
  email: string
  phone: string | null
  role: AccountType | 'ADMIN'
  message: string
}
