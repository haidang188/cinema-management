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
import { formatVnd } from "../../utils/format"
import CinemaSeatMap from "../../component/seat-map/CinemaSeatMap"
import { seatKind, seatStateOf } from "../../component/seat-map/seatMapUtils"
import BookingStepper from "./BookingStepper"
import "./booking-flow.css"

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

// Khớp booking.online-max-seats ở backend; nhóm đông hơn mua tại quầy (đơn đoàn).
const ONLINE_MAX_SEATS = 8

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
  const [isHolding, setIsHolding] = useState(false)
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

    if (nextIds.length > ONLINE_MAX_SEATS) {
      setError(`Mỗi lượt đặt online được chọn tối đa ${ONLINE_MAX_SEATS} ghế. Đặt nhóm đông hơn vui lòng liên hệ quầy vé.`)
      return
    }

    // Ở bước chọn ghế chỉ đánh dấu trên giao diện. Ghế chỉ được giữ trên
    // server khi khách bấm Tiếp tục để sang bước xác nhận.
    if (!holdToken) {
      selectedIdsRef.current = nextIds
      setSelectedIds(nextIds)
      setError("")
      return
    }

    updatingRef.current = true
    const previousIds = selectedIds
    selectedIdsRef.current = nextIds
    setSelectedIds(nextIds)
    setError("")
    try {
      const hold = await updateSeatHold(holdToken, currentUser.userId, nextIds)

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

  async function continueBooking() {
    if (updatingRef.current || isHolding || selectedIds.length === 0) return
    const leavesSingleGap = Object.values(rows).some(rowSeats => rowSeats.some((seat, index) => {
      if (index === 0 || index === rowSeats.length - 1 || selectedIds.includes(seat.id) || seat.status !== "AVAILABLE") return false
      const left = rowSeats[index - 1]
      const right = rowSeats[index + 1]
      const consecutive = left.seatNumber === seat.seatNumber - 1 && right.seatNumber === seat.seatNumber + 1
      const leftBlocked = selectedIds.includes(left.id) || left.status !== "AVAILABLE"
      const rightBlocked = selectedIds.includes(right.id) || right.status !== "AVAILABLE"
      return consecutive && leftBlocked && rightBlocked
    }))
    if (leavesSingleGap) {
      setError("Không được để trống một ghế ở giữa các ghế đã chọn hoặc đã bán.")
      return
    }
    if (holdToken) {
      navigate("/booking/confirm")
      return
    }

    setIsHolding(true)
    setError("")
    try {
      const hold = await createSeatHold(currentUser.userId, showtimeId, selectedIds)
      if (hold.status !== "ACTIVE") throw new Error("Không thể giữ các ghế đã chọn")
      setHoldToken(hold.holdToken)
      setExpiresAt(hold.expiresAt)
      sessionStorage.setItem(
        BOOKING_DRAFT_KEY,
        JSON.stringify({ userId: currentUser.userId, showtimeId, holdToken: hold.holdToken, expiresAt: hold.expiresAt }),
      )
      navigate("/booking/confirm")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Ghế vừa được khách khác giữ, vui lòng chọn lại")
      getShowtimeSeats(showtimeId).then(setSeats).catch(() => undefined)
    } finally {
      setIsHolding(false)
    }
  }

  if (isLoading) {
    return (
      <section className="bf-page">
        <BookingStepper current={1} />
        <div className="bf-state"><span className="bf-spinner" aria-hidden="true" />Đang tải sơ đồ ghế…</div>
      </section>
    )
  }
  if (!showtime) {
    return (
      <section className="bf-page">
        <BookingStepper current={1} />
        <div className="bf-state">
          <p>{error || "Không tìm thấy suất chiếu"}</p>
          <button type="button" className="bf-btn bf-btn-ghost" onClick={() => navigate(-1)}>Quay lại</button>
        </div>
      </section>
    )
  }

  return (
    <section className="bf-page">
      <BookingStepper
        current={1}
        showtime={showtime}
        expiresAt={expiresAt}
        secondsLeft={secondsLeft}
      />

      <div className="cs-seats-page cinema-seat-map booking-seat-step">
        <div className="cs-seats-body">
          <CinemaSeatMap
            bare
            seats={seats.map((seat) => ({
              id: seat.id,
              rowLabel: seat.rowLabel,
              seatNumber: seat.seatNumber,
              seatType: seat.seatType,
              state: seatStateOf(seat.status),
            }))}
            selectedIds={selectedIds}
            onSeatClick={(seat) => {
              const original = seats.find((item) => item.id === seat.id)
              if (original) void toggleSeat(original)
            }}
            disabled={isHolding}
            subtitle={`${showtime.roomName} · ${showtime.format || "2D"} · tối đa ${ONLINE_MAX_SEATS} ghế mỗi lần đặt`}
            legend={{ selected: "Bạn đang chọn", held: "Người khác giữ" }}
          >
            {error && (
              <div className="cs-notice" role="alert">
                <span>{error}</span>
                <button type="button" onClick={() => setError("")} aria-label="Đóng">
                  ×
                </button>
              </div>
            )}
          </CinemaSeatMap>

          <aside className="cs-summary" aria-label="Thông tin đơn">
            <div className="cs-summary-head">
              <h2>Đơn đặt vé</h2>
              <span className="cs-summary-count">
                {selectedSeats.length}/{ONLINE_MAX_SEATS} ghế
              </span>
            </div>

            <div className="booking-seat-movie">
              {showtime.posterUrl && <img src={showtime.posterUrl} alt={showtime.movieTitle} />}
              <div>
                <strong>{showtime.movieTitle}</strong>
                <span>{formatDateTime(showtime.startTime)}</span>
                <span>{showtime.roomName} · {showtime.format || "2D"}</span>
              </div>
            </div>

            <div className="cs-summary-seats">
              <div className="cs-summary-label">
                <span>Ghế đã chọn</span>
                {selectedSeats.length > 0 && !holdToken && (
                  <button
                    type="button"
                    className="cs-link"
                    onClick={() => {
                      selectedIdsRef.current = []
                      setSelectedIds([])
                    }}
                  >
                    Bỏ chọn tất cả
                  </button>
                )}
              </div>

              {selectedSeats.length === 0 ? (
                <p className="cs-summary-empty">
                  Bấm vào ghế trống để chọn. Ghế được giữ {holdToken ? "" : "khi bạn bấm Tiếp tục, "}
                  trong 10 phút để thanh toán.
                </p>
              ) : (
                <ul className="cs-seat-chips">
                  {selectedSeats.map((seat) => {
                    const kind = seatKind(seat.seatType)
                    return (
                      <li key={seat.id} className={`cs-seat-chip is-${kind}`}>
                        <b>{seat.rowLabel}{seat.seatNumber}</b>
                        <small>{formatVnd(seat.price)}</small>
                        <button
                          type="button"
                          onClick={() => void toggleSeat(seat)}
                          aria-label={`Bỏ chọn ghế ${seat.rowLabel}${seat.seatNumber}`}
                        >
                          ×
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            <div className="cs-summary-price">
              <div>
                <span>Tiền vé</span>
                <strong>{formatVnd(selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0))}</strong>
              </div>
              <div className="cs-summary-total">
                <span>Tổng cộng</span>
                <strong>{formatVnd(selectedSeats.reduce((sum, seat) => sum + (seat.price || 0), 0))}</strong>
              </div>
            </div>

            <button
              type="button"
              className="cs-btn cs-btn-primary cs-summary-cta"
              disabled={selectedIds.length === 0 || isHolding}
              onClick={continueBooking}
            >
              {selectedIds.length === 0
                ? "Chọn ít nhất 1 ghế"
                : isHolding
                  ? "Đang giữ ghế…"
                  : `Tiếp tục · ${selectedIds.length} ghế`}
              <span aria-hidden="true">→</span>
            </button>
            <small className="booking-seat-note">
              Khuyến mãi được áp dụng ở bước xác nhận. Tối đa {ONLINE_MAX_SEATS} ghế mỗi lần đặt.
            </small>
          </aside>
        </div>
      </div>
    </section>
  )
}

export default BookingSeatsPage
