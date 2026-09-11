import { useEffect, useState } from 'react'
import MovieForm from '../../../components/movie/MovieForm.jsx'
import { getMovie, updateMovie } from '../../../services/movieService.js'

function MovieEdit({ movieId, onNavigate }) {
  const [movie, setMovie] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    getMovie(movieId)
      .then((data) => {
        if (!ignore) setMovie(data)
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [movieId])

  async function handleSubmit(payload, posterFile) {
    await updateMovie(movieId, payload, posterFile)
    window.alert('Cập nhật phim thành công')
    onNavigate('/admin/movies')
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
          <button type="button" className="active" onClick={() => onNavigate('/admin/movies')}>Phim</button>
          <button type="button" onClick={() => onNavigate('/admin/cinema-rooms')}>Phòng chiếu</button>
        </nav>
      </div>

      <header className="page-header">
        <div>
          <p className="eyebrow">Quản lý phim</p>
          <h1>Chỉnh sửa thông tin phim</h1>
          <p className="page-subtitle">Cập nhật nội dung, phân loại và trạng thái trình chiếu của phim.</p>
        </div>
      </header>

      {loading && <div className="alert">Đang tải thông tin phim...</div>}
      {error && (
        <section className="notice-panel">
          <h2>Không tải được phim</h2>
          <p>{error}</p>
          <button type="button" className="secondary-button" onClick={() => onNavigate('/admin/movies')}>
            Quay về danh sách
          </button>
        </section>
      )}
      {!loading && !error && movie && (
        <MovieForm
          initialMovie={movie}
          submitLabel="Cập nhật phim"
          onSubmit={handleSubmit}
          onCancel={() => onNavigate('/admin/movies')}
        />
      )}
    </main>
  )
}

export default MovieEdit
