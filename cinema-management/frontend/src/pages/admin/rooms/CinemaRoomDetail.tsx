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
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
}

const SAVE_ERROR_MESSAGE = "Không thể cập nhật ghế. Vui lòng kiểm tra dữ liệu và thử lại."
const SAVE_SUCCESS_MESSAGE = "Cập nhật ghế thành công"
const LEAVE_WARNING_MESSAGE = "Bạn có thay đổi chưa lưu. Nếu rời trang, các thay đổi này sẽ bị mất."

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

function getBulkFieldValue(seats: Seat[], pendingSeats: Record<number, SeatDraft>, field: keyof SeatDraft) {
  if (seats.length === 0) return ""

  const [firstSeat, ...remainingSeats] = seats
  const firstValue = getSeatDraft(firstSeat, pendingSeats)[field]
  const hasMixedValue = remainingSeats.some((seat) => getSeatDraft(seat, pendingSeats)[field] !== firstValue)
  return hasMixedValue ? "MIXED" : firstValue
}

function CinemaRoomDetail({ roomId, onNavigate }: CinemaRoomDetailProps) {
  const [room, setRoom] = useState<CinemaRoom | null>(null)
  const [pendingSeats, setPendingSeats] = useState<Record<number, SeatDraft>>({})
  const [selectedSeatIds, setSelectedSeatIds] = useState<number[]>([])
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
          setSelectedSeatIds([])
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

  const selectedSeats = useMemo(() => {
    const selectedSeatIdSet = new Set(selectedSeatIds)
    return (room?.seats || []).filter((seat) => selectedSeatIdSet.has(seat.id))
  }, [room?.seats, selectedSeatIds])

  const selectedSeat = selectedSeats.length === 1 ? selectedSeats[0] : null
  const selectedSeatNames = selectedSeats.map((seat) => seat.seatName).join(", ")
  const selectedSeatType = getBulkFieldValue(selectedSeats, pendingSeats, "seatType")
  const selectedSeatStatus = getBulkFieldValue(selectedSeats, pendingSeats, "status")

  const seatStats = useMemo(() => {
    const seats = room?.seats || []
    return {
      actualTotal: seats.length,
      normal: seats.filter((seat) => getSeatDraft(seat, pendingSeats).seatType === "NORMAL").length,
      vip: seats.filter((seat) => getSeatDraft(seat, pendingSeats).seatType === "VIP").length,
      inactive: seats.filter((seat) => getSeatDraft(seat, pendingSeats).status !== "ACTIVE").length,
    }
  }, [pendingSeats, room])

  function toggleSelectedSeat(seat: Seat) {
    if (saving) return
    setSelectedSeatIds((current) =>
      current.includes(seat.id) ? current.filter((seatId) => seatId !== seat.id) : [...current, seat.id],
    )
  }

  function updateSelectedSeats(field: keyof SeatDraft, value: string) {
    if (selectedSeats.length === 0 || saving || value === "MIXED") return

    setPendingSeats((current) => {
      const updated = { ...current }
      selectedSeats.forEach((seat) => {
        const currentDraft = current[seat.id]
        const nextDraft = {
          seatType: field === "seatType" ? value : currentDraft?.seatType || seat.seatType || "NORMAL",
          status: field === "status" ? value : currentDraft?.status || seat.status || "ACTIVE",
        }

        const unchanged = nextDraft.seatType === seat.seatType && nextDraft.status === seat.status
        if (unchanged) {
          delete updated[seat.id]
        } else {
          updated[seat.id] = nextDraft
        }
      })
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
      setSelectedSeatIds([])
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
          <h1>Chi tiết phòng chiếu</h1>
          <p>Chọn ghế để thay đổi loại ghế hoặc trạng thái, sau đó lưu một lần.</p>
        </div>
        <div className="room-header-actions">
          <button
            type="button"
            className="secondary-button room-back-button"
            aria-label="Quay lại danh sách phòng chiếu"
            onClick={handleBack}
          >
            Quay lại
          </button>
          {room && (
            <button
              type="button"
              className="secondary-button room-edit-header-button"
              onClick={() => onNavigate(`/admin/cinema-rooms/${room.id}/edit`)}
            >
              Chỉnh sửa
            </button>
          )}
        </div>
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
              <h2>Sơ đồ ghế</h2>
            </div>
          </section>

          <div className="seat-editor-layout room-detail-seat-layout">
            <div className="room-detail-map-column">
              <SeatMap
                seats={room.seats || []}
                pendingSeats={pendingSeats}
                selectedSeatIds={selectedSeatIds}
                onSelectSeat={toggleSelectedSeat}
              />
            </div>

            <aside className="seat-editor-panel room-detail-info-panel" aria-label="Thông tin ghế">
              {selectedSeats.length > 0 ? (
                <>
                  <div>
                    <strong>{selectedSeats.length === 1 && selectedSeat ? selectedSeat.seatName : `${selectedSeats.length} ghế`}</strong>
                    <small>
                      {selectedSeats.length === 1 && selectedSeat
                        ? `Hàng ${selectedSeat.rowLabel}, số ${selectedSeat.seatNumber}`
                        : selectedSeatNames}
                    </small>
                  </div>

                  <div className="room-seat-info-list">
                    <span>Loại ghế</span>
                    <strong>{selectedSeatType === "MIXED" ? "Nhiều giá trị" : SEAT_TYPE_LABELS[selectedSeatType] || selectedSeatType}</strong>
                  </div>

                  <label className="room-form-field">
                    <span>Đổi loại ghế</span>
                    <select
                      value={selectedSeatType}
                      disabled={saving}
                      onChange={(event) => updateSelectedSeats("seatType", event.target.value)}
                    >
                      {selectedSeatType === "MIXED" && <option value="MIXED">Nhiều giá trị</option>}
                      <option value="NORMAL">Ghế thường</option>
                      <option value="VIP">Ghế VIP</option>
                    </select>
                  </label>

                  <div className="room-seat-info-list">
                    <span>Trạng thái ghế</span>
                    <strong>
                      {selectedSeatStatus === "MIXED"
                        ? "Nhiều giá trị"
                        : SEAT_STATUS_LABELS[selectedSeatStatus] || selectedSeatStatus}
                    </strong>
                  </div>

                  <label className="room-form-field">
                    <span>Đổi trạng thái</span>
                    <select
                      value={selectedSeatStatus}
                      disabled={saving}
                      onChange={(event) => updateSelectedSeats("status", event.target.value)}
                    >
                      {selectedSeatStatus === "MIXED" && <option value="MIXED">Nhiều giá trị</option>}
                      <option value="ACTIVE">Hoạt động</option>
                      <option value="INACTIVE">Ngừng hoạt động</option>
                    </select>
                  </label>

                  <button
                    type="button"
                    className="secondary-button seat-clear-selection-button"
                    disabled={saving}
                    onClick={() => setSelectedSeatIds([])}
                  >
                    Bỏ chọn
                  </button>
                </>
              ) : (
                <div className="seat-editor-empty">
                  <span>Chọn một hoặc nhiều ghế trên sơ đồ để xem thông tin chi tiết.</span>
                </div>
              )}
            </aside>
            <section className="seat-stat-grid room-detail-seat-stats" aria-label="Thống kê ghế">
              <div>
                <strong>{seatStats.actualTotal}</strong>
                <span>Tổng số ghế</span>
              </div>
              <div>
                <strong>{seatStats.normal}</strong>
                <span>Ghế thường</span>
              </div>
              <div>
                <strong>{seatStats.vip}</strong>
                <span>Ghế VIP</span>
              </div>
              <div>
                <strong>{seatStats.inactive}</strong>
                <span>Ghế ngừng hoạt động</span>
              </div>
            </section>
          </div>

          <div className="room-action-bar">
            <button type="button" className="secondary-button" disabled={!hasChanges || saving} onClick={() => setPendingSeats({})}>
              Hủy thay đổi
            </button>
            <button type="button" className="primary-button" disabled={!hasChanges || saving} onClick={handleSave}>
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
          size="sm"
          closeOnOverlay
          onClose={() => setShowLeaveModal(false)}
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
