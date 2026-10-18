import { useState, useSyncExternalStore } from "react"
import { useNavigate } from "react-router-dom"

import {
  AuthRequestError,
  login,
  register,
  logoutSession,
} from "../service/auth/authService"

import type {
  AuthFieldErrors,
  AuthResponse,
  LoginPayload,
  RegisterPayload,
} from "../types/auth"

const STORAGE_KEY = "cinema.currentUser"

// Dùng chung một nguồn state cho mọi nơi gọi useAuth(), tránh mỗi trang giữ một bản
// riêng (đăng xuất ở trang bán vé nhưng router gốc vẫn tưởng còn đăng nhập).
const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cachedUser: AuthResponse | null = null

function readStoredUser(): AuthResponse | null {
  let rawUser: string | null = null

  try {
    rawUser = window.localStorage.getItem(STORAGE_KEY)
  } catch {
    rawUser = null
  }

  if (rawUser === cachedRaw) {
    return cachedUser
  }

  cachedRaw = rawUser

  if (!rawUser) {
    cachedUser = null
    return null
  }

  try {
    cachedUser = JSON.parse(rawUser) as AuthResponse
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    cachedRaw = null
    cachedUser = null
  }

  return cachedUser
}

function notifyAuthChanged() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)

  function onStorage(event: StorageEvent) {
    if (event.key === STORAGE_KEY) listener()
  }

  window.addEventListener("storage", onStorage)

  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", onStorage)
  }
}

function storeUser(user: AuthResponse | null) {
  if (user) {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(user),
    )
  } else {
    window.localStorage.removeItem(STORAGE_KEY)
  }

  notifyAuthChanged()
}

/** Xoá phiên đăng nhập phía client (dùng khi backend trả 401). */
export function clearStoredUser() {
  storeUser(null)
}

export function getHomePath(user: AuthResponse | null): string {
  if (user?.role === "MEMBER" && user.accountStatus === "PENDING_DELETION") {
    return "/account/recovery"
  }
  if (user?.role === "ADMIN") {
    return "/admin/movies"
  }

  if (user?.role === "EMPLOYEE") {
    return "/counter-sale"
  }

  return "/"
}

export function useAuth() {
  const navigate = useNavigate()

  const currentUser = useSyncExternalStore(subscribe, readStoredUser)

  const [authMessage, setAuthMessage] = useState("")
  const [authFieldErrors, setAuthFieldErrors] =
    useState<AuthFieldErrors>({})
  const [authLoading, setAuthLoading] = useState(false)

  function clearAuthFeedback() {
    setAuthMessage("")
    setAuthFieldErrors({})
  }

  function updateCurrentUser(user: AuthResponse | null) {
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

  async function logout() {
    const wasStaff = currentUser?.role === "ADMIN" || currentUser?.role === "EMPLOYEE"

    try {
      await logoutSession()
    } catch {
      // Phiên phía server có thể đã hết hạn hoặc backend không phản hồi;
      // vẫn đăng xuất phía client để người dùng không bị kẹt.
    } finally {
      updateCurrentUser(null)
      navigate(wasStaff ? "/login" : "/", { replace: true })
    }
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

  function handleAuthError(
    error: unknown,
    fallbackMessage: string,
  ) {
    if (error instanceof AuthRequestError) {
      setAuthFieldErrors(error.fieldErrors)
      setAuthMessage(
        error.fieldErrors.system ? error.message : "",
      )
      return
    }

    setAuthMessage(
      error instanceof Error
        ? error.message
        : fallbackMessage,
    )
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
    updateCurrentUser,
  }
}