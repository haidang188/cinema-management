import { useEffect, useMemo, useState } from "react"
import AppModal from "../../../component/common/AppModal"
import MovieForm from "../../../component/movie/MovieForm"
import { createMovie, getMovie, getMovies, updateMovie } from "../../../service/movie/movieService"
import type { AdminMovie, Genre, MoviePayload, NavigateHandler } from "../../../types/admin"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Sắp chiếu",
  SHOWING: "Đang chiếu",
  ENDED: "Đã kết thúc",
  INACTIVE: "Ngừng hoạt động",
}

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "SHOWING", label: "Đang chiếu" },
  { value: "UPCOMING", label: "Sắp chiếu" },
  { value: "ENDED", label: "Đã kết thúc" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

const MODAL_CLOSE_WARNING = "Bạn có thay đổi chưa được lưu. Bạn có chắc muốn đóng modal?"
const DELETE_ERROR_MESSAGE = "Không thể xóa phim. Vui lòng thử lại."

type PaginationItem = number | "ellipsis-start" | "ellipsis-end"

interface MovieListProps {
  onNavigate: NavigateHandler
}

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 0) return []
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index)
  }

  const items = new Set<number>([0, totalPages - 1])
  for (let pageNumber = currentPage - 1; pageNumber <= currentPage + 1; pageNumber += 1) {
    if (pageNumber > 0 && pageNumber < totalPages - 1) {
      items.add(pageNumber)
    }
  }

  const sortedItems = Array.from(items).sort((firstPage, secondPage) => firstPage - secondPage)
  return sortedItems.flatMap((pageNumber, index) => {
    const previousPage = sortedItems[index - 1]
    if (previousPage !== undefined && pageNumber - previousPage > 1) {
      return [pageNumber < currentPage ? "ellipsis-start" : "ellipsis-end", pageNumber]
    }
    return [pageNumber]
  })
}

