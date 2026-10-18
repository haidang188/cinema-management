import { Check, Clock3, Download, History, House, Lock, TicketCheck, X } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useRef, useState } from "react"
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom"
import { getBooking } from "../../service/booking/bookingService"
import type { AuthResponse } from "../../types/auth"
import type { BookingDetail } from "../../types/booking"
import { formatDate, formatDateTime, formatTime, formatVnd } from "../../utils/format"
import { downloadTicketQr } from "../../utils/ticketQr"
import { seatKind } from "../../component/seat-map/seatMapUtils"
import BookingStepper from "./BookingStepper"
import { paymentMethodLabel, paymentStatusLabel, seatTypeLabel } from "./bookingFlowUtils"
import "./booking-flow.css"

/** "Thứ hai, 19/10/2026" */
function formatShowDate(value: string) {
  const text = new Date(value).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
  return text.charAt(0).toUpperCase() + text.slice(1)
}

interface BookingResultPageProps { currentUser: AuthResponse }

type ResultState = "success" | "pending" | "failed"

function BookingResultPage({ currentUser }: BookingResultPageProps) {
  const { bookingCode: routeCode } = useParams()
  const [searchParams] = useSearchParams()
  const bookingCode = routeCode || searchParams.get("bookingCode") || ""
  const paymentResult = searchParams.get("payment")
  const navigate = useNavigate()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [showTickets, setShowTickets] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState("")
  const qrRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!bookingCode) {
      setError("Không tìm thấy mã đặt vé")
      return
    }
    sessionStorage.removeItem("cinema.bookingDraft")
    getBooking(bookingCode, currentUser.userId)
      .then(setBooking)
      .catch((requestError: Error) => setError(requestError.message || "Không thể tải thông tin đặt vé"))
  }, [bookingCode, currentUser.userId])

  if (!booking && !error) {
    return (
      <section className="bf-page">
        <BookingStepper current={3} />
        <div className="bf-state"><span className="bf-spinner" aria-hidden="true" />Đang tải kết quả giao dịch…</div>
      </section>
    )
  }
  if (!booking) {
    return (
      <section className="bf-page">
        <BookingStepper current={3} />
        <div className="bf-state">
          <p className="bf-error" role="alert">{error}</p>
          <button type="button" className="bf-btn bf-btn-ghost" onClick={() => navigate("/")}><House size={16} /> Về trang chủ</button>
        </div>
      </section>
    )
  }

  const paid = booking.bookingStatus === "CONFIRMED" && booking.paymentStatus === "PAID"
  const closed = ["CANCELLED", "EXPIRED"].includes(booking.bookingStatus)
    || ["FAILED", "CANCELLED", "EXPIRED"].includes(booking.paymentStatus)
  const state: ResultState = paid ? "success" : paymentResult === "failed" || closed ? "failed" : "pending"

  const banner = {
    success: {
      icon: <Check size={24} strokeWidth={3} />,
      title: "Đặt vé thành công",
      text: "Vé điện tử đã sẵn sàng. Vui lòng xuất trình mã QR tại cửa soát vé.",
    },
    pending: {
      icon: <Clock3 size={22} strokeWidth={2.6} />,
      title: "Đơn đang chờ thanh toán",
      text: booking.paymentDeadline
        ? `Vui lòng hoàn tất thanh toán trước ${formatTime(booking.paymentDeadline)} ngày ${formatDate(booking.paymentDeadline)}.`
        : "Vui lòng hoàn tất thanh toán để nhận vé điện tử.",
    },
    failed: {
      icon: <X size={24} strokeWidth={3} />,
      title: "Thanh toán chưa thành công",
      text: closed
        ? `Trạng thái đơn: ${paymentStatusLabel(booking.paymentStatus).toLowerCase()}. Bạn có thể chọn suất chiếu và đặt lại.`
        : "Giao dịch chưa được thanh toán. Bạn có thể thử lại hoặc chọn suất chiếu khác.",
    },
  }[state]

  const statusChip = state === "success" ? "bf-chip-green" : state === "pending" ? "bf-chip-amber" : "bf-chip-red"

  async function downloadQr() {
    const svg = qrRef.current?.querySelector("svg")
    if (!booking || !svg || downloading) return
    setDownloading(true)
    setDownloadError("")
    try {
      await downloadTicketQr(svg, {
        bookingCode: booking.bookingCode,
        movieTitle: booking.movieTitle,
        showtime: `${formatTime(booking.startTime)} · ${formatShowDate(booking.startTime)}`,
        room: booking.roomName,
        seats: booking.tickets.map((ticket) => ticket.seatName).join(", "),
      })
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : "Không thể tải mã QR")
    } finally {
      setDownloading(false)
    }
  }

  return (
    <section className="bf-page">
      <BookingStepper current={3} showtime={booking} />

      <div className={`bf-banner is-${state}`} role="status">
        <span className="bf-banner-icon" aria-hidden="true">{banner.icon}</span>
        <div className="bf-banner-text">
          <h1>{banner.title}</h1>
          <p>{banner.text}</p>
        </div>
        <div className="bf-code">
          <small>Mã đặt vé</small>
          <code>{booking.bookingCode}</code>
        </div>
      </div>

      <div className="bf-result-body">
        <div className="bf-result-main">
        <article className="bf-ticket" aria-label="Vé điện tử">
          <div className="bf-ticket-main">
            <div className="bf-ticket-brand">
              <span>Premiere Cinemas</span>
              <span className={`bf-chip ${statusChip}`}>{paid ? "Đã thanh toán" : paymentStatusLabel(booking.paymentStatus)}</span>
            </div>

            <div className="bf-ticket-movie">
              <div className="bf-poster">{booking.posterUrl && <img src={booking.posterUrl} alt={booking.movieTitle} />}</div>
              <div className="bf-movie-info">
                <span className="bf-eyebrow">{[booking.ageRating, booking.format || "2D"].filter(Boolean).join(" · ")}</span>
                <h2>{booking.movieTitle}</h2>
                <p className="bf-movie-time"><b>{formatTime(booking.startTime)}</b> · {formatShowDate(booking.startTime)}</p>
                <div className="bf-chips">
                  <span className="bf-chip bf-chip-red">{booking.roomName}</span>
                  {booking.roomType && <span className="bf-chip">{booking.roomType}</span>}
                </div>
              </div>
            </div>

            <div className="bf-ticket-seats">
              <div className="bf-card-head">
                <h2>Ghế đã đặt</h2>
                <span>{booking.tickets.length} ghế</span>
              </div>
              <ul className="bf-seat-list">
                {booking.tickets.map((ticket) => (
                  <li key={ticket.ticketCode || ticket.seatName} className={`bf-seat is-${seatKind(ticket.seatType)}`}>
                    <b>{ticket.seatName}</b>
                    <small>{seatTypeLabel(ticket.seatType)}</small>
                    <em>{formatVnd(ticket.price)}</em>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bf-ticket-stub">
            {paid ? (
              <>
                <div className="bf-qr" ref={qrRef}><QRCodeSVG value={booking.bookingQrToken} size={148} bgColor="#ffffff" fgColor="#0c1113" level="M" marginSize={1} /></div>
                <code>{booking.bookingCode}</code>
                <small>Quét mã tại cửa soát vé · {booking.tickets.length} vé</small>
              </>
            ) : (
              <>
                <div className="bf-qr-locked"><Lock size={20} />Chưa có mã QR</div>
                <code>{booking.bookingCode}</code>
                <small>{state === "pending" ? "Mã QR vào rạp hiển thị sau khi thanh toán thành công." : "Đơn chưa thanh toán nên không có vé vào rạp."}</small>
              </>
            )}
          </div>
        </article>

          <div className="bf-result-actions">
            {paid && (
              <button type="button" className="bf-btn bf-btn-primary bf-btn-lg" onClick={() => setShowTickets(true)}>
                <TicketCheck size={17} /> Xem vé điện tử
              </button>
            )}
            {paid && (
              <button type="button" className="bf-btn bf-btn-ghost" onClick={() => void downloadQr()} disabled={downloading}>
                <Download size={15} /> {downloading ? "Đang tạo ảnh…" : "Tải mã QR"}
              </button>
            )}
            <Link className="bf-btn bf-btn-ghost" to="/booking-history"><History size={15} /> Lịch sử đặt vé</Link>
            <Link className="bf-btn bf-btn-ghost" to="/"><House size={15} /> Về trang chủ</Link>
          </div>
          {downloadError && <p className="bf-error" role="alert">{downloadError}</p>}
        </div>

        <div className="bf-result-side">
          <article className="bf-card">
            <h2>Chi tiết thanh toán</h2>
            <dl className="bf-price">
              <div><dt>Phương thức</dt><dd>{paymentMethodLabel(booking.paymentMethod)}</dd></div>
              {paid || booking.paidAt
                ? <div><dt>Thời gian giao dịch</dt><dd>{booking.paidAt ? formatDateTime(booking.paidAt) : "—"}</dd></div>
                : <div><dt>Hạn thanh toán</dt><dd>{formatDateTime(booking.paymentDeadline)}</dd></div>}
              <div><dt>Tiền vé ({booking.tickets.length} vé)</dt><dd>{formatVnd(booking.subtotal)}</dd></div>
              <div><dt>Giảm giá</dt><dd className={booking.discountAmount > 0 ? "is-discount" : ""}>-{formatVnd(booking.discountAmount)}</dd></div>
            </dl>
            <div className="bf-total">
              <span>{paid ? "Tổng thanh toán" : state === "pending" ? "Số tiền cần thanh toán" : "Tổng tiền"}</span>
              <strong>{formatVnd(booking.totalAmount)}</strong>
            </div>
            {paid && (
              <div className="bf-points">
                <TicketCheck size={16} />
                <span>
                  Nhận <b>+{booking.pointsEarned} điểm</b>
                  {booking.memberPointBalance !== null && <> · Số dư <b>{booking.memberPointBalance} điểm</b></>}
                  {booking.membershipLevel && <> · Hạng {booking.membershipLevel}</>}
                </span>
              </div>
            )}
          </article>

          <article className="bf-card">
            <h2>Thông tin khách hàng</h2>
            <dl className="bf-customer-list">
              <div><dt>Họ và tên</dt><dd>{booking.customerName || "—"}</dd></div>
              <div><dt>Email</dt><dd>{booking.customerEmail || "—"}</dd></div>
              <div><dt>Số điện thoại</dt><dd>{booking.customerPhone || "—"}</dd></div>
            </dl>
          </article>

        </div>
      </div>

      {showTickets && (
        <div className="bf-modal-backdrop" role="presentation" onMouseDown={() => setShowTickets(false)}>
          <div className="bf-ticket-modal" role="dialog" aria-modal="true" aria-label="Vé điện tử" onMouseDown={(event) => event.stopPropagation()}>
            <header>
              <div><h2>Vé điện tử</h2><small>Mã đặt vé {booking.bookingCode} · {booking.tickets.length} vé</small></div>
              <div>
                <button type="button" className="bf-icon-btn" onClick={() => void downloadQr()} disabled={downloading}><Download size={13} /> Tải mã QR</button>
                <button type="button" className="bf-icon-btn" aria-label="Đóng" onClick={() => setShowTickets(false)}><X size={14} /></button>
              </div>
            </header>
            <div className="bf-eticket-list">
              {booking.tickets.map((ticket, index) => (
                <article className="bf-eticket" key={ticket.ticketCode || ticket.seatName}>
                  <div className="bf-eticket-head"><span>Premiere Cinemas</span><small>Vé {index + 1}/{booking.tickets.length}</small></div>
                  <div className="bf-eticket-movie">
                    <div className="bf-poster">{booking.posterUrl && <img src={booking.posterUrl} alt="" />}</div>
                    <div>
                      <span className="bf-eyebrow">{[booking.ageRating, booking.format || "2D"].filter(Boolean).join(" · ")}</span>
                      <h3>{booking.movieTitle}</h3>
                    </div>
                  </div>
                  <dl className="bf-info-grid">
                    <div><dt>Ngày</dt><dd>{formatDate(booking.startTime)}</dd></div>
                    <div><dt>Giờ chiếu</dt><dd>{formatTime(booking.startTime)}</dd></div>
                    <div><dt>Phòng chiếu</dt><dd>{booking.roomName}{booking.roomType ? ` · ${booking.roomType}` : ""}</dd></div>
                    <div><dt>Ghế</dt><dd className="is-seat">{ticket.seatName} · {seatTypeLabel(ticket.seatType)}</dd></div>
                  </dl>
                  <div className="bf-eticket-qr">
                    <div className="bf-qr"><QRCodeSVG value={booking.bookingQrToken} size={168} bgColor="#ffffff" fgColor="#111111" level="M" /></div>
                    <span>Mã đặt vé chung · dùng cho {booking.tickets.length} vé</span>
                  </div>
                  <div className="bf-eticket-total">
                    <span>Giá vé</span>
                    <code>{ticket.ticketCode || booking.bookingCode}</code>
                    <strong>{formatVnd(ticket.price)}</strong>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default BookingResultPage
