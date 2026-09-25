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

const SEAT_TYPE_LABELS: Record<string, string> = {
  NORMAL: "Ghế thường",
  VIP: "Ghế VIP",
}

const SEAT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Không hoạt động",
}

const LEAVE_WARNING_MESSAGE = "Bạn có thay đổi chưa được lưu. Bạn có chắc muốn rời khỏi trang?"
const SAVE_SUCCESS_MESSAGE = "Cập nhật ghế thành công"
const SAVE_ERROR_MESSAGE = "Không thể cập nhật ghế. Vui lòng kiểm tra dữ liệu và thử lại."

interface SeatDraft {
  seatType: string
  status: string
}

interface CinemaRoomDetailProps {
  roomId: string
  onNavigate: NavigateHandler
}

function getSeatDraft(seat: Seat, pendingSeats: Record<number, SeatDraft>): SeatDraft {
  return pendingSeats[seat.id] || { seatType: seat.seatType || "NORMAL", status: seat.status || "ACTIVE" }
}

function CinemaRoomDetail({ roomId, onNavigate }: CinemaRoomDetailProps) {
  const [room, setRoom] = useState<CinemaRoom | null>(null)
  const [pendingSeats, setPendingSeats] = useState<Record<number, SeatDraft>>({})
  const [selectedSeatId, setSelectedSeatId] = useState<number | undefined>()
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
          setPendingSeats({})
          setSelectedSeatId(undefined)
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

  const hasChanges = Object.keys(pendingSeats).length > 0

  useEffect(() => {
    if (!hasChanges) return undefined

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault()
      event.returnValue = LEAVE_WARNING_MESSAGE
      return LEAVE_WARNING_MESSAGE
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasChanges])

  const selectedSeat = useMemo(
    () => room?.seats?.find((seat) => seat.id === selectedSeatId),
    [room?.seats, selectedSeatId],
  )

  const selectedDraft = selectedSeat ? getSeatDraft(selectedSeat, pendingSeats) : null

  const seatStats = useMemo(() => {
    const seats = room?.seats || []
    return {
      actualTotal: seats.length,
      normal: seats.filter((seat) => getSeatDraft(seat, pendingSeats).seatType === "NORMAL").length,
      vip: seats.filter((seat) => getSeatDraft(seat, pendingSeats).seatType === "VIP").length,
      inactive: seats.filter((seat) => getSeatDraft(seat, pendingSeats).status !== "ACTIVE").length,
    }
  }, [pendingSeats, room])

  function updateSelectedSeat(field: keyof SeatDraft, value: string) {
    if (!selectedSeat || saving) return

    setPendingSeats((current) => {
      const nextDraft = {
        seatType: field === "seatType" ? value : current[selectedSeat.id]?.seatType || selectedSeat.seatType || "NORMAL",
        status: field === "status" ? value : current[selectedSeat.id]?.status || selectedSeat.status || "ACTIVE",
      }

      const unchanged = nextDraft.seatType === selectedSeat.seatType && nextDraft.status === selectedSeat.status
      const updated = { ...current }
      if (unchanged) {
        delete updated[selectedSeat.id]
      } else {
        updated[selectedSeat.id] = nextDraft
      }
      return updated
    })
  }

  async function handleSave() {
    if (!hasChanges || saving) return

    const seats = Object.entries(pendingSeats).map(([seatId, draft]) => ({
      seatId: Number(seatId),
      seatType: draft.seatType,
      status: draft.status,
    }))

    setSaving(true)
    setError("")
    try {
      const updatedRoom = await updateSeatTypes(roomId, seats)
      setRoom(updatedRoom)
      setPendingSeats({})
      setSelectedSeatId(undefined)
      setToastMessage(SAVE_SUCCESS_MESSAGE)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : SAVE_ERROR_MESSAGE)
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
          <p className="room-page-eyebrow">Quản lý phòng chiếu</p>
          <h1>Chi tiết phòng chiếu</h1>
          <p>Chọn ghế để thay đổi loại ghế hoặc trạng thái, sau đó lưu một lần.</p>
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
              <strong>{room.totalSeats ?? seatStats.actualTotal}</strong>
              {room.totalSeats !== undefined && room.totalSeats !== seatStats.actualTotal && (
                <small>Thực tế: {seatStats.actualTotal}</small>
              )}
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
              <span>Tổng số ghế: {seatStats.actualTotal}</span>
              <span>Ghế thường: {seatStats.normal}</span>
              <span>Ghế VIP: {seatStats.vip}</span>
              <span>Ghế không hoạt động: {seatStats.inactive}</span>
            </div>
          </section>

          <div className="seat-editor-layout">
            <SeatMap
              seats={room.seats || []}
              pendingSeats={pendingSeats}
              selectedSeatId={selectedSeatId}
              onSelectSeat={(seat) => setSelectedSeatId(seat.id)}
            />

            <aside className="seat-editor-panel" aria-label="Chỉnh sửa ghế">
              {selectedSeat && selectedDraft ? (
                <>
                  <div>
                    <span>Ghế đang chọn</span>
                    <strong>{selectedSeat.seatName}</strong>
                    <small>
                      Hàng {selectedSeat.rowLabel}, số {selectedSeat.seatNumber}
                    </small>
                  </div>

                  <label className="room-form-field">
                    <span>Loại ghế</span>
                    <select
                      value={selectedDraft.seatType}
                      disabled={saving}
                      onChange={(event) => updateSelectedSeat("seatType", event.target.value)}
                    >
                      {Object.entries(SEAT_TYPE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="room-form-field">
                    <span>Trạng thái ghế</span>
                    <select
                      value={selectedDraft.status}
                      disabled={saving}
                      onChange={(event) => updateSelectedSeat("status", event.target.value)}
                    >
                      {Object.entries(SEAT_STATUS_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              ) : (
                <div className="seat-editor-empty">
                  <strong>Chọn một ghế</strong>
                  <span>Thông tin chỉnh sửa sẽ hiển thị tại đây.</span>
                </div>
              )}
            </aside>
          </div>

          <div className="room-action-bar">
            <span className={hasChanges ? "dirty-note active" : "dirty-note"}>
              {hasChanges ? `${Object.keys(pendingSeats).length} ghế có thay đổi chưa lưu` : "Chưa có thay đổi"}
            </span>
            <button
              type="button"
              className="primary-button"
              disabled={!hasChanges || saving}
              aria-label="Lưu thay đổi ghế"
              onClick={handleSave}
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </>
      )}

      {showLeaveModal && (
        <AppModal
          title="Có thay đổi chưa lưu"
          message={LEAVE_WARNING_MESSAGE}
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
