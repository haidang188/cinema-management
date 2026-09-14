import { useState } from "react"
import type { ReactNode } from "react"
import { BrowserRouter, Navigate, Route, Routes, useNavigate } from "react-router-dom"

import AuthPage from "../component/auth/AuthPage"
import HomeFooter from "../component/home/HomeFooter"
import HomeHeader from "../component/home/HomeHeader"
import HomePage from "../component/home/HomePage"
import { AuthRequestError, login, register } from "../service/auth/authService"
import type { AuthFieldErrors, AuthMode, AuthResponse, LoginPayload, RegisterPayload } from "../types/auth"
import { adminRoutes } from "./adminRoutes"
import { promotionRoutes } from "./PromotionRoutes"
import { showtimeRoutes } from "./showtimeRoutes"
import { ticketPriceRoutes } from "./ticketPriceRoutes"

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

function getHomePath(user: AuthResponse | null): string {
  return user?.role === "ADMIN" ? "/admin/movies" : "/"
}

interface AppShellProps {
  children: ReactNode
  currentUser: AuthResponse | null
  onLogout: () => void
  onLoginClick: () => void
}

function CustomerShell({ children, currentUser, onLogout, onLoginClick }: AppShellProps) {
  return (
    <main className="home-page">
      <HomeHeader currentUser={currentUser} onLoginClick={onLoginClick} onLogout={onLogout} />
      <div className="home-content">{children}</div>
      <HomeFooter />
    </main>
  )
}

function AdminShell({ children, currentUser, onLogout }: AppShellProps) {
  const navigate = useNavigate()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (currentUser.role !== "ADMIN") {
    return <Navigate to="/" replace />
  }

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">PREMIERE ADMIN</div>
        <nav aria-label="Điều hướng quản trị">
          <button type="button" onClick={() => navigate("/admin/movies")}>
            <span>▣</span>
            Quản lý phim
          </button>
          <button type="button" onClick={() => navigate("/admin/promotions")}>
            <span>◇</span>
            Khuyến mãi
          </button>
          <button type="button" onClick={() => navigate("/showtimes")}>
            <span>▦</span>
            Lịch chiếu
          </button>
          <button type="button" onClick={() => navigate("/ticket-prices")}>
            <span>▥</span>
            Giá vé
          </button>
        </nav>
        <button type="button" className="admin-logout" onClick={onLogout}>
          ⇱ Đăng xuất
        </button>
      </aside>
      <section className="admin-content">{children}</section>
    </main>
  )
}

function AppRouteContent() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<AuthResponse | null>(() => readStoredUser())
  const [authMessage, setAuthMessage] = useState("")
  const [authFieldErrors, setAuthFieldErrors] = useState<AuthFieldErrors>({})
  const [authLoading, setAuthLoading] = useState(false)

  function updateCurrentUser(user: AuthResponse | null) {
    setCurrentUser(user)
    storeUser(user)
  }

  function goToLogin() {
    setAuthMessage("")
    setAuthFieldErrors({})
    navigate("/login")
  }

  function goToRegister() {
    setAuthMessage("")
    setAuthFieldErrors({})
    navigate("/register")
  }

  function logout() {
    updateCurrentUser(null)
    navigate("/")
  }

  async function handleLogin(payload: LoginPayload) {
    setAuthLoading(true)
    setAuthMessage("")
    setAuthFieldErrors({})

    try {
      const user = await login(payload)
      updateCurrentUser(user)
      navigate(getHomePath(user), { replace: true })
    } catch (error) {
      if (error instanceof AuthRequestError) {
        setAuthFieldErrors(error.fieldErrors)
        setAuthMessage(error.fieldErrors.system ? error.message : "")
      } else {
        setAuthMessage(error instanceof Error ? error.message : "Đăng nhập không thành công")
      }
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleRegister(payload: RegisterPayload) {
    setAuthLoading(true)
    setAuthMessage("")
    setAuthFieldErrors({})

    try {
      const user = await register(payload)
      updateCurrentUser(user)
      navigate(getHomePath(user), { replace: true })
    } catch (error) {
      if (error instanceof AuthRequestError) {
        setAuthFieldErrors(error.fieldErrors)
        setAuthMessage(error.fieldErrors.system ? error.message : "")
      } else {
        setAuthMessage(error instanceof Error ? error.message : "Đăng ký không thành công")
      }
    } finally {
      setAuthLoading(false)
    }
  }

  function renderAuthPage(mode: AuthMode) {
    if (currentUser) {
      return <Navigate to={getHomePath(currentUser)} replace />
    }

    return (
      <AuthPage
        mode={mode}
        message={authMessage}
        fieldErrors={authFieldErrors}
        isLoading={authLoading}
        onModeChange={(nextMode) => {
          setAuthMessage("")
          setAuthFieldErrors({})
          navigate(nextMode === "login" ? "/login" : "/register")
        }}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    )
  }

  return (
    <Routes>
      <Route
        path="/"
        element={
          <HomePage
            currentUser={currentUser}
            onLogout={logout}
            onLoginClick={goToLogin}
            onRegisterClick={goToRegister}
          />
        }
      />

      <Route path="/login" element={renderAuthPage("login")} />
      <Route path="/register" element={renderAuthPage("register")} />

      {[...showtimeRoutes, ...ticketPriceRoutes].map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <CustomerShell currentUser={currentUser} onLogout={logout} onLoginClick={goToLogin}>
              {route.element}
            </CustomerShell>
          }
        />
      ))}

      {[...adminRoutes, ...promotionRoutes].map((route) => (
        <Route
          key={route.path}
          path={route.path}
          element={
            <AdminShell currentUser={currentUser} onLogout={logout} onLoginClick={goToLogin}>
              {route.element}
            </AdminShell>
          }
        />
      ))}

      <Route path="*" element={<Navigate to={getHomePath(currentUser)} replace />} />
    </Routes>
  )
}

function AppRoutes() {
  return (
    <BrowserRouter>
      <AppRouteContent />
    </BrowserRouter>
  )
}

export default AppRoutes
