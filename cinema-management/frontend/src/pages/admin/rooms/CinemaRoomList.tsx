import { useEffect, useMemo, useState } from "react"
import AppModal from "../../../component/common/AppModal"
import { deleteRoom, getRooms } from "../../../service/cinema-room/cinemaRoomService"
import type { CinemaRoom, NavigateHandler } from "../../../types/admin"

const PAGE_SIZE = 10

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Hoat dong",
  MAINTENANCE: "Bao tri",
  INACTIVE: "Ngung hoat dong",
}

const STATUS_FILTERS = [
  { value: "", label: "Tat ca" },
  { value: "ACTIVE", label: "Hoat dong" },
  { value: "MAINTENANCE", label: "Bao tri" },
  { value: "INACTIVE", label: "Ngung hoat dong" },
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
  const [deleting, setDeleting] = useState(false)
  const [roomToDelete, setRoomToDelete] = useState<CinemaRoom | null>(null)
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
  }, [keyword, page, status])

  function handleResetFilters() {
    setSearchTerm("")
    setKeyword("")
    setStatus("")
    setPage(0)
  }

  async function reloadCurrentPage() {
    const data = await getRooms({ page, size: PAGE_SIZE, keyword, status })
    setRooms(data.content || [])
    setTotalPages(data.totalPages || 0)
    setTotalElements(data.totalElements || 0)
  }

  async function handleDeleteRoom() {
    if (!roomToDelete || deleting) return

    setDeleting(true)
    setError("")
    try {
      await deleteRoom(String(roomToDelete.id))
      setRoomToDelete(null)
      if (rooms.length === 1 && page > 0) {
        setPage((current) => current - 1)
      } else {
        await reloadCurrentPage()
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Khong the xoa phong chieu. Vui long thu lai.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="app-shell room-admin-page room-list-page">
      <header className="room-page-header">
        <div>
          <p className="room-page-eyebrow">Sprint 2</p>
          <h1>Quan ly phong chieu</h1>
          <p>Quan ly danh sach phong va cau hinh so do ghe.</p>
        </div>
        <button type="button" className="primary-button room-add-button" onClick={() => onNavigate("/admin/cinema-rooms/create")}>
          Them phong chieu
        </button>
      </header>

      <section className="room-toolbar" aria-label="Tim kiem va loc phong chieu">
        <label className="room-search-field">
          <span>Tim kiem</span>
          <input
            name="keyword"
            type="search"
            placeholder="Tim kiem theo ten phong..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <label className="room-filter-field">
          <span>Trang thai</span>
          <select
            aria-label="Loc trang thai phong"
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
          aria-label="Dat lai bo loc phong chieu"
          onClick={handleResetFilters}
        >
          Dat lai
        </button>
      </section>

      {error && <div className="room-alert room-alert-error">{error}</div>}

      {loading && (
        <div className="room-table-card" aria-label="Dang tai danh sach phong">
          <div className="room-skeleton-row" />
          <div className="room-skeleton-row" />
          <div className="room-skeleton-row" />
        </div>
      )}

      {!loading && !error && rooms.length === 0 && (
        <section className="room-empty-state">
          <h2>Khong tim thay phong chieu phu hop</h2>
          <p>Thu doi tu khoa tim kiem hoac bo loc trang thai.</p>
        </section>
      )}

      {!loading && !error && rooms.length > 0 && (
        <>
          <div className="room-table-card">
            <table className="room-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Ten phong</th>
                  <th>Loai phong</th>
                  <th>Tong so ghe</th>
                  <th>Trang thai</th>
                  <th className="action-column">Thao tac</th>
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
                        className="edit-button room-icon-action room-edit-button"
                        aria-label={`Sua phong ${room.name}`}
                        onClick={() => onNavigate(`/admin/cinema-rooms/${room.id}/edit`)}
                      >
                        E
                      </button>
                      <button
                        type="button"
                        className="edit-button room-icon-action room-detail-button"
                        aria-label={`Xem chi tiet ghe cua ${room.name}`}
                        onClick={() => onNavigate(`/admin/cinema-rooms/${room.id}`)}
                      >
                        ...
                      </button>
                      <button
                        type="button"
                        className="edit-button room-icon-action room-delete-button"
                        aria-label={`Xoa phong ${room.name}`}
                        disabled={deleting}
                        onClick={() => setRoomToDelete(room)}
                      >
                        x
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="pagination room-pagination" aria-label="Phan trang phong chieu">
            <span className="pagination-summary">
              Hien thi {firstItemIndex}-{lastItemIndex} trong {totalElements} phong
            </span>
            <button
              type="button"
              className="pagination-button"
              disabled={page === 0}
              aria-label="Trang truoc"
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
            >
              Truoc
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

      {roomToDelete && (
        <AppModal
          title="Xoa phong chieu"
          message={`Ban co chac muon xoa phong "${roomToDelete.name}"? Thao tac nay se xoa cac ghe cua phong neu phong chua duoc dung boi suat chieu hoac dat ve.`}
          variant="warning"
          size="sm"
          closeOnEsc={!deleting}
          closeOnOverlay={!deleting}
          onClose={() => {
            if (!deleting) setRoomToDelete(null)
          }}
          actions={[
            {
              label: "Huy",
              variant: "secondary",
              disabled: deleting,
              onClick: () => setRoomToDelete(null),
            },
            {
              label: deleting ? "Dang xoa..." : "Xoa phong",
              disabled: deleting,
              onClick: handleDeleteRoom,
            },
          ]}
        />
      )}
    </main>
  )
}

export default CinemaRoomList
