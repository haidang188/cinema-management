import { useEffect, useMemo, useState } from "react"
import { getRooms } from "../../../service/cinema-room/cinemaRoomService"
import type { CinemaRoom, NavigateHandler } from "../../../types/admin"

const PAGE_SIZE = 10

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Hoạt động",
  MAINTENANCE: "Bảo trì",
  INACTIVE: "Ngừng hoạt động",
}

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

interface CinemaRoomListProps {
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

function CinemaRoomList({ onNavigate }: CinemaRoomListProps) {
  const [rooms, setRooms] = useState<CinemaRoom[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages])
  const firstItemIndex = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const lastItemIndex = Math.min(page * PAGE_SIZE + rooms.length, totalElements)
  const hasActiveFilter = Boolean(keyword || status)

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

    getRooms({ page, size: PAGE_SIZE, keyword, status })
      .then((data) => {
        if (!ignore) {
          setRooms(data.content || [])
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
  }, [keyword, page, status])

  function handleResetFilters() {
    setSearchTerm("")
    setKeyword("")
    setStatus("")
    setPage(0)
  }

  return (
    <main className="app-shell room-admin-page room-list-page">
      <header className="room-page-header">
        <div>
          <p className="room-page-eyebrow">Sprint 2</p>
          <h1>Quản lý phòng chiếu</h1>
          <p>Quản lý danh sách phòng và cấu hình sơ đồ ghế.</p>
        </div>
        <button type="button" className="primary-button room-add-button" onClick={() => onNavigate("/admin/cinema-rooms/create")}>
          Thêm phòng chiếu
        </button>
      </header>

      <section className="room-toolbar" aria-label="Tìm kiếm và lọc phòng chiếu">
        <label className="room-search-field">
          <span>Tìm kiếm</span>
          <input
            name="keyword"
            type="search"
            placeholder="Tìm kiếm theo tên phòng..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <label className="room-filter-field">
          <span>Trạng thái</span>
          <select
            aria-label="Lọc trạng thái phòng"
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

        <button
          type="button"
          className="secondary-button room-reset-button"
          disabled={!hasActiveFilter}
          aria-label="Đặt lại bộ lọc phòng chiếu"
          onClick={handleResetFilters}
        >
          Đặt lại
        </button>
      </section>

      {error && <div className="room-alert room-alert-error">{error}</div>}

      {loading && (
        <div className="room-table-card" aria-label="Đang tải danh sách phòng">
          <div className="room-skeleton-row" />
          <div className="room-skeleton-row" />
          <div className="room-skeleton-row" />
        </div>
      )}

      {!loading && !error && rooms.length === 0 && (
        <section className="room-empty-state">
          <h2>Không tìm thấy phòng chiếu phù hợp</h2>
          <p>Thử đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
        </section>
      )}

      {!loading && !error && rooms.length > 0 && (
        <>
          <div className="room-table-card">
            <table className="room-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Tên phòng</th>
                  <th>Loại phòng</th>
                  <th>Tổng số ghế</th>
                  <th>Trạng thái</th>
                  <th className="action-column">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {rooms.map((room, index) => (
                  <tr key={room.id}>
                    <td>{page * PAGE_SIZE + index + 1}</td>
                    <td>
                      <strong className="room-title-text">{room.name}</strong>
                    </td>
                    <td>{room.roomType || "-"}</td>
                    <td>{room.totalSeats ?? 0}</td>
                    <td>
                      <span className={`status-badge room-status-${room.status?.toLowerCase() || "unknown"}`}>
                        {STATUS_LABELS[room.status || ""] || room.status || "-"}
                      </span>
                    </td>
                    <td className="action-column">
                      <button
                        type="button"
                        className="edit-button room-edit-button"
                        aria-label={`Sửa phòng ${room.name}`}
                        onClick={() => onNavigate(`/admin/cinema-rooms/${room.id}/edit`)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="edit-button room-detail-button"
                        aria-label={`Xem chi tiết ghế của ${room.name}`}
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

          <nav className="pagination room-pagination" aria-label="Phân trang phòng chiếu">
            <span className="pagination-summary">
              Hiển thị {firstItemIndex}-{lastItemIndex} trong {totalElements} phòng
            </span>
            <button
              type="button"
              className="pagination-button"
              disabled={page === 0}
              aria-label="Trang trước"
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
            >
              Trước
            </button>
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`pagination-button${pageNumber === page ? " is-active" : ""}`}
                aria-current={pageNumber === page ? "page" : undefined}
                aria-label={`Trang ${pageNumber + 1}`}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber + 1}
              </button>
            ))}
            <button
              type="button"
              className="pagination-button"
              disabled={page + 1 >= totalPages}
              aria-label="Trang sau"
              onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
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
