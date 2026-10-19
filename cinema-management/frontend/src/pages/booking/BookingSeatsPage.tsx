import { Armchair, CalendarDays, Clock3, MapPin, Monitor, Ticket } from "lucide-react"
import { useEffect, useMemo, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { getShowtimeById } from "../../service/showtime/showtimeService"
import {
  createSeatHold,
  getSeatHold,
  getShowtimeSeats,
  updateSeatHold,
} from "../../service/booking/seatHoldService"
import { subscribeToSeatStatus } from "../../service/booking/bookingSocketService"
import type { AuthResponse } from "../../types/auth"
import type { ShowtimeSeatData } from "../../types/booking"
import type { ShowtimeData } from "../../types/showtime/showtime"
import "./booking.css"

export const BOOKING_DRAFT_KEY = "cinema.bookingDraft"

interface BookingSeatsPageProps {
  currentUser: AuthResponse
}

interface BookingDraft {
  userId: number
  showtimeId: number
  holdToken: string
  expiresAt: string
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

function haveSameSeatIds(left: number[], right: number[]) {
  if (left.length !== right.length) return false
  const rightIds = new Set(right)
  return left.every((id) => rightIds.has(id))
}

function BookingSeatsPage({ currentUser }: BookingSeatsPageProps) {
  const { showtimeId: rawShowtimeId } = useParams()
  const showtimeId = Number(rawShowtimeId)
  const navigate = useNavigate()
  const [showtime, setShowtime] = useState<ShowtimeData | null>(null)
  const [seats, setSeats] = useState<ShowtimeSeatData[]>([])
  const [selectedIds, setSelectedIds] = useState<number[]>([])
  const [holdToken, setHoldToken] = useState<string | null>(null)
  const [expiresAt, setExpiresAt] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const selectedIdsRef = useRef<number[]>([])
  const updatingRef = useRef(false)

  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])

  useEffect(() => {
    if (!Number.isFinite(showtimeId)) return

    Promise.all([getShowtimeById(showtimeId), getShowtimeSeats(showtimeId)])
      .then(async ([showtimeData, seatData]) => {
        setShowtime(showtimeData)
        setSeats(seatData)

        const rawDraft = sessionStorage.getItem(BOOKING_DRAFT_KEY)
        if (!rawDraft) return
        const draft = JSON.parse(rawDraft) as BookingDraft
        if (draft.userId !== currentUser.userId || draft.showtimeId !== showtimeId) return

        try {
          const activeHold = await getSeatHold(draft.holdToken, currentUser.userId)
          if (activeHold.status === "ACTIVE") {
            setHoldToken(activeHold.holdToken)
            setExpiresAt(activeHold.expiresAt)
            setSelectedIds(activeHold.showtimeSeatIds)
          }
        } catch {
          sessionStorage.removeItem(BOOKING_DRAFT_KEY)
        }
      })
      .catch((requestError: Error) => setError(requestError.message || "Không thể tải sơ đồ ghế"))
      .finally(() => setIsLoading(false))
  }, [currentUser.userId, showtimeId])

  useEffect(() => {
    if (!Number.isFinite(showtimeId)) return
    return subscribeToSeatStatus(showtimeId, (event) => {
      if (!Array.isArray(event.showtimeSeatIds)) return
      setSeats((currentSeats) =>
        currentSeats.map((seat) => {
          if (!event.showtimeSeatIds.includes(seat.id)) return seat
          if (selectedIdsRef.current.includes(seat.id) && event.type === "SEATS_HELD") return seat
          const status = event.type === "SEATS_RELEASED" ? "AVAILABLE" : event.type === "SEATS_SOLD" ? "SOLD" : "HELD"
          return { ...seat, status }
        }),
      )
    })
  }, [showtimeId])

  useEffect(() => {
    if (!expiresAt) {
      setSecondsLeft(0)
      return
    }

    const updateCountdown = () => {
      const next = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000))
      setSecondsLeft(next)
      if (next === 0) {
        setExpiresAt(null)
        setSelectedIds([])
        setHoldToken(null)
        sessionStorage.removeItem(BOOKING_DRAFT_KEY)
        getShowtimeSeats(showtimeId).then(setSeats).catch(() => undefined)
      }
    }
    updateCountdown()
    const timer = window.setInterval(updateCountdown, 1000)
    return () => window.clearInterval(timer)
  }, [expiresAt, showtimeId])

  const rows = useMemo(() => {
    return seats.reduce<Record<string, ShowtimeSeatData[]>>((result, seat) => {
      result[seat.rowLabel] = result[seat.rowLabel] || []
      result[seat.rowLabel].push(seat)
      result[seat.rowLabel].sort((left, right) => left.seatNumber - right.seatNumber)
      return result
    }, {})
  }, [seats])

  const selectedSeats = seats.filter((seat) => selectedIds.includes(seat.id))

  async function toggleSeat(seat: ShowtimeSeatData) {
    if (updatingRef.current || seat.status === "SOLD" || (seat.status === "HELD" && !selectedIds.includes(seat.id))) return

    const nextIds = selectedIds.includes(seat.id)
      ? selectedIds.filter((id) => id !== seat.id)
      : [...selectedIds, seat.id]

    updatingRef.current = true
    const previousIds = selectedIds
    selectedIdsRef.current = nextIds
    setSelectedIds(nextIds)
    setError("")
    try {
      const hold = holdToken
        ? await updateSeatHold(holdToken, currentUser.userId, nextIds)
        : await createSeatHold(currentUser.userId, showtimeId, nextIds)

      // Đã cập nhật lạc quan ở trên. Chỉ sửa lại khi server thực sự
      // trả về một tập ghế khác để tránh render/chớp sơ đồ lần thứ hai.
      if (!haveSameSeatIds(nextIds, hold.showtimeSeatIds)) {
        selectedIdsRef.current = hold.showtimeSeatIds
        setSelectedIds(hold.showtimeSeatIds)
      }
      if (hold.status === "ACTIVE") {
        setHoldToken(hold.holdToken)
        setExpiresAt(hold.expiresAt)
        sessionStorage.setItem(
          BOOKING_DRAFT_KEY,
          JSON.stringify({ userId: currentUser.userId, showtimeId, holdToken: hold.holdToken, expiresAt: hold.expiresAt }),
        )
      } else {
        setHoldToken(null)
        setExpiresAt(null)
        sessionStorage.removeItem(BOOKING_DRAFT_KEY)
      }
    } catch (requestError) {
      selectedIdsRef.current = previousIds
      setSelectedIds(previousIds)
      setError(requestError instanceof Error ? requestError.message : "Không thể giữ ghế")
      getShowtimeSeats(showtimeId).then(setSeats).catch(() => undefined)
    } finally {
      updatingRef.current = false
    }
  }

  function continueBooking() {
    if (updatingRef.current || !holdToken || selectedIds.length === 0) return
    navigate("/booking/confirm")
  }

  if (isLoading) return <section className="booking-page booking-state">Đang tải sơ đồ ghế...</section>
  if (!showtime) return <section className="booking-page booking-state">{error || "Không tìm thấy suất chiếu"}</section>

  return (
    <section className="booking-page">
      <div className="booking-steps" aria-label="Tiến trình đặt vé">
        <span className="is-active">1. Chọn ghế</span><i /><span>2. Xác nhận</span><i /><span>3. Hoàn tất</span>
      </div>

      <div className="booking-showtime-strip" aria-label="Thông tin suất chiếu đã chọn">
        <span className="booking-showtime-movie"><Ticket size={15} />{showtime.movieTitle}</span>
        <span><CalendarDays size={15} />{formatDate(showtime.startTime)}</span>
        <span><Clock3 size={15} />{formatTime(showtime.startTime)}</span>
        <span><MapPin size={15} />{showtime.roomName} · {showtime.format || "2D"}</span>
        <span
          className={`booking-showtime-timer ${expiresAt ? "" : "is-placeholder"}`}
          aria-hidden={!expiresAt}
        >
          Giữ ghế <strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</strong>
        </span>
      </div>

      <div className="booking-layout">
        <div className="booking-main-panel">
          <div className="screen-indicator"><Monitor size={18} /><span>Màn hình</span></div>
          <div className="seat-map" aria-label="Sơ đồ ghế">
            {Object.entries(rows).sort(([a], [b]) => b.localeCompare(a)).map(([rowLabel, rowSeats]) => (
              <div className="seat-row" key={rowLabel}>
                <strong>{rowLabel}</strong>
                <div>
                  {rowSeats.map((seat) => {
                    const selected = selectedIds.includes(seat.id)
                    return (
                      <button
                        key={seat.id}
                        type="button"
                        className={`seat seat--${seat.seatType.toLowerCase()} ${selected ? "is-selected" : ""}`}
                        disabled={seat.status === "SOLD" || (seat.status === "HELD" && !selected)}
                        aria-pressed={selected}
                        onClick={() => toggleSeat(seat)}
                        title={`${seat.rowLabel}${seat.seatNumber} - ${seat.seatType}`}
                      >
                        {seat.rowLabel}{seat.seatNumber}
                      </button>
                    )
                  })}
                </div>
                <strong>{rowLabel}</strong>
              </div>
            ))}
          </div>

          <div className="seat-legend">
            <span><i className="seat-swatch available" />Còn trống</span>
            <span><i className="seat-swatch vip" />VIP</span>
            <span><i className="seat-swatch selected" />Đang chọn</span>
            <span><i className="seat-swatch unavailable" />Đã giữ/đã bán</span>
          </div>
          {error && <p className="booking-error">{error}</p>}
        </div>

        <aside className="booking-summary-panel">
          <h2>Tóm Tắt Đơn Hàng</h2>
          <div className="booking-movie-mini">
            <img src={showtime.posterUrl} alt={showtime.movieTitle} />
            <div><strong>{showtime.movieTitle}</strong><span>{showtime.format || "2D"}</span><span>{showtime.roomName}</span></div>
          </div>
          <dl>
            <div><dt>Suất chiếu</dt><dd>{formatDateTime(showtime.startTime)}</dd></div>
            <div><dt>Ghế đã chọn</dt><dd>{selectedSeats.map((seat) => `${seat.rowLabel}${seat.seatNumber}`).join(", ") || "Chưa chọn"}</dd></div>
            <div><dt>Số lượng</dt><dd>{selectedIds.length} vé</dd></div>
          </dl>
          <div className="selected-seat-prices">{selectedSeats.map(seat => <div key={seat.id}><span><Ticket size={14} /> {seat.rowLabel}{seat.seatNumber} · {seat.seatType}</span><strong>{seat.price?.toLocaleString("vi-VN")} đ</strong></div>)}</div>
          <div className="booking-grand-total"><span>Tổng cộng</span><strong>{selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0).toLocaleString("vi-VN")} đ</strong></div>
          <button className="booking-primary" type="button" disabled={!holdToken || selectedIds.length === 0 || secondsLeft === 0} onClick={continueBooking}>
            Tiếp tục <Armchair size={18} />
          </button>
          <small className="booking-note">Không giới hạn số ghế trong một lần đặt</small>
        </aside>
      </div>
    </section>
  )
}

export default BookingSeatsPage
