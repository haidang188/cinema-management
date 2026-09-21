import { useState, type FormEvent } from "react"
import AppModal from "../../../component/common/AppModal"
import { createRoom } from "../../../service/cinema-room/cinemaRoomService"
import type { CinemaRoomPayload, NavigateHandler } from "../../../types/admin"

interface CinemaRoomCreateProps {
  onNavigate: NavigateHandler
}

const ROOM_TYPES = ["2D", "3D", "IMAX", "VIP"]
const STATUSES = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

function CinemaRoomCreate({ onNavigate }: CinemaRoomCreateProps) {
  const [formValues, setFormValues] = useState({
    name: "",
    roomType: "2D",
    rows: "8",
    seatsPerRow: "12",
    status: "ACTIVE",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const totalSeats = Number(formValues.rows || 0) * Number(formValues.seatsPerRow || 0)

  function updateField(name: keyof typeof formValues, value: string) {
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  function validatePayload(): CinemaRoomPayload | null {
    const name = formValues.name.trim()
    const rows = Number(formValues.rows)
    const seatsPerRow = Number(formValues.seatsPerRow)

    if (!name) {
      setError("Vui lòng nhập tên phòng chiếu.")
      return null
    }
    if (!Number.isInteger(rows) || rows < 1 || rows > 26) {
      setError("Số hàng phải từ 1 đến 26.")
      return null
    }
    if (!Number.isInteger(seatsPerRow) || seatsPerRow < 1 || seatsPerRow > 30) {
      setError("Số ghế mỗi hàng phải từ 1 đến 30.")
      return null
    }

    return {
      name,
      roomType: formValues.roomType,
      rows,
      seatsPerRow,
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
      await createRoom(payload)
      setShowSuccessModal(true)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể thêm phòng chiếu. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app-shell room-admin-page room-form-page">
      <header className="room-page-header">
        <div>
          <p className="room-page-eyebrow">Quản lý phòng chiếu</p>
          <h1>Thêm phòng chiếu</h1>
          <p>Tạo phòng mới và sinh sơ đồ ghế ban đầu theo số hàng, số ghế mỗi hàng.</p>
        </div>
        <button type="button" className="secondary-button room-back-button" onClick={() => onNavigate("/admin/cinema-rooms")}>
          Quay lại
        </button>
      </header>

      {error && <div className="room-alert room-alert-error">{error}</div>}

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
        </div>

        <div className="room-form-preview">
          <span>Tổng ghế sẽ tạo</span>
          <strong>{Number.isFinite(totalSeats) ? totalSeats : 0}</strong>
        </div>

        <div className="room-action-bar">
          <button type="button" className="secondary-button" disabled={saving} onClick={() => onNavigate("/admin/cinema-rooms")}>
            Hủy
          </button>
          <button type="submit" className="primary-button" disabled={saving}>
            {saving ? "Đang thêm..." : "Thêm phòng chiếu"}
          </button>
        </div>
      </form>

      {showSuccessModal && (
        <AppModal
          title="Thêm phòng chiếu thành công"
          message="Phòng chiếu mới đã được tạo cùng sơ đồ ghế ban đầu."
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

export default CinemaRoomCreate