function formatReleaseDate(value?: string) {
  if (!value) return "-"

  const [year, month, day] = value.split("T")[0].split("-")
  if (!year || !month || !day) return value

  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

function getVisibleGenres(genres: Genre[] = []) {
  return {
    shown: genres.slice(0, 3),
    hiddenCount: Math.max(genres.length - 3, 0),
  }
}

function toMoviePayload(movie: AdminMovie, status = movie.status || "INACTIVE"): MoviePayload {
  return {
    title: movie.title || "",
    description: movie.description || "",
    durationMinutes: movie.durationMinutes || 1,
    releaseDate: movie.releaseDate || "",
    ageRating: movie.ageRating || "",
    director: movie.director || "",
    cast: movie.cast || "",
    language: movie.language || "",
    posterUrl: movie.posterUrl || "",
    trailerUrl: movie.trailerUrl || "",
    status,
    genreIds: movie.genres?.map((genre) => genre.id) || [],
  }
}

function MovieList({ onNavigate }: MovieListProps) {
  const [movies, setMovies] = useState<AdminMovie[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(0)
  const [pageSize, setPageSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [refreshToken, setRefreshToken] = useState(0)
  const [toastMessage, setToastMessage] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingMovieId, setEditingMovieId] = useState<number | null>(null)
  const [editingMovie, setEditingMovie] = useState<AdminMovie | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState("")
  const [deleteMovieTarget, setDeleteMovieTarget] = useState<AdminMovie | null>(null)
  const [deleting, setDeleting] = useState(false)
  const paginationItems = useMemo(() => getPaginationItems(page, totalPages), [page, totalPages])
  const hasActiveFilter = Boolean(keyword || status)
  const firstItemIndex = totalElements === 0 ? 0 : page * pageSize + 1
  const lastItemIndex = Math.min(page * pageSize + movies.length, totalElements)

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
    setError("")

    getMovies({ page, size: pageSize, keyword, status })
      .then((data) => {
        if (!ignore) {
          setMovies(data.content || [])
          setTotalPages(data.totalPages || 0)
          setTotalElements(data.totalElements || 0)

          if (data.totalPages > 0 && page >= data.totalPages) {
            setPage(data.totalPages - 1)
          }
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
  }, [keyword, page, pageSize, refreshToken, status])

  useEffect(() => {
    if (!toastMessage) return undefined
    const timeoutId = window.setTimeout(() => setToastMessage(""), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  useEffect(() => {
    if (!editingMovieId) {
      setEditingMovie(null)
      setEditError("")
      return undefined
    }

    let ignore = false
    setEditLoading(true)
    setEditError("")

    getMovie(String(editingMovieId))
      .then((data) => {
        if (!ignore) setEditingMovie(data)
      })
      .catch((requestError: Error) => {
        if (!ignore) setEditError(requestError.message)
      })
      .finally(() => {
        if (!ignore) setEditLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [editingMovieId])

  function handleResetFilters() {
    setSearchTerm("")
    setKeyword("")
    setStatus("")
    setPage(0)
  }

  function refreshMovies() {
    setRefreshToken((current) => current + 1)
  }

  async function handleCreateMovie(payload: MoviePayload) {
    await createMovie(payload)
    setShowCreateModal(false)
    setPage(0)
    refreshMovies()
    setToastMessage("Thêm phim thành công")
  }

  async function handleUpdateMovie(payload: MoviePayload) {
    if (!editingMovieId) return
    await updateMovie(String(editingMovieId), payload)
    setEditingMovieId(null)
    refreshMovies()
    setToastMessage("Cập nhật phim thành công")
  }

  async function handleDeleteMovie() {
    if (!deleteMovieTarget || deleting) return

    setDeleting(true)
    setError("")
    try {
      const fullMovie = await getMovie(String(deleteMovieTarget.id))
      await updateMovie(String(deleteMovieTarget.id), toMoviePayload(fullMovie, "INACTIVE"))
      setDeleteMovieTarget(null)
      refreshMovies()
      setToastMessage("Xóa phim thành công")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : DELETE_ERROR_MESSAGE)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="app-shell movie-admin-page movie-list-page">
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

      <header className="movie-page-header">
        <div>
          <p className="movie-page-eyebrow">Sprint 1</p>
          <h1>Quản lý phim</h1>
          <p>Quản lý danh sách phim đang chiếu, sắp chiếu và đã kết thúc</p>
        </div>
        <button type="button" className="primary-button movie-add-button" onClick={() => setShowCreateModal(true)}>
          + Thêm phim
        </button>
      </header>

      <section className="movie-toolbar" aria-label="Tìm kiếm và lọc phim">
        <label className="movie-search-field">
          <span>Tìm kiếm</span>
          <input
            name="keyword"
            type="search"
            placeholder="Tìm theo tên phim hoặc đạo diễn..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <label className="movie-filter-field">
          <span>Trạng thái</span>
          <select
            aria-label="Lọc trạng thái phim"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(0)
            }}
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>

        <label className="movie-filter-field">
          <span>Mỗi trang</span>
          <select
            aria-label="Số phim mỗi trang"
            value={pageSize}
            onChange={(event) => {
              setPageSize(Number(event.target.value))
              setPage(0)
            }}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} phim
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="secondary-button movie-reset-button" disabled={!hasActiveFilter} onClick={handleResetFilters}>
          Reset
        </button>
      </section>

      {error && <div className="movie-alert movie-alert-error">{error}</div>}

      {loading && (
        <div className="movie-table-card" aria-label="Đang tải danh sách phim">
          <div className="movie-skeleton-row" />
          <div className="movie-skeleton-row" />
          <div className="movie-skeleton-row" />
          <div className="movie-skeleton-row" />
        </div>
      )}

      {!loading && !error && movies.length === 0 && (
        <section className="movie-empty-state">
          <div className="movie-empty-icon" aria-hidden="true">
            +
          </div>
          <h2>Chưa có phim nào</h2>
          <p>Hãy thêm phim mới hoặc đổi bộ lọc để tiếp tục quản lý.</p>
          <button type="button" className="primary-button" onClick={() => setShowCreateModal(true)}>
            + Thêm phim
          </button>
        </section>
      )}

      {!loading && !error && movies.length > 0 && (
        <>
          <div className="movie-table-card">
            <table className="movie-table movie-admin-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Poster</th>
                  <th>Tên phim</th>
                  <th>Đạo diễn</th>
                  <th>Thể loại</th>
                  <th>Ngày phát hành</th>
                  <th>Thời lượng</th>
                  <th>Giới hạn tuổi</th>
                  <th>Trạng thái</th>
                  <th className="action-column">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {movies.map((movie, index) => {
                  const { shown, hiddenCount } = getVisibleGenres(movie.genres)

                  return (
                    <tr key={movie.id}>
                      <td>{page * pageSize + index + 1}</td>
                      <td>
                        <div className="poster-cell movie-poster-thumb">
                          {movie.posterUrl ? <img src={movie.posterUrl} alt={`Poster ${movie.title}`} /> : <span>Không ảnh</span>}
                        </div>
                      </td>
                      <td>
                        <strong className="movie-title-text" title={movie.title}>
                          {movie.title}
                        </strong>
                      </td>
                      <td>
                        <span className="movie-director-text" title={movie.director || undefined}>
                          {movie.director || "-"}
                        </span>
                      </td>
                      <td>
                        <div className="genre-list movie-genre-list">
                          {shown.length > 0 ? (
                            <>
                              {shown.map((genre) => (
                                <span key={genre.id}>{genre.name}</span>
                              ))}
                              {hiddenCount > 0 && <span>+{hiddenCount}</span>}
                            </>
                          ) : (
                            <span>Chưa có</span>
                          )}
                        </div>
                      </td>
                      <td>{formatReleaseDate(movie.releaseDate)}</td>
                      <td>{movie.durationMinutes} phút</td>
                      <td>{movie.ageRating || "-"}</td>
                      <td>
                        <span className={`status-badge status-${movie.status?.toLowerCase() || "unknown"}`}>
                          {STATUS_LABELS[movie.status || ""] || movie.status || "-"}
                        </span>
                      </td>
                      <td className="action-column">
                        <button
                          type="button"
                          className="edit-button movie-edit-button"
                          onClick={() => setEditingMovieId(movie.id)}
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          className="edit-button movie-delete-button"
                          disabled={movie.status === "INACTIVE"}
                          onClick={() => setDeleteMovieTarget(movie)}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <nav className="pagination movie-pagination" aria-label="Phân trang danh sách phim">
            <span className="pagination-summary">
              Hiển thị {firstItemIndex}-{lastItemIndex} trong {totalElements} phim
            </span>
            <button
              type="button"
              className="pagination-button"
              aria-label="Trang đầu"
              disabled={page === 0}
              onClick={() => setPage(0)}
            >
              Đầu
            </button>
            <button
              type="button"
              className="pagination-button"
              aria-label="Trang trước"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
            >
              Trước
            </button>
            {paginationItems.map((item) =>
              typeof item === "number" ? (
                <button
                  key={item}
                  type="button"
                  className={`pagination-button${item === page ? " is-active" : ""}`}
                  aria-current={item === page ? "page" : undefined}
                  onClick={() => setPage(item)}
                >
                  {item + 1}
                </button>
              ) : (
                <span key={item} className="pagination-ellipsis" aria-hidden="true">
                  ...
                </span>
              ),
            )}
            <button
              type="button"
              className="pagination-button"
              aria-label="Trang sau"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
            >
              Sau
            </button>
            <button
              type="button"
              className="pagination-button"
              aria-label="Trang cuối"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage(totalPages - 1)}
            >
              Cuối
            </button>
          </nav>
        </>
      )}

      {showCreateModal && (
        <AppModal
          title="Thêm phim"
          size="lg"
          className="crud-modal"
          onClose={() => setShowCreateModal(false)}
          confirmOnCloseMessage={MODAL_CLOSE_WARNING}
        >
          <MovieForm
            submitLabel="Thêm mới"
            cancelLabel="Hủy"
            onSubmit={handleCreateMovie}
            onCancel={() => setShowCreateModal(false)}
          />
        </AppModal>
      )}

      {editingMovieId && (
        <AppModal
          title="Chỉnh sửa phim"
          size="lg"
          className="crud-modal"
          onClose={() => setEditingMovieId(null)}
          confirmOnCloseMessage={editingMovie ? MODAL_CLOSE_WARNING : undefined}
        >
          {editLoading && <div className="movie-alert">Đang tải thông tin phim...</div>}
          {editError && <div className="movie-alert movie-alert-error">{editError}</div>}
          {!editLoading && !editError && editingMovie && (
            <MovieForm
              initialMovie={editingMovie}
              submitLabel="Lưu thay đổi"
              cancelLabel="Hủy"
              onSubmit={handleUpdateMovie}
              onCancel={() => setEditingMovieId(null)}
            />
          )}
        </AppModal>
      )}

      {deleteMovieTarget && (
        <AppModal
          title="Xóa phim"
          variant="warning"
          size="sm"
          onClose={() => setDeleteMovieTarget(null)}
          closeOnOverlay={!deleting}
          actions={[
            {
              label: "Hủy",
              variant: "secondary",
              disabled: deleting,
              onClick: () => setDeleteMovieTarget(null),
            },
            {
              label: deleting ? "Đang xóa..." : "Xác nhận xóa",
              disabled: deleting,
              onClick: handleDeleteMovie,
            },
          ]}
        >
          <div className="delete-confirm-copy">
            <p>Bạn có chắc muốn xóa phim này không?</p>
            <strong>{deleteMovieTarget.title}</strong>
            <p>Phim sẽ được chuyển sang trạng thái ngừng hoạt động.</p>
          </div>
        </AppModal>
      )}

      {toastMessage && (
        <div className="room-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </main>
  )
}

export default MovieList
