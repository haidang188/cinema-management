import { useEffect, useMemo, useState } from 'react'
import SeatMap from '../../../components/room/SeatMap.jsx'
import { getRoomDetail, updateSeatTypes } from '../../../services/cinemaRoomService.js'

const STATUS_LABELS = {
  ACTIVE: 'Hoạt động',
  INACTIVE: 'Ngừng hoạt động',
  MAINTENANCE: 'Bảo trì',
}

function CinemaRoomDetail({ roomId, onNavigate }) {
  const [room, setRoom] = useState(null)
  const [pendingSeatTypes, setPendingSeatTypes] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError('')

    getRoomDetail(roomId)
      .then((data) => {
        if (!ignore) {
          setRoom(data)
          setPendingSeatTypes({})
        }
      })
      .catch((requestError) => {
        if (!ignore) setError(requestError.message)
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [roomId])

  const hasChanges = Object.keys(pendingSeatTypes).length > 0

  const seatStats = useMemo(() => {
    const seats = room?.seats || []
    return {
      total: seats.length,
      normal: seats.filter((seat) => (pendingSeatTypes[seat.id] || seat.seatType) === 'NORMAL').length,
      vip: seats.filter((seat) => (pendingSeatTypes[seat.id] || seat.seatType) === 'VIP').length,
      inactive: seats.filter((seat) => seat.status !== 'ACTIVE').length,
    }
  }, [pendingSeatTypes, room])

  function handleToggleSeat(seat) {
    const currentType = pendingSeatTypes[seat.id] || seat.seatType
    const nextType = currentType === 'VIP' ? 'NORMAL' : 'VIP'

    setPendingSeatTypes((current) => {
      const updated = { ...current }
      if (nextType === seat.seatType) {
        delete updated[seat.id]
      } else {
        updated[seat.id] = nextType
      }
      return updated
    })
    setSuccess('')
  }

  async function handleSave() {
    const seats = Object.entries(pendingSeatTypes).map(([seatId, seatType]) => ({
      seatId: Number(seatId),
      seatType,
    }))

    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updatedRoom = await updateSeatTypes(roomId, seats)
      setRoom(updatedRoom)
      setPendingSeatTypes({})
      setSuccess('Lưu thay đổi ghế thành công')
    } catch (requestError) {
      setError(requestError.message)
    } finally {
      setSaving(false)
    }
  }

  function handleBack() {
    if (hasChanges && !window.confirm('Bạn có thay đổi chưa lưu. Quay lại danh sách?')) {
      return
    }
    onNavigate('/admin/cinema-rooms')
  }

  return (
    <main className="app-shell">
      <div className="admin-topbar">
        <div className="brand-mark">CB</div>
        <div>
          <strong>Cinema Booking System</strong>
          <span>Trình chỉnh sửa loại ghế</span>
        </div>
        <nav className="module-nav">
          <button type="button" onClick={() => onNavigate('/admin/movies')}>Phim</button>
          <button type="button" className="active" onClick={() => onNavigate('/admin/cinema-rooms')}>Phòng chiếu</button>
        </nav>
      </div>

      <header className="page-header">
        <div>
          <p className="eyebrow">Sprint 2</p>
          <h1>Chi tiết phòng chiếu</h1>
          <p className="page-subtitle">Chọn ghế để chuyển giữa ghế thường và ghế VIP, sau đó lưu một lần.</p>
        </div>
        <button type="button" className="secondary-button" onClick={handleBack}>Quay lại</button>
      </header>

      {loading && <div className="alert">Đang tải sơ đồ ghế...</div>}
      {error && <div className="alert error-alert">{error}</div>}
      {success && <div className="alert success-alert">{success}</div>}

      {!loading && !error && room && (
        <>
          <section className="room-detail-grid">
            <div className="summary-card">
              <span>Tên phòng</span>
              <strong>{room.name}</strong>
            </div>
            <div className="summary-card">
              <span>Loại phòng</span>
              <strong>{room.roomType || '-'}</strong>
            </div>
            <div className="summary-card summary-blue">
              <span>Tổng ghế</span>
              <strong>{room.totalSeats || seatStats.total}</strong>
            </div>
            <div className="summary-card summary-green">
              <span>Trạng thái</span>
              <strong className="status-text">{STATUS_LABELS[room.status] || room.status || '-'}</strong>
            </div>
          </section>

          <section className="seat-stats">
            <span>{seatStats.total} ghế</span>
            <span>{seatStats.normal} thường</span>
            <span>{seatStats.vip} VIP</span>
            <span>{seatStats.inactive} không hoạt động</span>
          </section>

          <SeatMap seats={room.seats || []} pendingSeatTypes={pendingSeatTypes} onToggleSeat={handleToggleSeat} />

          <div className="form-actions sticky-actions">
            <span className={hasChanges ? 'dirty-note active' : 'dirty-note'}>
              {hasChanges ? `${Object.keys(pendingSeatTypes).length} ghế chưa lưu` : 'Chưa có thay đổi'}
            </span>
            <button type="button" className="primary-button" disabled={!hasChanges || saving} onClick={handleSave}>
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </>
      )}
    </main>
  )
}

export default CinemaRoomDetail
