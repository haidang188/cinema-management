// Phiên đăng nhập lưu trong sessionStorage (riêng từng tab), nên mỗi tab có thể đăng
// nhập một tài khoản khác nhau. Backend nhận diện người dùng qua header Authorization.
export const AUTH_STORAGE_KEY = "cinema.currentUser"

export function readStoredAuthRaw(): string | null {
  try {
    return window.sessionStorage.getItem(AUTH_STORAGE_KEY)
  } catch {
    return null
  }
}

export function getAuthToken(): string | null {
  const raw = readStoredAuthRaw()

  if (!raw) {
    return null
  }

  try {
    const token = (JSON.parse(raw) as { token?: unknown }).token
    return typeof token === "string" && token ? token : null
  } catch {
    return null
  }
}

/** Header "Authorization: Bearer ..." cho request gọi API, rỗng nếu chưa đăng nhập. */
export function authHeaders(): Record<string, string> {
  const token = getAuthToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}
