import MovieForm from "../../../component/movie/MovieForm"
import { createMovie } from "../../../service/movie/movieService"
import type { MoviePayload, NavigateHandler } from "../../../types/admin"

interface MovieCreateProps {
  onNavigate: NavigateHandler
}

function MovieCreate({ onNavigate }: MovieCreateProps) {
  async function handleSubmit(payload: MoviePayload, posterFile: File | null) {
    await createMovie(payload, posterFile)
    window.alert('Thêm phim thành công')
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
          <h1>Thêm phim mới</h1>
          <p className="page-subtitle">Nhập thông tin phát hành, phân loại và nội dung hiển thị cho phim mới.</p>
        </div>
      </header>
      <MovieForm submitLabel="Thêm phim" onSubmit={handleSubmit} onCancel={() => onNavigate('/admin/movies')} />
    </main>
  )
}

export default MovieCreate
