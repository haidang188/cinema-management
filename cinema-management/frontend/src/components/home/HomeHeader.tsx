import type { AuthResponse } from '../../types/auth'

interface HomeHeaderProps {
  currentUser: AuthResponse | null
  onLoginClick: () => void
  onLogout: () => void
}

function HomeHeader({ currentUser, onLoginClick, onLogout }: HomeHeaderProps) {
  const displayName = currentUser?.fullName || currentUser?.email

  return (
    <header className="home-header">
      <div className="home-logo">
        PREMIERE <span>CINEMAS</span>
      </div>
      <nav className="home-nav" aria-label="Điều hướng chính">
        <a href="#movies">Phim</a>
        <a href="#schedule">Lịch chiếu</a>
        <a href="#promotions">Khuyến mãi</a>
        <a href="#ticket-price">Giá vé</a>
      </nav>
      <div className="home-actions">
        <label className="home-search">
          <span className="sr-only">Tìm kiếm phim</span>
          <input type="search" placeholder="Tìm kiếm phim..." />
        </label>
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
