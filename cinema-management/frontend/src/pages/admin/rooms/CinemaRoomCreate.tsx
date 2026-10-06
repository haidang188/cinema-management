import { useState } from "react"
import AppModal from "../../../component/common/AppModal"
import { createRoom } from "../../../service/cinema-room/cinemaRoomService"
import type { CinemaRoomPayload, NavigateHandler } from "../../../types/admin"
import CinemaRoomForm from "./CinemaRoomForm"

interface CinemaRoomCreateProps {
  onNavigate: NavigateHandler
}

function CinemaRoomCreate({ onNavigate }: CinemaRoomCreateProps) {
  const [saving, setSaving] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  async function handleSubmit(payload: CinemaRoomPayload) {
    setSaving(true)
    try {
      await createRoom(payload)
      setShowSuccessModal(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="app-shell room-admin-page room-form-page room-designer-page">
      <header className="room-page-header designer-page-header">
        <div>
          <h1>Thêm phòng chiếu</h1>
          <p>Thiết lập thông tin phòng và sơ đồ ghế.</p>
        </div>
      </header>

      <CinemaRoomForm mode="create" saving={saving} onCancel={() => onNavigate("/admin/cinema-rooms")} onSubmit={handleSubmit} />

      {showSuccessModal && (
        <AppModal
          title="Thêm phòng chiếu thành công"
          message="Phòng chiếu mới đã được tạo cùng sơ đồ ghế đã thiết kế."
          variant="success"
          actions={[
            {
              label: "Đóng",
              onClick: () => onNavigate("/admin/cinema-rooms"),
            },
          ]}
        />
      )}
    </main>
  )
}

export default CinemaRoomCreate
