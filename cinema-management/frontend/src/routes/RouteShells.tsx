import type { ReactNode } from "react"
import {
  CalendarClock,
  Clapperboard,
  Percent,
  Tags,
  Ticket,
  UserRound,
  UsersRound,
} from "lucide-react"
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

const navItems = [
  { path: "/admin/members", icon: UsersRound, label: "Quản lý thành viên" },
  { path: "/admin/movies", icon: Clapperboard, label: "Phim" },
  { path: "/admin/cinema-rooms", icon: Ticket, label: "Phòng chiếu" },
  { path: "/admin/employees", icon: UserRound, label: "Nhân viên" },
  { path: "/admin/promotions", icon: Percent, label: "Khuyến mãi" },
  { path: "/admin/showtimes", icon: CalendarClock, label: "Xếp lịch chiếu" },
  { path: "/ticket-prices", icon: Tags, label: "Giá vé" },
]

export function CustomerShell({ children, currentUser, onLogout, onLoginClick }: AppShellProps) {
  return (
    <main className="home-page customer-shell">
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

  return (
    <main className="admin-layout">
      <aside className="admin-sidebar">
        <button type="button" className="admin-brand" onClick={() => navigate("/")}>
          Cinema Admin
        </button>
        <nav aria-label="Điều hướng quản trị">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)

            return (
              <button
                key={item.path}
                type="button"
                className={isActive ? "is-active" : undefined}
                onClick={() => navigate(item.path)}
              >
                <span className="admin-nav-icon" aria-hidden="true">
                  <Icon size={18} strokeWidth={2.25} />
                </span>
                <span className="admin-nav-label">{item.label}</span>
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
