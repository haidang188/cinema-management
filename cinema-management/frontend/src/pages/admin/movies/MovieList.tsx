import { useEffect, useMemo, useState } from "react"
import { getMovies } from "../../../service/movie/movieService"
import type { AdminMovie, NavigateHandler } from "../../../types/admin"

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: 'Sắp chiếu',
  SHOWING: 'Đang chiếu',
  ENDED: 'Đã kết thúc',
  INACTIVE: 'Ngừng hoạt động',
}

interface MovieListProps {
  onNavigate: NavigateHandler
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 0) return []

  const maxVisiblePages = 5
  const startPage = Math.max(
    0,
    Math.min(currentPage - Math.floor(maxVisiblePages / 2), totalPages - maxVisiblePages),
  )
  const endPage = Math.min(totalPages, startPage + maxVisiblePages)

  return Array.from({ length: endPage - startPage }, (_, index) => startPage + index)
}

function MovieList({ onNavigate }: MovieListProps) {
  const [movies, setMovies] = useState<AdminMovie[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const totalItems = movies.length
  const showingItems = movies.filter((movie) => movie.status === 'SHOWING').length
  const upcomingItems = movies.filter((movie) => movie.status === 'UPCOMING').length
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(0)
      setKeyword(searchTerm.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    getMovies({ page, size: 10, keyword, status })
      .then((data) => {
        if (!ignore) {
          setMovies(data.content || [])
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

  return (
    <main className="app-shell">
      <div className="admin-topbar">
        <div className="brand-mark">CB</div>
        <div>
          <strong>Cinema Booking System</strong>
          <span>Không gian quản trị rạp chiếu</span>
        </div>
        <nav className="module-nav">
          <button type="button" className="active" onClick={() => onNavigate('/admin/movies')}>Phim</button>
          <button type="button" onClick={() => onNavigate('/admin/cinema-rooms')}>Phòng chiếu</button>
        </nav>
      </div>

      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 1</p>
          <h1>Quản lý phim</h1>
          <p className="page-subtitle">Theo dõi danh sách phim, thêm phim mới và cập nhật thông tin trình chiếu.</p>
        </div>
        <button type="button" className="primary-button" onClick={() => onNavigate('/admin/movies/create')}>
          Thêm phim
        </button>
      </header>

      <section className="summary-grid" aria-label="Tổng quan phim">
        <div className="summary-card">
          <span>Đang hiển thị</span>
          <strong>{totalItems}</strong>
        </div>
        <div className="summary-card summary-green">
          <span>Đang chiếu</span>
          <strong>{showingItems}</strong>
        </div>
        <div className="summary-card summary-blue">
          <span>Sắp chiếu</span>
          <strong>{upcomingItems}</strong>
        </div>
      </section>

      <section className="toolbar">
        <form className="search-box" onSubmit={(event) => event.preventDefault()}>
          <input
            name="keyword"
            type="search"
            placeholder="Tìm kiếm tên phim, đạo diễn..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </form>
        <select
          aria-label="Lọc trạng thái"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value)
            setPage(0)
          }}
        >
          <option value="">Tất cả trạng thái</option>
          <option value="UPCOMING">Sắp chiếu</option>
          <option value="SHOWING">Đang chiếu</option>
          <option value="ENDED">Đã kết thúc</option>
          <option value="INACTIVE">Ngừng hoạt động</option>
        </select>
      </section>

      {error && <div className="alert error-alert">{error}</div>}
      {loading && <div className="alert">Đang tải danh sách phim...</div>}

      {!loading && !error && movies.length === 0 && (
        <section className="notice-panel">
          <h2>Chưa có phim phù hợp</h2>
          <p>Thử đổi từ khóa tìm kiếm hoặc thêm phim mới.</p>
        </section>
      )}

      {!error && movies.length > 0 && (
        <>
          <div className="table-wrap">
            <table className="movie-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Ảnh</th>
                  <th>Tên phim</th>
                  <th>Ngày phát hành</th>
                  <th>Thể loại</th>
                  <th>Đạo diễn</th>
                  <th>Thời lượng</th>
                  <th>Ngôn ngữ</th>
                  <th>Giới hạn tuổi</th>
                  <th>Trạng thái</th>
                  <th className="action-column">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {movies.map((movie, index) => (
                  <tr key={movie.id}>
                    <td>{page * 10 + index + 1}</td>
                    <td>
                      <div className="poster-cell">
                        {movie.posterUrl ? <img src={movie.posterUrl} alt={movie.title} /> : <span>Chưa có ảnh</span>}
                      </div>
                    </td>
                    <td className="title-cell">{movie.title}</td>
                    <td>{movie.releaseDate || '-'}</td>
                    <td>
                      <div className="genre-list">
                        {movie.genres?.length
                          ? movie.genres.map((genre) => <span key={genre.id}>{genre.name}</span>)
                          : '-'}
                      </div>
                    </td>
                    <td>{movie.director || '-'}</td>
                    <td>{movie.durationMinutes} phút</td>
                    <td>{movie.language || '-'}</td>
                    <td>{movie.ageRating || '-'}</td>
                    <td>
                      <span className={`status-badge status-${movie.status?.toLowerCase() || 'unknown'}`}>
                        {STATUS_LABELS[movie.status] || movie.status || '-'}
                      </span>
                    </td>
                    <td className="action-column">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => onNavigate(`/admin/movies/${movie.id}/edit`)}
                      >
                        Sửa
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="pagination" aria-label="Phân trang">
            <span className="pagination-summary">
              Trang {totalPages === 0 ? 0 : page + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="pagination-button"
              aria-label="Trang trước"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
            >
              ‹
            </button>
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`pagination-button${pageNumber === page ? ' is-active' : ''}`}
                aria-current={pageNumber === page ? 'page' : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber + 1}
              </button>
            ))}
            <button
              type="button"
              className="pagination-button"
              aria-label="Trang sau"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              ›
            </button>
          </nav>
        </>
      )}
    </main>
  )
}

export default MovieList
