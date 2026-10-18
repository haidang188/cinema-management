import { ChevronDown, LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
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

  return (
    <header className="home-header">
      <div className="home-logo">
        PREMIERE <span>CINEMAS</span>
      </div>
      <nav className="home-nav" aria-label="Điều hướng chính">
        <Link to="/">Phim</Link>
        <Link to="/showtimes">Lịch chiếu</Link>
        <Link to="/promotions">Khuyến mãi</Link>
        <Link to="/ticket-prices">Giá vé</Link>
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
            <button type="button" className="user-menu__trigger" aria-haspopup="menu">
              <span>{displayName}</span><ChevronDown size={16} aria-hidden="true" />
            </button>
            <div className="user-menu__dropdown" role="menu">
              {currentUser.role === 'MEMBER' && <Link role="menuitem" to="/account">Quản lý tài khoản</Link>}
              {currentUser.role === 'ADMIN' && <Link role="menuitem" to="/admin/movies">Quản lý phim</Link>}
              {currentUser.role === 'EMPLOYEE' && <Link role="menuitem" to="/counter-sale">Quầy bán vé</Link>}
              {currentUser.role === 'MEMBER' && <Link role="menuitem" to="/booking-history">Lịch sử đặt vé</Link>}
              <button type="button" role="menuitem" onClick={onLogout}><LogOut size={16} /> Đăng xuất</button>
            </div>
          </div>
        ) : (
          <button type="button" onClick={onLoginClick}>
            Đăng nhập
          </button>
        )}
      </div>
    </header>
  )
}

export default HomeHeader
