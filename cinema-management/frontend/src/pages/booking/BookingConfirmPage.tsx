import { ArrowLeft, BadgePercent, Building2, Clock3, QrCode, ShieldCheck, WalletCards } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  confirmVietQr,
  createOnlineBooking,
  previewBooking,
} from "../../service/booking/bookingService"
import type { AuthResponse } from "../../types/auth"
import type { BookingPreview, OnlineBookingResult, PaymentMethod } from "../../types/booking"
import { BOOKING_DRAFT_KEY } from "./BookingSeatsPage"
import "./booking.css"
import BookingModal from "../../component/BookingModal"

interface BookingConfirmPageProps {
  currentUser: AuthResponse
}

interface BookingDraft {
  userId: number
  showtimeId: number
  holdToken: string
  expiresAt: string
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
  })
}

function BookingConfirmPage({ currentUser }: BookingConfirmPageProps) {
  const navigate = useNavigate()
  const [draft] = useState<BookingDraft | null>(() => {
    const raw = sessionStorage.getItem(BOOKING_DRAFT_KEY)
    return raw ? (JSON.parse(raw) as BookingDraft) : null
  })
  const [preview, setPreview] = useState<BookingPreview | null>(null)
  const [method, setMethod] = useState<PaymentMethod>("VIETQR")
  const [booking, setBooking] = useState<OnlineBookingResult | null>(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showPromotions, setShowPromotions] = useState(false)
  const [showVietQrPayment, setShowVietQrPayment] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [promotionCode, setPromotionCode] = useState("")
  const [promotionFeedback, setPromotionFeedback] = useState("")

  useEffect(() => {
    if (!draft || draft.userId !== currentUser.userId) return
    previewBooking(currentUser.userId, draft.holdToken)
      .then(setPreview)
      .catch((requestError: Error) => setError(requestError.message || "Không thể tải thông tin đặt vé"))
  }, [currentUser.userId, draft])

  useEffect(() => {
    const expiresAt = booking?.paymentDeadline || preview?.expiresAt
    if (!expiresAt) return
    const update = () => setSecondsLeft(Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)))
    update()
    const timer = window.setInterval(update, 1000)
    return () => window.clearInterval(timer)
  }, [booking?.paymentDeadline, preview?.expiresAt])

  async function submitBooking() {
    if (!draft || !preview || secondsLeft === 0 || !agreed) return
    setIsSubmitting(true)
    setError("")
    try {
      const result = await createOnlineBooking(currentUser.userId, draft.holdToken, method)
      setBooking(result)
      if (result.payment.method === "VNPAY" && result.payment.paymentUrl) {
        window.location.assign(result.payment.paymentUrl)
      } else if (result.payment.method === "VIETQR" && result.payment.qrImageUrl) {
        setShowVietQrPayment(true)
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể tạo đơn đặt vé")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function finishVietQr() {
    if (!booking) return
    setIsSubmitting(true)
    setError("")
    try {
      await confirmVietQr(booking.bookingCode, currentUser.userId)
      sessionStorage.removeItem(BOOKING_DRAFT_KEY)
      navigate(`/booking/result/${booking.bookingCode}?payment=success`, { replace: true })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể xác nhận thanh toán")
    } finally {
      setIsSubmitting(false)
    }
  }

  function applyPromotion() {
    const normalizedCode = promotionCode.trim().toUpperCase()
    setPromotionCode(normalizedCode)
    setPromotionFeedback(normalizedCode
      ? `Mã ${normalizedCode} hiện không khả dụng.`
      : "Vui lòng nhập mã khuyến mãi.")
  }

  if (!draft) {
    return <section className="booking-page booking-state">Không có lượt giữ ghế. Vui lòng chọn suất chiếu và ghế trước.</section>
  }
  if (!preview && !error) return <section className="booking-page booking-state">Đang chuẩn bị đơn đặt vé...</section>
  if (!preview) return <section className="booking-page booking-state"><p>{error}</p><button onClick={() => navigate(-1)}>Quay lại</button></section>

  const seatTypes = Array.from(new Set(preview.seats.map((seat) => seat.seatType))).join(", ")

  return (
    <section className="booking-page">
      <div className="booking-steps"><span>1. Chọn ghế</span><i /><span className="is-active">2. Xác nhận</span><i /><span>3. Hoàn tất</span></div>
      <header className="confirm-heading"><h1>Xác Nhận Đặt Vé</h1></header>

      <div className="booking-layout booking-layout--confirm">
        <div className="confirm-sections">
          <article className="confirm-card">
            <h2>Thông Tin Phim</h2>
            <div className="confirm-movie">
              <img src={preview.posterUrl} alt={preview.movieTitle} />
              <div><h3>{preview.movieTitle}</h3><span>{preview.roomName}</span><span>{preview.format || "2D"}</span><strong>{formatDateTime(preview.startTime)}</strong></div>
            </div>
          </article>

          <article className="confirm-card">
            <h2>Thông Tin Vé</h2>
            <div className="ticket-info-row">
              <span><small>Ghế đã chọn</small><strong>{preview.seats.map((seat) => seat.seatName).join(", ")}</strong></span>
              <span><small>Loại vé</small><strong>{seatTypes} × {preview.seats.length}</strong></span>
            </div>
          </article>

          <article className="confirm-card">
            <h2>Thông Tin Khách Hàng</h2>
            <dl className="customer-details"><div><dt>Họ và tên</dt><dd>{currentUser.fullName || "Chưa cập nhật"}</dd></div><div><dt>Email</dt><dd>{currentUser.email}</dd></div><div><dt>Số điện thoại</dt><dd>{currentUser.phone || "Chưa cập nhật"}</dd></div></dl>
          </article>

          <article className="confirm-card">
            <h2>Phương Thức Thanh Toán</h2>
            <label className={`payment-option ${method === "VIETQR" ? "is-selected" : ""}`}>
              <input type="radio" name="payment" checked={method === "VIETQR"} onChange={() => setMethod("VIETQR")} disabled={Boolean(booking)} />
              <QrCode /><span><strong>VietQR</strong><small>Quét mã bằng ứng dụng ngân hàng, đúng số tiền và nội dung</small></span>
            </label>
            <label className={`payment-option ${method === "VNPAY" ? "is-selected" : ""}`}>
              <input type="radio" name="payment" checked={method === "VNPAY"} onChange={() => setMethod("VNPAY")} disabled={Boolean(booking)} />
              <WalletCards /><span><strong>VNPay Sandbox</strong><small>Chuyển sang cổng thử nghiệm VNPay để thanh toán</small></span>
            </label>
          </article>
        </div>

        <aside className="booking-summary-panel confirm-total">
          <h2>Tổng Quan Đơn Hàng</h2>
          <div className="hold-timer"><Clock3 size={17} /> Thời gian còn lại <strong>{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</strong></div>
          <dl>
            <div><dt>Giá vé ({preview.seats.length} vé)</dt><dd>{formatMoney(preview.subtotal)}</dd></div>
            <div><dt>Phụ phí</dt><dd>{formatMoney(0)}</dd></div>
            <div className="discount-row"><dt>Giảm giá</dt><dd>-{formatMoney(preview.discountAmount)}</dd></div>
          </dl>
          <div className="promotion-block">
            <span className="promotion-label">Mã khuyến mãi</span>
            <div className="promotion-code-row">
              <input
                type="text"
                value={promotionCode}
                onChange={(event) => { setPromotionCode(event.target.value); setPromotionFeedback("") }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyPromotion() } }}
                placeholder="Nhập mã khuyến mãi"
                disabled={Boolean(booking)}
              />
              <button type="button" onClick={applyPromotion} disabled={Boolean(booking)}>Áp dụng</button>
            </div>
            {promotionFeedback && <p className="promotion-feedback">{promotionFeedback}</p>}
            <button type="button" className="promotion-detail-button" onClick={() => setShowPromotions(true)}><BadgePercent size={15} />Xem danh sách mã khuyến mãi</button>
          </div>
          <div className="booking-grand-total"><span>Tổng cộng</span><strong>{formatMoney(preview.totalAmount)}</strong></div>
          <label className="booking-consent"><input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} /> Tôi xác nhận thông tin phim, suất chiếu và ghế đã chọn là chính xác.</label>

          {!booking && (
            <button className="booking-primary" type="button" onClick={submitBooking} disabled={!agreed || isSubmitting || secondsLeft === 0}>
              {isSubmitting ? "Đang xử lý..." : "Xác nhận đặt vé"} <ShieldCheck size={18} />
            </button>
          )}

          {booking?.payment.method === "VIETQR" && booking.payment.qrImageUrl && (
            <div className="payment-created-note">
              <span>Đơn đã được tạo, vui lòng hoàn tất chuyển khoản.</span>
              <button type="button" onClick={() => setShowVietQrPayment(true)}><QrCode size={16} /> Mở mã VietQR</button>
            </div>
          )}

          {error && <p className="booking-error">{error}</p>}
          {!booking && <button className="booking-secondary" type="button" onClick={() => navigate(`/booking/showtimes/${draft.showtimeId}/seats`)}><ArrowLeft size={16} /> Quay lại chọn ghế</button>}
          <div className="secure-note"><Building2 size={15} /> Kiểm tra thông tin trước khi chuyển tiền</div>
        </aside>
      </div>
      {showPromotions && (
        <BookingModal title="Danh sách mã ưu đãi" onClose={() => setShowPromotions(false)}>
          <div className="promotion-modal-content">
            <p className="promotion-modal-note">Các mã khuyến mãi có thể áp dụng cho đơn hàng này</p>
            <div className="promotion-code-row promotion-code-row--modal">
              <input
                type="text"
                value={promotionCode}
                onChange={(event) => { setPromotionCode(event.target.value); setPromotionFeedback("") }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyPromotion() } }}
                placeholder="Nhập mã voucher khác..."
              />
              <button type="button" onClick={applyPromotion}>Áp dụng</button>
            </div>
            {promotionFeedback && <p className="promotion-feedback">{promotionFeedback}</p>}
            <div className="promotion-empty-card">
              <span><BadgePercent size={19} /></span>
              <div><strong>Hiện chưa có mã khuyến mãi</strong><small>Bạn có thể tiếp tục đặt vé với giá hiện tại.</small></div>
              <button type="button" disabled>Không có mã</button>
            </div>
          </div>
        </BookingModal>
      )}
      {showVietQrPayment && booking?.payment.method === "VIETQR" && booking.payment.qrImageUrl && (
        <BookingModal title="Thanh toán VietQR" className="vietqr-payment-modal" showFooter={false} onClose={() => setShowVietQrPayment(false)}>
          <div className="vietqr-payment">
            <img src={booking.payment.qrImageUrl} alt="Mã VietQR thanh toán" />
            <dl>
              <div><dt>Ngân hàng</dt><dd>{booking.payment.bankName || "-"}</dd></div>
              <div><dt>Số tài khoản</dt><dd>{booking.payment.accountNumber}</dd></div>
              <div><dt>Chủ tài khoản</dt><dd>{booking.payment.accountName}</dd></div>
              <div><dt>Nội dung</dt><dd>{booking.payment.transferContent}</dd></div>
            </dl>
            <p>Đây là chế độ xác nhận thủ công. Chỉ nhấn sau khi bạn đã chuyển khoản.</p>
            <button className="booking-primary" type="button" onClick={finishVietQr} disabled={isSubmitting || secondsLeft === 0}>
              {isSubmitting ? "Đang xác nhận..." : "Tôi đã thanh toán"}
            </button>
            <div className="secure-note"><Building2 size={15} /> Kiểm tra đúng số tiền và nội dung trước khi chuyển</div>
          </div>
        </BookingModal>
      )}
    </section>
  )
}

export default BookingConfirmPage
