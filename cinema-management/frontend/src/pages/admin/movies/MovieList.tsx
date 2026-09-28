import { useEffect, useMemo, useState } from "react"
import AppModal from "../../../component/common/AppModal"
import { deleteMovie, getMovies } from "../../../service/movie/movieService"
import type { AdminMovie, Genre, NavigateHandler } from "../../../types/admin"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Sắp chiếu",
  SHOWING: "Đang chiếu",
  ENDED: "Đã kết thúc",
  INACTIVE: "Ngừng hoạt động",
}

const STATUS_FILTERS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "SHOWING", label: "Đang chiếu" },
  { value: "UPCOMING", label: "Sắp chiếu" },
  { value: "ENDED", label: "Đã kết thúc" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

type PaginationItem = number | "ellipsis-start" | "ellipsis-end"

interface MovieListProps {
  onNavigate: NavigateHandler
}

function getPaginationItems(currentPage: number, totalPages: number): PaginationItem[] {
  if (totalPages <= 0) return []
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index)

  const items = new Set<number>([0, totalPages - 1])
  for (let pageNumber = currentPage - 1; pageNumber <= currentPage + 1; pageNumber += 1) {
    if (pageNumber > 0 && pageNumber < totalPages - 1) items.add(pageNumber)
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

  return `${day.padStart(2, "0")}/${month.padStart(2, "0")}/${year}`
}

function getVisibleGenres(genres: Genre[] = []) {
  return {
    shown: genres.slice(0, 3),
    hiddenCount: Math.max(genres.length - 3, 0),
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
  const [deleting, setDeleting] = useState(false)
  const [movieToDelete, setMovieToDelete] = useState<AdminMovie | null>(null)
  const [error, setError] = useState("")
  const [selectedMovieId, setSelectedMovieId] = useState<number | null>(null)

  const paginationItems = useMemo(() => getPaginationItems(page, totalPages), [page, totalPages])
  const hasActiveFilter = Boolean(keyword || status)
  const firstItemIndex = totalElements === 0 ? 0 : page * pageSize + 1
  const lastItemIndex = Math.min(page * pageSize + movies.length, totalElements)
  const selectedMovie = useMemo(
    () => movies.find((movie) => movie.id === selectedMovieId) || movies[0] || null,
    [movies, selectedMovieId],
  )

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
          const nextMovies = data.content || []
          setMovies(nextMovies)
          setSelectedMovieId((current) =>
            current && nextMovies.some((movie) => movie.id === current) ? current : nextMovies[0]?.id || null,
          )
          setTotalPages(data.totalPages || 0)
          setTotalElements(data.totalElements || 0)

          if (data.totalPages > 0 && page >= data.totalPages) setPage(data.totalPages - 1)
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
  }, [keyword, page, pageSize, status])

  function handleResetFilters() {
    setSearchTerm("")
    setKeyword("")
    setStatus("")
    setPage(0)
  }

  async function reloadCurrentPage() {
    const data = await getMovies({ page, size: pageSize, keyword, status })
    const nextMovies = data.content || []
    setMovies(nextMovies)
    setSelectedMovieId((current) =>
      current && nextMovies.some((movie) => movie.id === current) ? current : nextMovies[0]?.id || null,
    )
    setTotalPages(data.totalPages || 0)
    setTotalElements(data.totalElements || 0)
  }

  async function handleDeleteMovie() {
    if (!movieToDelete || deleting) return

    setDeleting(true)
    setError("")
    try {
      await deleteMovie(String(movieToDelete.id))
      setMovieToDelete(null)
      const remainingItemsOnPage = movies.length - 1
      if (remainingItemsOnPage === 0 && page > 0) {
        setPage((current) => current - 1)
      } else {
        await reloadCurrentPage()
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xóa phim. Vui lòng thử lại.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="app-shell movie-admin-page movie-list-page">
      <header className="movie-page-header">
        <div>
          <h1>Quản lý phim</h1>
          <p>Quản lý danh sách phim đang chiếu, sắp chiếu và ngừng chiếu trong hệ thống.</p>
        </div>
        <button type="button" className="primary-button movie-add-button" onClick={() => onNavigate("/admin/movies/create")}>
          + Thêm phim
        </button>
      </header>

      <section className="movie-toolbar" aria-label="Tìm kiếm và lọc phim">
        <label className="movie-search-field">
          <span>Tìm kiếm</span>
          <input
            name="keyword"
            type="search"
            placeholder="Tìm kiếm phim, đạo diễn, diễn viên..."
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
          Làm mới
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
          <button type="button" className="primary-button" onClick={() => onNavigate("/admin/movies/create")}>
            + Thêm phim
          </button>
        </section>
      )}

      {!loading && !error && movies.length > 0 && (
        <section className="movie-content-layout">
          <div className="movie-list-column">
            <div className="movie-table-card">
              <table className="movie-table movie-admin-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Poster</th>
                    <th>Tên phim</th>
                    <th>Thể loại</th>
                    <th>Ngôn ngữ</th>
                    <th>Thời lượng</th>
                    <th>Ngày khởi chiếu</th>
                    <th>Trạng thái</th>
                    <th className="action-column">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {movies.map((movie, index) => {
                    const { shown, hiddenCount } = getVisibleGenres(movie.genres)

                    return (
                      <tr
                        key={movie.id}
                        className={selectedMovie?.id === movie.id ? "is-selected" : undefined}
                        onClick={() => setSelectedMovieId(movie.id)}
                      >
                        <td>{page * pageSize + index + 1}</td>
                        <td>
                          <div className="poster-cell movie-poster-thumb">
                            {movie.posterUrl ? <img src={movie.posterUrl} alt={`Poster ${movie.title}`} /> : <span>Không ảnh</span>}
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="movie-title-button"
                            title={movie.title}
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedMovieId(movie.id)
                            }}
                          >
                            <strong className="movie-title-text">{movie.title}</strong>
                            <span>{movie.description || movie.director || "-"}</span>
                          </button>
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
                        <td>{movie.language || "-"}</td>
                        <td>{movie.durationMinutes} phút</td>
                        <td>{formatReleaseDate(movie.releaseDate)}</td>
                        <td>
                          <span className={`status-badge status-${movie.status?.toLowerCase() || "unknown"}`}>
                            {STATUS_LABELS[movie.status || ""] || movie.status || "-"}
                          </span>
                        </td>
                        <td className="action-column">
                          <button
                            type="button"
                            className="edit-button movie-icon-action"
                            aria-label={`Xem phim ${movie.title}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              setSelectedMovieId(movie.id)
                            }}
                          >
                            ◉
                          </button>
                          <button
                            type="button"
                            className="edit-button movie-icon-action"
                            aria-label={`Sửa phim ${movie.title}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              onNavigate(`/admin/movies/${movie.id}/edit`)
                            }}
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            className="edit-button movie-icon-action"
                            aria-label={`Thêm thao tác cho ${movie.title}`}
                            onClick={(event) => event.stopPropagation()}
                          >
                          ⋯
                        </button>
                        <button
                          type="button"
                          className="edit-button movie-icon-action movie-delete-button"
                          aria-label={`Xóa phim ${movie.title}`}
                          disabled={deleting}
                          onClick={(event) => {
                            event.stopPropagation()
                            setMovieToDelete(movie)
                          }}
                        >
                          ×
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
              <button type="button" className="pagination-button" disabled={page === 0} onClick={() => setPage((current) => Math.max(current - 1, 0))}>
                ‹
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
                disabled={page + 1 >= totalPages}
                onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
              >
                ›
              </button>
            </nav>
          </div>

          {selectedMovie && (
            <aside className="movie-preview-panel">
              <div className="movie-preview-header">
                <div className="movie-preview-poster">
                  {selectedMovie.posterUrl ? (
                    <img src={selectedMovie.posterUrl} alt={`Poster ${selectedMovie.title}`} />
                  ) : (
                    <span>Không ảnh</span>
                  )}
                </div>
                <div>
                  <h2>{selectedMovie.title}</h2>
                  <p>{selectedMovie.description || "Chưa có mô tả ngắn."}</p>
                  <span className={`status-badge status-${selectedMovie.status?.toLowerCase() || "unknown"}`}>
                    {STATUS_LABELS[selectedMovie.status || ""] || selectedMovie.status || "-"}
                  </span>
                </div>
              </div>

              <dl className="movie-preview-meta">
                <div>
                  <dt>Thể loại</dt>
                  <dd>
                    <div className="genre-list movie-genre-list">
                      {(selectedMovie.genres || []).slice(0, 3).map((genre) => (
                        <span key={genre.id}>{genre.name}</span>
                      ))}
                      {(selectedMovie.genres || []).length === 0 && <span>Chưa có</span>}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt>Ngôn ngữ</dt>
                  <dd>{selectedMovie.language || "-"}</dd>
                </div>
                <div>
                  <dt>Thời lượng</dt>
                  <dd>{selectedMovie.durationMinutes} phút</dd>
                </div>
                <div>
                  <dt>Ngày khởi chiếu</dt>
                  <dd>{formatReleaseDate(selectedMovie.releaseDate)}</dd>
                </div>
                <div>
                  <dt>Đạo diễn</dt>
                  <dd>{selectedMovie.director || "-"}</dd>
                </div>
                <div>
                  <dt>Diễn viên</dt>
                  <dd>{selectedMovie.cast || "-"}</dd>
                </div>
              </dl>

              <section className="movie-preview-description">
                <h3>Nội dung phim</h3>
                <p>{selectedMovie.description || "Chưa có nội dung phim."}</p>
              </section>

              <div className="movie-preview-actions">
                {selectedMovie.trailerUrl && (
                  <a href={selectedMovie.trailerUrl} target="_blank" rel="noreferrer" className="secondary-button">
                    Xem trailer
                  </a>
                )}
                <button type="button" className="secondary-button movie-delete-button" disabled={deleting} onClick={() => setMovieToDelete(selectedMovie)}>
                  Xóa phim
                </button>
                <button type="button" className="primary-button" onClick={() => onNavigate(`/admin/movies/${selectedMovie.id}/edit`)}>
                  Chỉnh sửa
                </button>
              </div>
            </aside>
          )}
        </section>
      )}

      {movieToDelete && (
        <AppModal
          title="Xóa phim"
          message={`Bạn có chắc muốn xóa phim "${movieToDelete.title}"? Hành động này không thể hoàn tác.`}
          variant="warning"
          size="sm"
          closeOnEsc={!deleting}
          closeOnOverlay={!deleting}
          onClose={() => {
            if (!deleting) setMovieToDelete(null)
          }}
          actions={[
            {
              label: "Hủy",
              variant: "secondary",
              onClick: () => setMovieToDelete(null),
            },
            {
              label: deleting ? "Đang xóa..." : "Xóa phim",
              onClick: handleDeleteMovie,
            },
          ]}
        />
      )}
    </main>
  )
}

export default MovieList
