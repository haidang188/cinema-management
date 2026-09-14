import { useState } from "react"
import { useNavigate } from "react-router-dom"

import { AuthRequestError, login, register } from "../service/auth/authService"
import type { AuthFieldErrors, AuthResponse, LoginPayload, RegisterPayload } from "../types/auth"

const STORAGE_KEY = "cinema.currentUser"

function readStoredUser(): AuthResponse | null {
  const rawUser = window.localStorage.getItem(STORAGE_KEY)

  if (!rawUser) {
    return null
  }

  try {
    return JSON.parse(rawUser) as AuthResponse
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function storeUser(user: AuthResponse | null) {
  if (user) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(user))
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
}

export function getHomePath(user: AuthResponse | null): string {
  return user?.role === "ADMIN" ? "/admin/movies" : "/"
}

export function useAuth() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(() => readStoredUser())
  const [authMessage, setAuthMessage] = useState("")
  const [authFieldErrors, setAuthFieldErrors] = useState<AuthFieldErrors>({})
  const [authLoading, setAuthLoading] = useState(false)

  function clearAuthFeedback() {
    setAuthMessage("")
    setAuthFieldErrors({})
  }

  function updateCurrentUser(user: AuthResponse | null) {
    setCurrentUser(user)
    storeUser(user)
  }

  function goToLogin() {
    clearAuthFeedback()
    navigate("/login")
  }

  function goToRegister() {
    clearAuthFeedback()
    navigate("/register")
  }

  function logout() {
    updateCurrentUser(null)
    navigate("/")
  }

  async function loginUser(payload: LoginPayload) {
    setAuthLoading(true)
    clearAuthFeedback()

    try {
      const user = await login(payload)
      updateCurrentUser(user)
      navigate(getHomePath(user), { replace: true })
    } catch (error) {
      handleAuthError(error, "Đăng nhập không thành công")
    } finally {
      setAuthLoading(false)
    }
  }

  async function registerUser(payload: RegisterPayload) {
    setAuthLoading(true)
    clearAuthFeedback()

    try {
      const user = await register(payload)
      updateCurrentUser(user)
      navigate(getHomePath(user), { replace: true })
    } catch (error) {
      handleAuthError(error, "Đăng ký không thành công")
    } finally {
      setAuthLoading(false)
    }
  }

  function handleAuthError(error: unknown, fallbackMessage: string) {
    if (error instanceof AuthRequestError) {
      setAuthFieldErrors(error.fieldErrors)
      setAuthMessage(error.fieldErrors.system ? error.message : "")
      return
    }

    setAuthMessage(error instanceof Error ? error.message : fallbackMessage)
  }

  return {
    authFieldErrors,
    authLoading,
    authMessage,
    clearAuthFeedback,
    currentUser,
    goToLogin,
    goToRegister,
    loginUser,
    logout,
    registerUser,
  }
}
