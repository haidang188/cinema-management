import type { ReactNode } from "react"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

import HomeFooter from "../component/home/HomeFooter"
import HomeHeader from "../component/home/HomeHeader"
import type { AuthResponse } from "../types/auth"

interface AppShellProps {
  children: ReactNode
  currentUser: AuthResponse | null
  onLogout: () => void
  onLoginClick: () => void
}

export function CustomerShell({ children, currentUser, onLogout, onLoginClick }: AppShellProps) {
  return (
    <main className="home-page">
      <HomeHeader currentUser={currentUser} onLoginClick={onLoginClick} onLogout={onLogout} />
      <div className="home-content">{children}</div>
      <HomeFooter />
    </main>
  )
}

export function AdminShell({ children, currentUser, onLogout }: AppShellProps) {
  const navigate = useNavigate()
  const location = useLocation()

  if (!currentUser) {
    return <Navigate to="/login" replace />
  }

  if (currentUser.role !== "ADMIN") {
    return <Navigate to="/" replace />
  }

  const navItems = [
    { path: "/admin/movies", icon: "MV", label: "Quản lý phim" },
    { path: "/admin/cinema-rooms", icon: "RM", label: "Quản lý phòng chiếu" },
    { path: "/admin/promotions", icon: "KM", label: "Khuyến mãi" },
    { path: "/showtimes", icon: "LC", label: "Lịch chiếu" },
    { path: "/ticket-prices", icon: "GV", label: "Giá vé" },
  ]

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <button type="button" className="admin-brand" onClick={() => navigate("/")}>
          PREMIERE ADMIN
        </button>
        <nav aria-label="Điều hướng quản trị">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

            return (
              <button
                key={item.path}
                type="button"
                className={isActive ? "is-active" : undefined}
                onClick={() => navigate(item.path)}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>
        <button type="button" className="admin-logout" onClick={onLogout}>
          Đăng xuất
        </button>
      </aside>
      <section className="admin-content">{children}</section>
    </main>
  )
}
