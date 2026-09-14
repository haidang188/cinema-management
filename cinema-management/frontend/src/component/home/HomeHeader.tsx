import { Link } from 'react-router-dom'
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
    </header>
  )
}

export default HomeHeader
