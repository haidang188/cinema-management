import type { ReactNode } from "react"
import { Navigate, useNavigate } from "react-router-dom"
import HomeFooter from "../component/home/HomeFooter"
import HomeHeader from "../component/home/HomeHeader"
import Layout from "../common/layout/Layout"
import Sidebar from "../common/layout/Sidebar"
import type { SidebarItem } from "../common/layout/Sidebar"
import Header from "../common/layout/Header"
import Footer from "../common/layout/Footer"
import type { AuthResponse } from "../types/auth"

interface AppShellProps {
  children: ReactNode
  currentUser: AuthResponse | null
  onLogout: () => void
  onLoginClick: () => void
}

const adminMenu: SidebarItem[] = [
  {
    path: "/admin/members",
    icon: "users",
    label: "Quản lý thành viên",
  },
  {
    path: "/admin/movies",
    icon: "film",
    label: "Phim",
  },
  {
    path: "/admin/cinema-rooms",
    icon: "dashboard",
    label: "Phòng chiếu",
  },
  {
    path: "/admin/promotions",
    icon: "ticket",
    label: "Khuyến mãi",
  },
  {
    path: "/showtimes",
    icon: "calendar",
    label: "Lịch chiếu",
  },
  {
    path: "/ticket-prices",
    icon: "receipt",
    label: "Giá vé",
  },
]

export function CustomerShell({
  children,
  currentUser,
  onLogout,
  onLoginClick,
}: AppShellProps) {
  return (
    <main className="home-page customer-shell">
      <HomeHeader
        currentUser={currentUser}
        onLoginClick={onLoginClick}
        onLogout={onLogout}
      />
      <div className="home-content">{children}</div>
      <HomeFooter />
    </main>
  )
}

export function AdminShell({
  children,
  currentUser,
  onLogout,
}: AppShellProps) {
  const navigate = useNavigate()

  if (!currentUser) return <Navigate to="/login" replace />
  if (currentUser.role !== "ADMIN") return <Navigate to="/" replace />

  const displayName = currentUser.fullName || currentUser.email

  return (
    <div className="workspace-shell">
      <Layout
        sidebar={
          <Sidebar
            brand="PREMIERE ADMIN"
            items={adminMenu}
            onLogout={onLogout}
          />
        }
        header={
          <Header
            title="Không gian quản trị"
            rightContent={
              <>
                <span title={displayName}>
                  Xin chào, {displayName}
                </span>
                <button
                  type="button"
                  className="shell-home-button"
                  onClick={() => navigate("/")}
                >
                  Trang chủ
                </button>
              </>
            }
          />
        }
        footer={<Footer />}
      >
        <section className="admin-content">{children}</section>
      </Layout>
    </div>
  )
}