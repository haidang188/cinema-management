import { Check, Download, Printer, TicketCheck, X } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { getBooking } from "../../service/booking/bookingService"
import type { AuthResponse } from "../../types/auth"
import type { BookingDetail } from "../../types/booking"
import "./booking.css"

interface BookingResultPageProps { currentUser: AuthResponse }

function money(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
}

function dateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

function dateOnly(value: string) {
  return new Date(value).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
}

function timeOnly(value: string) {
  return new Date(value).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })
}

function BookingResultPage({ currentUser }: BookingResultPageProps) {
  const { bookingCode: routeCode } = useParams()
  const [searchParams] = useSearchParams()
  const bookingCode = routeCode || searchParams.get("bookingCode") || ""
  const paymentResult = searchParams.get("payment")
  const navigate = useNavigate()
  const [booking, setBooking] = useState<BookingDetail | null>(null)
  const [showTickets, setShowTickets] = useState(false)
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

  if (!booking && !error) return <section className="booking-page booking-state">Đang tải kết quả giao dịch...</section>
  if (!booking) return <section className="booking-page booking-state"><p>{error}</p><button onClick={() => navigate("/")}>Về trang chủ</button></section>

  const paid = booking.bookingStatus === "CONFIRMED" && booking.paymentStatus === "PAID"

  return (
    <section className="booking-page booking-result-page">
      <div className="booking-steps" aria-label="Tiến trình đặt vé">
        <span>1. Chọn ghế</span><i /><span>2. Xác nhận</span><i /><span className="is-active">3. Hoàn tất</span>
      </div>
      <div className={`transaction-banner ${paid ? "is-success" : "is-pending"}`}>
        <span>{paid ? <Check size={18} /> : "!"}</span>
        <strong>{paid ? "Giao dịch hoàn tất" : paymentResult === "failed" ? "Thanh toán chưa thành công" : "Đơn đang chờ thanh toán"}</strong>
        <small>Mã đặt vé: {booking.bookingCode}</small>
      </div>

      <div className="result-grid">
        <div className="result-column">
          <article className="result-card order-reference"><small>Mã đặt vé</small><strong>{booking.bookingCode}</strong><span className={paid ? 'payment-paid' : ''}>{paid ? 'Đã thanh toán' : booking.paymentStatus}</span><dl><div><dt>Phương thức thanh toán</dt><dd>{booking.paymentMethod}</dd></div><div><dt>Thời gian giao dịch</dt><dd>{booking.paidAt ? dateTime(booking.paidAt) : 'Chưa thanh toán'}</dd></div></dl></article>
          <article className="result-card result-movie-card">
            <img src={booking.posterUrl} alt={booking.movieTitle} />
            <div><span>{booking.ageRating} · {booking.format}</span><h1>{booking.movieTitle}</h1><p>{dateTime(booking.startTime)}</p><p>{booking.roomName} · {booking.roomType}</p></div>
          </article>
          <article className="result-card"><h2>Ghế đã đặt ({booking.tickets.length})</h2><div className="ticket-chip-list">{booking.tickets.map((ticket) => <span key={ticket.seatName}>{ticket.seatName} <small>{ticket.seatType}</small></span>)}</div></article>
          <article className="result-card payment-breakdown"><h2>Chi tiết thanh toán</h2><dl><div><dt>Tiền vé</dt><dd>{money(booking.subtotal)}</dd></div><div><dt>Giảm giá</dt><dd>-{money(booking.discountAmount)}</dd></div><div><dt>Tổng thanh toán</dt><dd>{money(booking.totalAmount)}</dd></div></dl></article>
        </div>

        <div className="result-column">
          <article className="result-card"><h2>Thông tin khách hàng</h2><dl><div><dt>Họ và tên</dt><dd>{booking.customerName}</dd></div><div><dt>Email</dt><dd>{booking.customerEmail}</dd></div><div><dt>Số điện thoại</dt><dd>{booking.customerPhone || "-"}</dd></div></dl></article>
          {paid && (
            <article className="result-card eticket-card">
              <div className="eticket-title"><div><strong>Vé Điện Tử Online (E-Ticket)</strong><span>PREMIERE CINEMAS</span></div><small>Quét tại cổng vào</small></div>
              <div className="eticket-horizontal">
                <div className="eticket-horizontal-info">
                  <span>Vé hợp nhất ({booking.tickets.length} ghế)</span>
                  <h3>{booking.movieTitle}</h3>
                  <p>{booking.format}</p>
                  <dl>
                    <div><dt>Ngày và suất</dt><dd>{dateOnly(booking.startTime)} · {timeOnly(booking.startTime)}</dd></div>
                    <div><dt>Phòng chiếu</dt><dd>{booking.roomName}</dd></div>
                    <div><dt>Ghế</dt><dd>{booking.tickets.map(ticket => `${ticket.seatName} (${ticket.seatType})`).join(", ")}</dd></div>
                  </dl>
                </div>
                <div className="eticket-horizontal-qr"><small>Khách quét mã QR tại cửa soát vé</small><QRCodeSVG value={booking.bookingQrToken} size={122} bgColor="#ffffff" fgColor="#0c1113" level="M" /><span>{booking.bookingCode}</span></div>
              </div>
              <button className="booking-primary" type="button" onClick={() => setShowTickets(true)}><TicketCheck size={18} /> Xem vé điện tử</button>
            </article>
          )}
        </div>
      </div>

      <div className="result-actions"><button onClick={() => window.print()}><Printer size={16} /> In xác nhận</button><button onClick={() => window.print()}><Download size={16} /> Lưu vé</button><button className="booking-primary" onClick={() => navigate("/")}>Về trang chủ</button></div>

      {showTickets && (
        <div className="ticket-modal-backdrop" role="presentation" onMouseDown={() => setShowTickets(false)}>
          <div className="ticket-modal" role="dialog" aria-modal="true" aria-label="Vé điện tử" onMouseDown={(event) => event.stopPropagation()}>
            <header><div><small>Premiere Cinemas</small><h2>Vé Điện Tử</h2></div><button aria-label="Đóng" onClick={() => setShowTickets(false)}><X /></button></header>
            <div className="ticket-modal-success"><span><Check size={17} /></span><strong>Đặt vé thành công</strong><small>Mã đơn hàng: {booking.bookingCode}</small></div>
            <div className="electronic-ticket-list">
              {booking.tickets.map((ticket, index) => (
                <article className="electronic-ticket" key={ticket.ticketCode || ticket.seatName}>
                  <div className="electronic-ticket-head"><span>PREMIERE CINEMAS</span><small>E-TICKET · {index + 1}/{booking.tickets.length}</small></div>
                  <div className="electronic-ticket-movie"><img src={booking.posterUrl} alt="" /><div><span>{booking.ageRating} · {booking.format}</span><h3>{booking.movieTitle}</h3></div></div>
                  <dl className="electronic-ticket-details">
                    <div><dt>Ngày</dt><dd>{dateOnly(booking.startTime)}</dd></div>
                    <div><dt>Giờ chiếu</dt><dd>{timeOnly(booking.startTime)}</dd></div>
                    <div><dt>Phòng chiếu</dt><dd>{booking.roomName} · {booking.roomType}</dd></div>
                    <div><dt>Ghế</dt><dd className="electronic-ticket-seat">{ticket.seatName} · {ticket.seatType}</dd></div>
                  </dl>
                  <div className="electronic-ticket-qr"><QRCodeSVG value={booking.bookingQrToken} size={178} bgColor="#fff" fgColor="#111" level="M" /><span>Mã đặt vé chung · xuất {booking.tickets.length} vé</span></div>
                  <div className="electronic-ticket-total"><span>Tổng tiền</span><strong>{money(ticket.price)}</strong><small>{ticket.ticketCode || booking.bookingCode}</small></div>
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
