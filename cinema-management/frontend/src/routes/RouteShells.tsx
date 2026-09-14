import type { ReactNode } from "react"
import { Navigate, useNavigate } from "react-router-dom"

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
