import { Link } from 'react-router-dom'
import { useState } from 'react'
import BookingModal from '../BookingModal'
import '../../pages/booking/booking.css'
import type { AuthResponse } from '../../types/auth'

interface HomeHeaderProps {
  currentUser: AuthResponse | null
  onLoginClick: () => void
  onLogout: () => void
  searchValue?: string
  onSearchChange?: (value: string) => void
}

function HomeHeader({ currentUser, onLoginClick, onLogout, searchValue = '', onSearchChange }: HomeHeaderProps) {
  const displayName = currentUser?.fullName || currentUser?.email
  const [panel, setPanel] = useState<string | null>(null)

  return (
    <header className="home-header">
      <div className="home-logo">
        PREMIERE <span>CINEMAS</span>
      </div>
      <nav className="home-nav" aria-label="Điều hướng chính">
        <Link to="/">Phim</Link>
        <Link to="/showtimes">Lịch chiếu</Link>
        <button type="button" onClick={() => setPanel('Khuyến mãi')}>Khuyến mãi</button>
        <button type="button" onClick={() => setPanel('Lịch sử đặt vé')}>Lịch sử đặt vé</button>
        <Link to="/ticket-prices">Giá vé</Link>
        {currentUser?.role === 'ADMIN' && <Link to="/admin/promotions">Quản lý</Link>}
      </nav>
      <div className="home-actions">
        {onSearchChange && (
          <label className="home-search">
            <span className="sr-only">Tìm kiếm phim</span>
            <input
              type="search"
              placeholder="Tìm kiếm phim..."
              value={searchValue}
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
        )}
        {currentUser ? (
          <div className="user-menu">
            <span>Xin chào, {displayName}</span>
            <button type="button" onClick={onLogout}>
              Đăng xuất
            </button>
          </div>
        ) : (
          <button type="button" onClick={onLoginClick}>
            Đăng nhập
          </button>
        )}
      </div>
      {panel && <BookingModal title={panel} onClose={() => setPanel(null)}><p>{panel === 'Khuyến mãi' ? 'Hiện chưa có mã khuyến mãi.' : 'Lịch sử đặt vé đang được hoàn thiện.'}</p></BookingModal>}
    </header>
  )
}

export default HomeHeader
