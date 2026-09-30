import { useEffect, useMemo, useState, type FormEvent } from "react"
import AppModal from "../../../component/common/AppModal"
import { createRoom, getRoomDetail, getRooms, updateRoom } from "../../../service/cinema-room/cinemaRoomService"
import type { CinemaRoom, CinemaRoomPayload, CinemaRoomUpdatePayload, NavigateHandler } from "../../../types/admin"

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

const ROOM_TYPES = ["2D", "3D", "IMAX", "VIP"]
const MODAL_CLOSE_WARNING = "Bạn có thay đổi chưa được lưu. Bạn có chắc muốn đóng modal?"
const DELETE_ERROR_MESSAGE = "Không thể xóa phòng chiếu. Vui lòng thử lại."

const EMPTY_ROOM_FORM = {
  name: "",
  roomType: "2D",
  rows: "8",
  seatsPerRow: "12",
  status: "ACTIVE",
}

type RoomFormValues = typeof EMPTY_ROOM_FORM

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

interface RoomFormProps {
  mode: "create" | "edit"
  initialRoom?: CinemaRoom | null
  onSubmit: (values: RoomFormValues) => Promise<void>
  onCancel: () => void
}

function getInitialRoomForm(room?: CinemaRoom | null): RoomFormValues {
  if (!room) return EMPTY_ROOM_FORM

  return {
    name: room.name || "",
    roomType: room.roomType || "2D",
    rows: "",
    seatsPerRow: "",
    status: room.status || "ACTIVE",
  }
}

