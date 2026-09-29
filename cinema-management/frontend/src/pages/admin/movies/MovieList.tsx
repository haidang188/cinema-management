import { useEffect, useMemo, useState } from "react"
import AppModal from "../../../component/common/AppModal"
import { deleteMovie, getMovies } from "../../../service/movie/movieService"
import type { AdminMovie, Genre, NavigateHandler } from "../../../types/admin"

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50]

const STATUS_LABELS: Record<string, string> = {
  UPCOMING: "Sap chieu",
  SHOWING: "Dang chieu",
  ENDED: "Da ket thuc",
  INACTIVE: "Ngung hoat dong",
}

const STATUS_FILTERS = [
  { value: "", label: "Tat ca trang thai" },
  { value: "SHOWING", label: "Dang chieu" },
  { value: "UPCOMING", label: "Sap chieu" },
  { value: "ENDED", label: "Da ket thuc" },
  { value: "INACTIVE", label: "Ngung hoat dong" },
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
      if (movies.length === 1 && page > 0) {
        setPage((current) => current - 1)
      } else {
        await reloadCurrentPage()
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Khong the xoa phim. Vui long thu lai.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="app-shell movie-admin-page movie-list-page">
      <header className="movie-page-header">
        <div>
          <h1>Quan ly phim</h1>
          <p>Quan ly danh sach phim dang chieu, sap chieu va ngung chieu trong he thong.</p>
        </div>
        <button type="button" className="primary-button movie-add-button" onClick={() => onNavigate("/admin/movies/create")}>
          + Them phim
        </button>
      </header>

      <section className="movie-toolbar" aria-label="Tim kiem va loc phim">
        <label className="movie-search-field">
          <span>Tim kiem</span>
          <input
            name="keyword"
            type="search"
            placeholder="Tim kiem phim, dao dien, dien vien..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <label className="movie-filter-field">
          <span>Trang thai</span>
          <select
            aria-label="Loc trang thai phim"
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
          <span>Moi trang</span>
          <select
            aria-label="So phim moi trang"
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
          Lam moi
        </button>
      </section>

      {error && <div className="movie-alert movie-alert-error">{error}</div>}

      {loading && (
        <div className="movie-table-card" aria-label="Dang tai danh sach phim">
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
          <h2>Chua co phim nao</h2>
          <p>Hay them phim moi hoac doi bo loc de tiep tuc quan ly.</p>
          <button type="button" className="primary-button" onClick={() => onNavigate("/admin/movies/create")}>
            + Them phim
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
                    <th>Ten phim</th>
                    <th>The loai</th>
                    <th>Ngon ngu</th>
                    <th>Thoi luong</th>
                    <th>Ngay khoi chieu</th>
                    <th>Trang thai</th>
                    <th className="action-column">Thao tac</th>
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
                            {movie.posterUrl ? <img src={movie.posterUrl} alt={`Poster ${movie.title}`} /> : <span>Khong anh</span>}
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
                              <span>Chua co</span>
                            )}
                          </div>
                        </td>
                        <td>{movie.language || "-"}</td>
                        <td>{movie.durationMinutes} phut</td>
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
                            o
                          </button>
                          <button
                            type="button"
                            className="edit-button movie-icon-action"
                            aria-label={`Sua phim ${movie.title}`}
                            onClick={(event) => {
                              event.stopPropagation()
                              onNavigate(`/admin/movies/${movie.id}/edit`)
                            }}
                          >
                            E
                          </button>
                          <button
                            type="button"
                            className="edit-button movie-icon-action movie-delete-button"
                            aria-label={`Xoa phim ${movie.title}`}
                            disabled={deleting}
                            onClick={(event) => {
                              event.stopPropagation()
                              setMovieToDelete(movie)
                            }}
                          >
                            x
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <nav className="pagination movie-pagination" aria-label="Phan trang danh sach phim">
              <span className="pagination-summary">
                Hien thi {firstItemIndex}-{lastItemIndex} trong {totalElements} phim
              </span>
              <button type="button" className="pagination-button" disabled={page === 0} onClick={() => setPage((current) => Math.max(current - 1, 0))}>
                {"<"}
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
                {">"}
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
                    <span>Khong anh</span>
                  )}
                </div>
                <div>
                  <h2>{selectedMovie.title}</h2>
                  <p>{selectedMovie.description || "Chua co mo ta ngan."}</p>
                  <span className={`status-badge status-${selectedMovie.status?.toLowerCase() || "unknown"}`}>
                    {STATUS_LABELS[selectedMovie.status || ""] || selectedMovie.status || "-"}
                  </span>
                </div>
              </div>

              <dl className="movie-preview-meta">
                <div>
                  <dt>The loai</dt>
                  <dd>
                    <div className="genre-list movie-genre-list">
                      {(selectedMovie.genres || []).slice(0, 3).map((genre) => (
                        <span key={genre.id}>{genre.name}</span>
                      ))}
                      {(selectedMovie.genres || []).length === 0 && <span>Chua co</span>}
                    </div>
                  </dd>
                </div>
                <div>
                  <dt>Ngon ngu</dt>
                  <dd>{selectedMovie.language || "-"}</dd>
                </div>
                <div>
                  <dt>Thoi luong</dt>
                  <dd>{selectedMovie.durationMinutes} phut</dd>
                </div>
                <div>
                  <dt>Ngay khoi chieu</dt>
                  <dd>{formatReleaseDate(selectedMovie.releaseDate)}</dd>
                </div>
                <div>
                  <dt>Dao dien</dt>
                  <dd>{selectedMovie.director || "-"}</dd>
                </div>
                <div>
                  <dt>Dien vien</dt>
                  <dd>{selectedMovie.cast || "-"}</dd>
                </div>
              </dl>

              <section className="movie-preview-description">
                <h3>Noi dung phim</h3>
                <p>{selectedMovie.description || "Chua co noi dung phim."}</p>
              </section>

              <div className="movie-preview-actions">
                {selectedMovie.trailerUrl && (
                  <a href={selectedMovie.trailerUrl} target="_blank" rel="noreferrer" className="secondary-button">
                    Xem trailer
                  </a>
                )}
                <button type="button" className="secondary-button movie-delete-button" disabled={deleting} onClick={() => setMovieToDelete(selectedMovie)}>
                  Xoa phim
                </button>
                <button type="button" className="primary-button" onClick={() => onNavigate(`/admin/movies/${selectedMovie.id}/edit`)}>
                  Chinh sua
                </button>
              </div>
            </aside>
          )}
        </section>
      )}

      {movieToDelete && (
        <AppModal
          title="Xoa phim"
          message={`Ban co chac muon xoa phim "${movieToDelete.title}"? Hanh dong nay khong the hoan tac.`}
          variant="warning"
          size="sm"
          closeOnEsc={!deleting}
          closeOnOverlay={!deleting}
          onClose={() => {
            if (!deleting) setMovieToDelete(null)
          }}
          actions={[
            {
              label: "Huy",
              variant: "secondary",
              disabled: deleting,
              onClick: () => setMovieToDelete(null),
            },
            {
              label: deleting ? "Dang xoa..." : "Xoa phim",
              disabled: deleting,
              onClick: handleDeleteMovie,
            },
          ]}
        />
      )}
    </main>
  )
}

export default MovieList
