import { useEffect, useState, type FormEvent } from "react"
import AppModal from "../../../component/common/AppModal"
import { getRoomDetail, updateRoom } from "../../../service/cinema-room/cinemaRoomService"
import type { CinemaRoomUpdatePayload, NavigateHandler } from "../../../types/admin"

interface CinemaRoomEditProps {
  roomId: string
  onNavigate: NavigateHandler
}

const ROOM_TYPES = ["2D", "3D", "IMAX", "VIP"]
const STATUSES = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

function CinemaRoomEdit({ roomId, onNavigate }: CinemaRoomEditProps) {
  const [formValues, setFormValues] = useState({
    name: "",
    roomType: "2D",
    status: "ACTIVE",
  })
  const [totalSeats, setTotalSeats] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError("")

    getRoomDetail(roomId)
      .then((room) => {
        if (ignore) return
        setFormValues({
          name: room.name || "",
          roomType: room.roomType || "2D",
          status: room.status || "ACTIVE",
        })
        setTotalSeats(room.totalSeats || room.seats?.length || 0)
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

  function updateField(name: keyof typeof formValues, value: string) {
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  function validatePayload(): CinemaRoomUpdatePayload | null {
    const name = formValues.name.trim()

    if (!name) {
      setError("Vui lòng nhập tên phòng chiếu.")
      return null
    }

    return {
      name,
      roomType: formValues.roomType,
      status: formValues.status,
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const payload = validatePayload()
    if (!payload) return

    setSaving(true)
    setError("")
    try {
      await updateRoom(roomId, payload)
      setShowSuccessModal(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể cập nhật phòng chiếu. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app-shell room-admin-page room-form-page">
      <header className="room-page-header">
        <div>
          <p className="room-page-eyebrow">Quản lý phòng chiếu</p>
          <h1>Sửa phòng chiếu</h1>
          <p>Cập nhật tên phòng, loại phòng và trạng thái hoạt động.</p>
        </div>
        <button type="button" className="secondary-button room-back-button" onClick={() => onNavigate("/admin/cinema-rooms")}>
          Quay lại
        </button>
      </header>

      {loading && <div className="room-alert">Đang tải thông tin phòng chiếu...</div>}
      {error && <div className="room-alert room-alert-error">{error}</div>}

      {!loading && (
        <form className="room-form-card" onSubmit={handleSubmit}>
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
                {STATUSES.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="room-form-preview">
            <span>Tổng ghế hiện có</span>
            <strong>{totalSeats}</strong>
          </div>

          <div className="room-action-bar">
            <button type="button" className="secondary-button" disabled={saving} onClick={() => onNavigate("/admin/cinema-rooms")}>
              Hủy
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      )}

      {showSuccessModal && (
        <AppModal
          title="Cập nhật phòng chiếu thành công"
          message="Thông tin phòng chiếu đã được lưu."
          variant="success"
          actions={[
            {
              label: "OK",
              onClick: () => onNavigate("/admin/cinema-rooms"),
            },
          ]}
        />
      )}
    </main>
  )
}

export default CinemaRoomEdit
