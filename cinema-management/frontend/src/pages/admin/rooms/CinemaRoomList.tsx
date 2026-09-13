import { useEffect, useState } from "react"
import { getRooms } from "../../../service/cinema-room/cinemaRoomService"
import type { CinemaRoom, NavigateHandler } from "../../../types/admin"

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  MAINTENANCE: 'Bảo trì',
}

interface CinemaRoomListProps {
  onNavigate: NavigateHandler
}

function CinemaRoomList({ onNavigate }: CinemaRoomListProps) {
  const [rooms, setRooms] = useState<CinemaRoom[]>([])
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    getRooms({ page, size: 10, keyword, status })
      .then((data) => {
        if (!ignore) {
          setRooms(data.content || [])
          setTotalPages(data.totalPages || 0)
        }
      })
      .catch((requestError: Error) => {
        if (!ignore) setError(requestError.message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [keyword, page, status])

  function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setPage(0)
    setKeyword((form.elements.namedItem("keyword") as HTMLInputElement).value)
  }

  return (
    <main className="app-shell">
      <div className="admin-topbar">
        <div className="brand-mark">CB</div>
        <div>
          <strong>Cinema Booking System</strong>
          <span>Không gian quản trị rạp chiếu</span>
        </div>
        <nav className="module-nav">
          <button type="button" onClick={() => onNavigate('/admin/movies')}>Phim</button>
          <button type="button" className="active" onClick={() => onNavigate('/admin/cinema-rooms')}>Phòng chiếu</button>
        </nav>
      </div>

      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 2</p>
          <h1>Quản lý phòng chiếu</h1>
          <p className="page-subtitle">Xem danh sách phòng và kiểm tra sơ đồ ghế theo dữ liệu MySQL.</p>
        </div>
      </header>

      <section className="summary-grid" aria-label="Tổng quan phòng chiếu">
        <div className="summary-card">
          <span>Đang hiển thị</span>
          <strong>{rooms.length}</strong>
        </div>
        <div className="summary-card summary-green">
          <span>Hoạt động</span>
          <strong>{rooms.filter((room) => room.status === 'ACTIVE').length}</strong>
        </div>
        <div className="summary-card summary-blue">
          <span>Tổng ghế</span>
          <strong>{rooms.reduce((total, room) => total + (room.totalSeats || 0), 0)}</strong>
        </div>
      </section>

      <section className="toolbar">
        <form className="search-box" onSubmit={handleSearch}>
          <input name="keyword" type="search" placeholder="Tìm theo tên phòng" defaultValue={keyword} />
          <button type="submit" className="secondary-button">Tìm kiếm</button>
        </form>
        <select
          aria-label="Lọc trạng thái phòng"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="ACTIVE">Hoạt động</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
          <option value="MAINTENANCE">Bảo trì</option>
        </select>
      </section>

      {error && <div className="alert error-alert">{error}</div>}
      {loading && <div className="alert">Đang tải danh sách phòng...</div>}

      {!loading && !error && rooms.length === 0 && (
        <section className="notice-panel">
          <h2>Chưa có phòng phù hợp</h2>
          <p>Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
        </section>
      )}

      {!error && rooms.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="movie-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã hiển thị</th>
                  <th>Tên phòng</th>
                  <th>Loại phòng</th>
                  <th>Số lượng ghế</th>
                  <th>Trạng thái</th>
                  <th className="action-column">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, index) => (
                  <tr key={room.id}>
                    <td>{page * 10 + index + 1}</td>
                    <td className="muted-code">#{room.id}</td>
                    <td className="title-cell">{room.name}</td>
                    <td>{room.roomType || '-'}</td>
                    <td>{room.totalSeats || 0}</td>
                    <td>
                      <span className={`status-badge room-status-${room.status?.toLowerCase() || 'unknown'}`}>
                        {STATUS_LABELS[room.status] || room.status || '-'}
                      </span>
                    </td>
                    <td className="action-column">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => onNavigate(`/admin/cinema-rooms/${room.id}`)}
                      >
                        Chi tiết ghế
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="pagination" aria-label="Phân trang phòng chiếu">
            <button
              type="button"
              className="secondary-button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
            >
              Trước
            </button>
            <span>Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}</span>
            <button
              type="button"
              className="secondary-button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Sau
            </button>
          </nav>
        </>
      )}
    </main>
  )
}

export default CinemaRoomList
