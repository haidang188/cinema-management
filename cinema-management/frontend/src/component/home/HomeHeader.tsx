import { NavLink } from 'react-router-dom'
import { useState } from 'react'
import BookingModal from '../BookingModal'
import type { AuthResponse } from '../../types/auth'
import '../../pages/booking/booking.css'
import './HomeHeader.css'

interface HomeHeaderProps {
  currentUser: AuthResponse | null
  onLoginClick: () => void
  onLogout: () => void
}

export default function HomeHeader({
  currentUser,
  onLoginClick,
  onLogout,
}: HomeHeaderProps) {
  const displayName = currentUser?.fullName || currentUser?.email
  const [panel, setPanel] = useState<string | null>(null)

  return (
    <header className="home-header premiere-customer-header">
      <div className="pc-header-inner">
        <div className="pc-brand">
          PREMIERE <span>CINEMAS</span>
        </div>

        <nav className="pc-nav" aria-label="Điều hướng chính">
          <NavLink to="/" end>Phim</NavLink>
          <NavLink to="/showtimes">Lịch chiếu</NavLink>
          <NavLink to="/promotions">Khuyến mãi</NavLink>

          <button
            type="button"
            onClick={() => setPanel('Lịch sử đặt vé')}
          >
            Lịch sử đặt vé
          </button>

          <NavLink to="/ticket-prices">Giá vé</NavLink>

          {currentUser?.role === 'ADMIN' && (
            <NavLink to="/admin/promotions">Quản lý</NavLink>
          )}
        </nav>

        <div className="pc-account">
          {currentUser ? (
            <>
              <span className="pc-account-name" title={displayName}>
                Xin chào, {displayName}
              </span>

              <button
                type="button"
                className="pc-account-button"
                onClick={onLogout}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <button
              type="button"
              className="pc-account-button"
              onClick={onLoginClick}
            >
              Đăng nhập
            </button>
          )}
        </div>
      </div>

      {panel && (
        <BookingModal
          title={panel}
          onClose={() => setPanel(null)}
        >
          <p>Lịch sử đặt vé đang được hoàn thiện.</p>
        </BookingModal>
      )}
    </header>
  )
}