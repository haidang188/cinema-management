import { useEffect, useState } from "react"
import AppModal from "../../../component/common/AppModal"
import { getRoomDetail, updateRoom } from "../../../service/cinema-room/cinemaRoomService"
import type { CinemaRoom, CinemaRoomPayload, NavigateHandler } from "../../../types/admin"
import CinemaRoomForm from "./CinemaRoomForm"

interface CinemaRoomEditProps {
  roomId: string
  onNavigate: NavigateHandler
}

function CinemaRoomEdit({ roomId, onNavigate }: CinemaRoomEditProps) {
  const [room, setRoom] = useState<CinemaRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError("")

    getRoomDetail(roomId)
      .then((data) => {
        if (!ignore) setRoom(data)
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

  async function handleSubmit(payload: CinemaRoomPayload) {
    setSaving(true)
    try {
      await updateRoom(roomId, payload)
      setShowSuccessModal(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app-shell room-admin-page room-form-page room-designer-page">
      <header className="room-page-header designer-page-header">
        <div>
          <p className="room-page-eyebrow">Quản lý phòng chiếu</p>
          <h1>Chỉnh sửa phòng chiếu</h1>
          <p>Thiết lập thông tin phòng và sơ đồ ghế.</p>
        </div>
      </header>

      {loading && <div className="room-alert">Đang tải thông tin phòng chiếu...</div>}
      {error && <div className="room-alert room-alert-error">{error}</div>}
      {!loading && !error && room && (
        <CinemaRoomForm
          mode="edit"
          initialRoom={room}
          saving={saving}
          onCancel={() => onNavigate("/admin/cinema-rooms")}
          onSubmit={handleSubmit}
        />
      )}

      {showSuccessModal && (
        <AppModal
          title="Cập nhật phòng chiếu thành công"
          message="Thông tin phòng chiếu và sơ đồ ghế đã được lưu."
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