function RoomModalForm({ mode, initialRoom, onSubmit, onCancel }: RoomFormProps) {
  const [formValues, setFormValues] = useState<RoomFormValues>(() => getInitialRoomForm(initialRoom))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const isCreate = mode === "create"
  const totalSeats = isCreate
    ? Number(formValues.rows || 0) * Number(formValues.seatsPerRow || 0)
    : initialRoom?.totalSeats || initialRoom?.seats?.length || 0

  useEffect(() => {
    setFormValues(getInitialRoomForm(initialRoom))
    setError("")
  }, [initialRoom])

  function updateField(name: keyof RoomFormValues, value: string) {
    setFormValues((current) => ({ ...current, [name]: value }))
    setError("")
  }

  function validateValues() {
    const name = formValues.name.trim()
    const rows = Number(formValues.rows)
    const seatsPerRow = Number(formValues.seatsPerRow)

    if (!name) {
      setError("Vui lòng nhập tên phòng chiếu.")
      return false
    }
    if (isCreate && (!Number.isInteger(rows) || rows < 1 || rows > 26)) {
      setError("Số hàng phải từ 1 đến 26.")
      return false
    }
    if (isCreate && (!Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 30)) {
      setError("Số ghế mỗi hàng phải từ 1 đến 30.")
      return false
    }

    return true
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving || !validateValues()) return

    setSaving(true)
    setError("")
    try {
      await onSubmit(formValues)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể lưu phòng chiếu. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="room-form-card" onSubmit={handleSubmit}>
      {error && <div className="room-alert room-alert-error">{error}</div>}

      <div className="room-form-grid">
        <label className="room-form-field room-form-field-full">
          <span>Tên phòng</span>
          <input
            name="name"
            placeholder="Ví dụ: Phòng 01"
            value={formValues.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>

        <label className="room-form-field">
          <span>Loại phòng</span>
          <select value={formValues.roomType} onChange={(event) => updateField("roomType", event.target.value)}>
            {ROOM_TYPES.map((roomType) => (
              <option key={roomType} value={roomType}>
                {roomType}
              </option>
            ))}
          </select>
        </label>

        <label className="room-form-field">
          <span>Trạng thái</span>
          <select value={formValues.status} onChange={(event) => updateField("status", event.target.value)}>
            {STATUS_FILTERS.filter((status) => status.value).map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        {isCreate && (
          <>
            <label className="room-form-field">
              <span>Số hàng ghế</span>
              <input
                min="1"
                max="26"
                name="rows"
                type="number"
                value={formValues.rows}
                onChange={(event) => updateField("rows", event.target.value)}
              />
            </label>

            <label className="room-form-field">
              <span>Số ghế mỗi hàng</span>
              <input
                min="1"
                max="30"
                name="seatsPerRow"
                type="number"
                value={formValues.seatsPerRow}
                onChange={(event) => updateField("seatsPerRow", event.target.value)}
              />
            </label>
          </>
        )}
      </div>

      <div className="room-form-preview">
        <span>{isCreate ? "Tổng ghế sẽ tạo" : "Tổng ghế hiện có"}</span>
        <strong>{Number.isFinite(totalSeats) ? totalSeats : 0}</strong>
      </div>

      <div className="room-action-bar">
        <button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Đang lưu..." : isCreate ? "Thêm mới" : "Lưu thay đổi"}
        </button>
      </div>
    </form>
  )
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
  const [refreshToken, setRefreshToken] = useState(0)
  const [toastMessage, setToastMessage] = useState("")
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingRoomId, setEditingRoomId] = useState<number | null>(null)
  const [editingRoom, setEditingRoom] = useState<CinemaRoom | null>(null)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState("")
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<CinemaRoom | null>(null)
  const [deleting, setDeleting] = useState(false)
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
  }, [keyword, page, refreshToken, status])

  useEffect(() => {
    if (!toastMessage) return undefined
    const timeoutId = window.setTimeout(() => setToastMessage(""), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  useEffect(() => {
    if (!editingRoomId) {
      setEditingRoom(null)
      setEditError("")
      return undefined
    }

    let ignore = false
    setEditLoading(true)
    setEditError("")

    getRoomDetail(String(editingRoomId))
      .then((room) => {
        if (!ignore) setEditingRoom(room)
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
  }, [editingRoomId])

  function handleResetFilters() {
    setSearchTerm("")
    setKeyword("")
    setStatus("")
    setPage(0)
  }

  function refreshRooms() {
    setRefreshToken((current) => current + 1)
  }

  async function handleCreateRoom(values: RoomFormValues) {
    const payload: CinemaRoomPayload = {
      name: values.name.trim(),
      roomType: values.roomType,
      rows: Number(values.rows),
      seatsPerRow: Number(values.seatsPerRow),
      status: values.status,
    }

    await createRoom(payload)
    setShowCreateModal(false)
    setPage(0)
    refreshRooms()
    setToastMessage("Thêm phòng chiếu thành công")
  }

  async function handleUpdateRoom(values: RoomFormValues) {
    if (!editingRoomId) return

    const payload: CinemaRoomUpdatePayload = {
      name: values.name.trim(),
      roomType: values.roomType,
      status: values.status,
    }

    await updateRoom(String(editingRoomId), payload)
    setEditingRoomId(null)
    refreshRooms()
    setToastMessage("Cập nhật phòng chiếu thành công")
  }

  async function handleDeleteRoom() {
    if (!deleteRoomTarget || deleting) return

    setDeleting(true)
    setError("")
    try {
      const room = await getRoomDetail(String(deleteRoomTarget.id))
      await updateRoom(String(deleteRoomTarget.id), {
        name: room.name,
        roomType: room.roomType || "2D",
        status: "INACTIVE",
      })
      setDeleteRoomTarget(null)
      refreshRooms()
      setToastMessage("Xóa phòng chiếu thành công")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : DELETE_ERROR_MESSAGE)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <main className="app-shell room-admin-page room-list-page">
      <header className="room-page-header">
        <div>
          <p className="room-page-eyebrow">Sprint 2</p>
          <h1>Quản lý phòng chiếu</h1>
          <p>Quản lý danh sách phòng và cấu hình sơ đồ ghế.</p>
        </div>
        <button type="button" className="primary-button room-add-button" onClick={() => setShowCreateModal(true)}>
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
                        onClick={() => setEditingRoomId(room.id)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="edit-button room-delete-button"
                        disabled={room.status === "INACTIVE"}
                        aria-label={`Xóa phòng ${room.name}`}
                        onClick={() => setDeleteRoomTarget(room)}
                      >
                        Xóa
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

      {showCreateModal && (
        <AppModal
          title="Thêm phòng chiếu"
          size="md"
          className="crud-modal"
          onClose={() => setShowCreateModal(false)}
          confirmOnCloseMessage={MODAL_CLOSE_WARNING}
        >
          <RoomModalForm
            mode="create"
            onSubmit={handleCreateRoom}
            onCancel={() => setShowCreateModal(false)}
          />
        </AppModal>
      )}

      {editingRoomId && (
        <AppModal
          title="Chỉnh sửa phòng chiếu"
          size="md"
          className="crud-modal"
          onClose={() => setEditingRoomId(null)}
          confirmOnCloseMessage={editingRoom ? MODAL_CLOSE_WARNING : undefined}
        >
          {editLoading && <div className="room-alert">Đang tải thông tin phòng chiếu...</div>}
          {editError && <div className="room-alert room-alert-error">{editError}</div>}
          {!editLoading && !editError && editingRoom && (
            <RoomModalForm
              mode="edit"
              initialRoom={editingRoom}
              onSubmit={handleUpdateRoom}
              onCancel={() => setEditingRoomId(null)}
            />
          )}
        </AppModal>
      )}

      {deleteRoomTarget && (
        <AppModal
          title="Xóa phòng chiếu"
          variant="warning"
          size="sm"
          onClose={() => setDeleteRoomTarget(null)}
          closeOnOverlay={!deleting}
          actions={[
            {
              label: "Hủy",
              variant: "secondary",
              disabled: deleting,
              onClick: () => setDeleteRoomTarget(null),
            },
            {
              label: deleting ? "Đang xóa..." : "Xác nhận xóa",
              disabled: deleting,
              onClick: handleDeleteRoom,
            },
          ]}
        >
          <div className="delete-confirm-copy">
            <p>Bạn có chắc muốn xóa phòng chiếu này không?</p>
            <strong>{deleteRoomTarget.name}</strong>
            <p>Phòng chiếu sẽ được chuyển sang trạng thái ngừng hoạt động.</p>
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

export default CinemaRoomList
