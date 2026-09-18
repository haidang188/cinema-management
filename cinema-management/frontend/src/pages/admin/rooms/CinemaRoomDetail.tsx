import { useEffect, useMemo, useState } from "react"
import AppModal from "../../../component/common/AppModal"
import SeatMap from "../../../component/room/SeatMap"
import { getRoomDetail, updateSeatTypes } from "../../../service/cinema-room/cinemaRoomService"
import type { CinemaRoom, NavigateHandler, Seat } from "../../../types/admin"

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Hoạt động",
  MAINTENANCE: "Bảo trì",
  INACTIVE: "Ngừng hoạt động",
}

const SAVE_SUCCESS_MESSAGE = "Cập nhật loại ghế thành công"
const SAVE_ERROR_MESSAGE = "Không thể cập nhật loại ghế. Vui lòng thử lại."

interface CinemaRoomDetailProps {
  roomId: string
  onNavigate: NavigateHandler
}

function CinemaRoomDetail({ roomId, onNavigate }: CinemaRoomDetailProps) {
  const [room, setRoom] = useState<CinemaRoom | null>(null)
  const [pendingSeatTypes, setPendingSeatTypes] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [toastMessage, setToastMessage] = useState("")

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError("")

    getRoomDetail(roomId)
      .then((data) => {
        if (!ignore) {
          setRoom(data)
          setPendingSeatTypes({})
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
  }, [roomId])

  useEffect(() => {
    if (!toastMessage) return undefined

    const timeoutId = window.setTimeout(() => setToastMessage(""), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  const hasChanges = Object.keys(pendingSeatTypes).length > 0

  const seatStats = useMemo(() => {
    const seats = room?.seats || []
    return {
      total: seats.length,
      normal: seats.filter((seat) => (pendingSeatTypes[seat.id] || seat.seatType) === "NORMAL").length,
      vip: seats.filter((seat) => (pendingSeatTypes[seat.id] || seat.seatType) === "VIP").length,
      inactive: seats.filter((seat) => seat.status !== "ACTIVE").length,
    }
  }, [pendingSeatTypes, room])

  function handleToggleSeat(seat: Seat) {
    if (seat.status !== "ACTIVE" || saving) return

    const currentType = pendingSeatTypes[seat.id] || seat.seatType
    const nextType = currentType === "VIP" ? "NORMAL" : "VIP"

    setPendingSeatTypes((current) => {
      const updated = { ...current }
      if (nextType === seat.seatType) {
        delete updated[seat.id]
      } else {
        updated[seat.id] = nextType
      }
      return updated
    })
  }

  async function handleSave() {
    if (!hasChanges || saving) return

    const seats = Object.entries(pendingSeatTypes).map(([seatId, seatType]) => ({
      seatId: Number(seatId),
      seatType,
    }))

    setSaving(true)
    setError("")
    try {
      const updatedRoom = await updateSeatTypes(roomId, seats)
      setRoom(updatedRoom)
      setPendingSeatTypes({})
      setToastMessage(SAVE_SUCCESS_MESSAGE)
    } catch {
      setError(SAVE_ERROR_MESSAGE)
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (hasChanges) {
      setShowLeaveModal(true)
      return
    }
    onNavigate("/admin/cinema-rooms")
  }

  return (
    <main className="app-shell room-admin-page room-detail-page">
      <header className="room-page-header">
        <div>
          <p className="room-page-eyebrow">Sprint 2</p>
          <h1>Chi tiết phòng chiếu</h1>
          <p>Chọn ghế để chuyển giữa ghế thường và ghế VIP, sau đó lưu một lần.</p>
        </div>
        <button
          type="button"
          className="secondary-button room-back-button"
          aria-label="Quay lại danh sách phòng chiếu"
          onClick={handleBack}
        >
          Quay lại
        </button>
      </header>

      {loading && <div className="room-alert">Đang tải sơ đồ ghế...</div>}
      {error && <div className="room-alert room-alert-error">{error}</div>}

      {!loading && !error && room && (
        <>
          <section className="room-detail-grid" aria-label="Thông tin phòng chiếu">
            <div className="room-summary-card">
              <span>Tên phòng</span>
              <strong>{room.name}</strong>
            </div>
            <div className="room-summary-card">
              <span>Loại phòng</span>
              <strong>{room.roomType || "-"}</strong>
            </div>
            <div className="room-summary-card">
              <span>Tổng số ghế</span>
              <strong>{room.totalSeats || seatStats.total}</strong>
            </div>
            <div className="room-summary-card">
              <span>Trạng thái</span>
              <strong>{STATUS_LABELS[room.status || ""] || room.status || "-"}</strong>
            </div>
          </section>

          <section className="seat-map-heading">
            <div>
              <p className="room-page-eyebrow">Sơ đồ ghế</p>
              <h2>Sơ đồ ghế</h2>
            </div>
            <div className="seat-stats" aria-label="Thống kê ghế">
              <span>{seatStats.total} ghế</span>
              <span>{seatStats.normal} thường</span>
              <span>{seatStats.vip} VIP</span>
              <span>{seatStats.inactive} không hoạt động</span>
            </div>
          </section>

          <SeatMap seats={room.seats || []} pendingSeatTypes={pendingSeatTypes} onToggleSeat={handleToggleSeat} />

          <div className="room-action-bar">
            <span className={hasChanges ? "dirty-note active" : "dirty-note"}>
              {hasChanges ? `${Object.keys(pendingSeatTypes).length} ghế chưa lưu` : "Chưa có thay đổi"}
            </span>
            <button
              type="button"
              className="primary-button"
              disabled={!hasChanges || saving}
              aria-label="Lưu thay đổi loại ghế"
              onClick={handleSave}
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </>
      )}

      {showLeaveModal && (
        <AppModal
          title="Bạn có thay đổi chưa lưu"
          message="Bạn có thay đổi chưa lưu. Bạn có chắc muốn rời trang?"
          variant="warning"
          actions={[
            {
              label: "Ở lại",
              variant: "secondary",
              onClick: () => setShowLeaveModal(false),
            },
            {
              label: "Rời trang",
              onClick: () => onNavigate("/admin/cinema-rooms"),
            },
          ]}
        />
      )}

      {toastMessage && (
        <div className="room-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </main>
  )
}

export default CinemaRoomDetail
