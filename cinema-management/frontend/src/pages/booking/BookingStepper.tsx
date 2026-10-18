import { Clock3, Film } from "lucide-react"
import { formatDate, formatTime } from "../../utils/format"
import { formatCountdown } from "./bookingFlowUtils"
import "./booking-flow.css"

/*
 * Thanh tiến trình + thông tin suất chiếu dùng chung cho 3 bước đặt vé online
 * (Chọn ghế → Xác nhận → Hoàn tất). Cùng ngôn ngữ thiết kế với CounterSaleStepper.
 */

export type BookingStep = 1 | 2 | 3

export interface BookingStepperShowtime {
  movieTitle: string
  posterUrl?: string | null
  startTime: string
  roomName?: string | null
  format?: string | null
}

interface BookingStepperProps {
  current: BookingStep
  showtime?: BookingStepperShowtime | null
  /** Có giá trị khi đang giữ ghế; null/undefined = chưa giữ → ẩn đồng hồ. */
  expiresAt?: string | null
  secondsLeft?: number
}

const STEPS: { id: BookingStep; label: string }[] = [
  { id: 1, label: "Chọn ghế" },
  { id: 2, label: "Xác nhận" },
  { id: 3, label: "Hoàn tất" },
]

const WARNING_SECONDS = 120

function BookingStepper({ current, showtime, expiresAt, secondsLeft = 0 }: BookingStepperProps) {
  const showTimer = Boolean(expiresAt) && current < 3
  const warning = showTimer && secondsLeft <= WARNING_SECONDS

  return (
    <div className="bf-stepper" role="navigation" aria-label="Tiến trình đặt vé">
      <ol className="bf-steps">
        {STEPS.map((step, index) => {
          const done = step.id < current
          const active = step.id === current
          return (
            <li key={step.id} className={`bf-step${done ? " is-done" : ""}${active ? " is-active" : ""}`} aria-current={active ? "step" : undefined}>
              {index > 0 && <span className="bf-step-line" aria-hidden="true" />}
              <span className="bf-step-dot">{done ? "✓" : step.id}</span>
              <span className="bf-step-label">{step.label}</span>
            </li>
          )
        })}
      </ol>

      {showtime && (
        <div className="bf-stepper-info" aria-label="Thông tin suất chiếu">
          <span className="bf-stepper-thumb" aria-hidden="true">
            {showtime.posterUrl ? <img src={showtime.posterUrl} alt="" /> : <Film size={16} />}
          </span>
          <span className="bf-stepper-movie">
            <b title={showtime.movieTitle}>{showtime.movieTitle}</b>
            <small>
              {formatTime(showtime.startTime)} · {formatDate(showtime.startTime)}
              {showtime.roomName ? ` · ${showtime.roomName}` : ""}
              {` · ${showtime.format || "2D"}`}
            </small>
          </span>
          {showTimer && (
            <span className={`bf-timer${warning ? " is-warning" : ""}`} role="timer" title="Thời gian giữ ghế còn lại">
              <Clock3 size={14} aria-hidden="true" />
              <span>Giữ ghế</span>
              <b>{formatCountdown(secondsLeft)}</b>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

export default BookingStepper
