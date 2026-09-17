import { useState } from "react"
import AppModal from "../../../component/common/AppModal"
import MovieForm from "../../../component/movie/MovieForm"
import { createMovie } from "../../../service/movie/movieService"
import type { MoviePayload, NavigateHandler } from "../../../types/admin"

interface MovieCreateProps {
  onNavigate: NavigateHandler
}

function MovieCreate({ onNavigate }: MovieCreateProps) {
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  async function handleSubmit(payload: MoviePayload) {
    await createMovie(payload)
    setShowSuccessModal(true)
  }

  return (
    <main className="app-shell movie-admin-page movie-form-page">
      <div className="admin-topbar">
        <div className="brand-mark">CB</div>
        <div>
          <strong>Cinema Booking System</strong>
          <span>Không gian quản trị rạp chiếu</span>
        </div>
        <nav className="module-nav">
          <button type="button" className="active" onClick={() => onNavigate("/admin/movies")}>
            Phim
          </button>
          <button type="button" onClick={() => onNavigate("/admin/cinema-rooms")}>
            Phòng chiếu
          </button>
        </nav>
      </div>

      <header className="page-header">
        <div>
          <p className="eyebrow">Quản lý phim</p>
          <h1>Thêm phim mới</h1>
          <p className="page-subtitle">
            Nhập thông tin phát hành, phân loại và nội dung hiển thị cho phim mới.
          </p>
        </div>
      </header>

      <MovieForm submitLabel="Thêm phim" onSubmit={handleSubmit} onCancel={() => onNavigate("/admin/movies")} />

      {showSuccessModal && (
        <AppModal
          title="Thêm phim thành công"
          message="Phim mới đã được lưu vào hệ thống."
          variant="success"
          actions={[
            {
              label: "OK",
              onClick: () => onNavigate("/admin/movies"),
            },
          ]}
        />
      )}
    </main>
  )
}

export default MovieCreate
