import { ArrowLeft, BadgePercent, Building2, Check, Clock3, QrCode, ShieldCheck, WalletCards } from "lucide-react"
import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  confirmVietQr,
  createOnlineBooking,
  getApplicablePromotions,
  previewBooking,
} from "../../service/booking/bookingService"
import type { AuthResponse } from "../../types/auth"
import type { BookingPreview, OnlineBookingResult, PaymentMethod, PromotionQuote } from "../../types/booking"
import { BOOKING_DRAFT_KEY } from "./BookingSeatsPage"
import { formatTime, formatVnd } from "../../utils/format"
import { seatKind } from "../../component/seat-map/seatMapUtils"
import BookingModal from "../../component/BookingModal"
import BookingStepper from "./BookingStepper"
import { formatCountdown, seatTypeLabel } from "./bookingFlowUtils"
import "./booking-flow.css"

interface BookingConfirmPageProps {
  currentUser: AuthResponse
}

interface BookingDraft {
  userId: number
  showtimeId: number
  holdToken: string
  expiresAt: string
}

/** "Thứ bảy, 24/10/2026" */
function formatShowDate(value: string) {
  const text = new Date(value).toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" })
  return text.charAt(0).toUpperCase() + text.slice(1)
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
  const [appliedPromotionCode, setAppliedPromotionCode] = useState("")
  const [promotions, setPromotions] = useState<PromotionQuote[]>([])
  const [promotionsLoading, setPromotionsLoading] = useState(false)

  useEffect(() => {
    if (!draft || draft.userId !== currentUser.userId) return
    previewBooking(currentUser.userId, draft.holdToken)
      .then(setPreview)
      .catch((requestError: Error) => setError(requestError.message || "Không thể tải thông tin đặt vé"))
  }, [currentUser.userId, draft])

  useEffect(() => {
    if (!showPromotions || !draft) return
    setPromotionsLoading(true)
    getApplicablePromotions(currentUser.userId, draft.holdToken)
      .then(setPromotions)
      .catch((requestError: Error) => setPromotionFeedback(requestError.message || "Không thể tải mã khuyến mãi"))
      .finally(() => setPromotionsLoading(false))
  }, [showPromotions, currentUser.userId, draft])

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
      const result = await createOnlineBooking(currentUser.userId, draft.holdToken, method, appliedPromotionCode)
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

  async function applyPromotion(code = promotionCode) {
    if (!draft) return
    const normalizedCode = code.trim().toUpperCase()
    setPromotionCode(normalizedCode)
    if (!normalizedCode) {
      setPromotionFeedback("Vui lòng nhập mã khuyến mãi.")
      return
    }
    setIsSubmitting(true)
    try {
      const nextPreview = await previewBooking(currentUser.userId, draft.holdToken, normalizedCode)
      setPreview(nextPreview)
      setPromotionFeedback(nextPreview.promotionMessage)
      setAppliedPromotionCode(nextPreview.discountAmount > 0 ? normalizedCode : "")
      if (nextPreview.discountAmount > 0) setShowPromotions(false)
    } catch (requestError) {
      setAppliedPromotionCode("")
      setPromotionFeedback(requestError instanceof Error ? requestError.message : "Không thể áp dụng mã")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!draft) {
    return (
      <section className="bf-page">
        <BookingStepper current={2} />
        <div className="bf-state">
          <p>Không có lượt giữ ghế. Vui lòng chọn suất chiếu và ghế trước.</p>
          <button type="button" className="bf-btn bf-btn-ghost" onClick={() => navigate("/")}>Về trang chủ</button>
        </div>
      </section>
    )
  }
  if (!preview && !error) {
    return (
      <section className="bf-page">
        <BookingStepper current={2} />
        <div className="bf-state"><span className="bf-spinner" aria-hidden="true" />Đang chuẩn bị đơn đặt vé…</div>
      </section>
    )
  }
  if (!preview) {
    return (
      <section className="bf-page">
        <BookingStepper current={2} />
        <div className="bf-state">
          <p className="bf-error" role="alert">{error}</p>
          <button type="button" className="bf-btn bf-btn-ghost" onClick={() => navigate(-1)}><ArrowLeft size={16} /> Quay lại</button>
        </div>
      </section>
    )
  }

  const holdWarning = secondsLeft <= 120
  const promotionOk = Boolean(appliedPromotionCode) && preview.discountAmount > 0

  return (
    <section className="bf-page">
      <BookingStepper current={2} showtime={preview} expiresAt={preview.expiresAt} secondsLeft={secondsLeft} />

      <div className="bf-confirm-body">
        <div className="bf-confirm-main">
          <article className="bf-card bf-movie" aria-label="Phim và suất chiếu">
            <div className="bf-poster">{preview.posterUrl && <img src={preview.posterUrl} alt={preview.movieTitle} />}</div>
            <div className="bf-movie-info">
              <span className="bf-eyebrow">Phim & suất chiếu</span>
              <h2>{preview.movieTitle}</h2>
              <p className="bf-movie-time"><b>{formatTime(preview.startTime)}</b> · {formatShowDate(preview.startTime)}</p>
              <div className="bf-chips">
                <span className="bf-chip bf-chip-red">{preview.roomName}</span>
                <span className="bf-chip">{preview.format || "2D"}</span>
              </div>
            </div>
          </article>

          <article className="bf-card">
            <div className="bf-card-head">
              <h2>Ghế</h2>
              <span>{preview.seats.length} ghế · {formatVnd(preview.subtotal)}</span>
            </div>
            <ul className="bf-seat-list">
              {preview.seats.map((seat) => (
                <li key={seat.showtimeSeatId} className={`bf-seat is-${seatKind(seat.seatType)}`}>
                  <b>{seat.seatName}</b>
                  <small>{seatTypeLabel(seat.seatType)}</small>
                  <em>{formatVnd(seat.price)}</em>
                </li>
              ))}
            </ul>
          </article>

          <article className="bf-card">
            <h2>Thông tin khách hàng</h2>
            <dl className="bf-info-grid">
              <div><dt>Họ và tên</dt><dd className={currentUser.fullName ? "" : "is-empty"}>{currentUser.fullName || "Chưa cập nhật"}</dd></div>
              <div><dt>Email</dt><dd>{currentUser.email}</dd></div>
              <div><dt>Số điện thoại</dt><dd className={currentUser.phone ? "" : "is-empty"}>{currentUser.phone || "Chưa cập nhật"}</dd></div>
            </dl>
          </article>

          <article className="bf-card">
            <h2>Phương thức thanh toán</h2>
            <div className="bf-methods" role="radiogroup" aria-label="Phương thức thanh toán">
              <label className={`bf-method${method === "VIETQR" ? " is-selected" : ""}${booking ? " is-disabled" : ""}`}>
                <input type="radio" name="payment" checked={method === "VIETQR"} onChange={() => setMethod("VIETQR")} disabled={Boolean(booking)} />
                <span className="bf-method-icon"><QrCode size={18} /></span>
                <span className="bf-method-text"><b>VietQR</b><small>Quét mã bằng ứng dụng ngân hàng, đúng số tiền và nội dung</small></span>
                <span className="bf-method-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
              </label>
              <label className={`bf-method${method === "VNPAY" ? " is-selected" : ""}${booking ? " is-disabled" : ""}`}>
                <input type="radio" name="payment" checked={method === "VNPAY"} onChange={() => setMethod("VNPAY")} disabled={Boolean(booking)} />
                <span className="bf-method-icon"><WalletCards size={18} /></span>
                <span className="bf-method-text"><b>VNPay sandbox</b><small>Chuyển sang cổng thử nghiệm VNPay để thanh toán</small></span>
                <span className="bf-method-check" aria-hidden="true"><Check size={12} strokeWidth={3} /></span>
              </label>
            </div>
          </article>
        </div>

        <aside className="bf-card bf-summary" aria-label="Tóm tắt đơn hàng">
          <div className="bf-card-head">
            <h2>Đơn hàng</h2>
            <span>{preview.seats.length} vé</span>
          </div>

          <div className={`bf-hold${holdWarning ? " is-warning" : ""}`} role="timer">
            <span><Clock3 size={15} /> Giữ ghế còn</span>
            <b>{formatCountdown(secondsLeft)}</b>
          </div>

          <dl className="bf-price">
            <div><dt>Tiền vé ({preview.seats.length} vé)</dt><dd>{formatVnd(preview.subtotal)}</dd></div>
            <div><dt>Phụ phí</dt><dd>{formatVnd(0)}</dd></div>
            <div>
              <dt>Giảm giá{appliedPromotionCode ? ` (${appliedPromotionCode})` : ""}</dt>
              <dd className={preview.discountAmount > 0 ? "is-discount" : ""}>-{formatVnd(preview.discountAmount)}</dd>
            </div>
          </dl>

          <div className="bf-promo">
            <label className="bf-field-label" htmlFor="bf-promo-code">Mã khuyến mãi</label>
            <div className="bf-promo-row">
              <input
                id="bf-promo-code"
                className="bf-input"
                type="text"
                value={promotionCode}
                onChange={(event) => { setPromotionCode(event.target.value); setPromotionFeedback("") }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyPromotion() } }}
                placeholder="Nhập mã khuyến mãi"
                disabled={Boolean(booking)}
              />
              <button type="button" className="bf-btn bf-btn-ghost" onClick={() => applyPromotion()} disabled={Boolean(booking) || isSubmitting}>Áp dụng</button>
            </div>
            {promotionFeedback && <p className={`bf-promo-feedback${promotionOk ? " is-ok" : ""}`}>{promotionFeedback}</p>}
            <button type="button" className="bf-link" onClick={() => setShowPromotions(true)}><BadgePercent size={14} /> Xem danh sách mã khuyến mãi</button>
          </div>

          <div className="bf-total"><span>Tổng cộng</span><strong>{formatVnd(preview.totalAmount)}</strong></div>

          <label className="bf-consent">
            <input type="checkbox" checked={agreed} onChange={event => setAgreed(event.target.checked)} />
            <span>Tôi xác nhận thông tin phim, suất chiếu và ghế đã chọn là chính xác.</span>
          </label>

          {error && <p className="bf-error" role="alert">{error}</p>}

          <div className="bf-summary-actions">
            {!booking && (
              <button className="bf-btn bf-btn-primary bf-btn-lg bf-btn-block" type="button" onClick={submitBooking} disabled={!agreed || isSubmitting || secondsLeft === 0}>
                <ShieldCheck size={17} /> {isSubmitting ? "Đang xử lý…" : secondsLeft === 0 ? "Hết thời gian giữ ghế" : "Xác nhận đặt vé"}
              </button>
            )}

            {booking?.payment.method === "VIETQR" && booking.payment.qrImageUrl && (
              <div className="bf-created">
                <span>Đơn <b>{booking.bookingCode}</b> đã được tạo, vui lòng hoàn tất chuyển khoản.</span>
                <button type="button" className="bf-btn bf-btn-primary bf-btn-block" onClick={() => setShowVietQrPayment(true)}><QrCode size={16} /> Mở mã VietQR</button>
              </div>
            )}

            {!booking && (
              <button className="bf-btn bf-btn-ghost bf-btn-block" type="button" onClick={() => navigate(`/booking/showtimes/${draft.showtimeId}/seats`)}>
                <ArrowLeft size={16} /> Quay lại chọn ghế
              </button>
            )}
          </div>
          <p className="bf-note"><Building2 size={14} /> Kiểm tra thông tin trước khi chuyển tiền</p>
        </aside>
      </div>

      {showPromotions && (
        <BookingModal title="Danh sách mã khuyến mãi" onClose={() => setShowPromotions(false)}>
          <div className="bf-promo-modal">
            <p>Các mã khuyến mãi có thể áp dụng cho đơn hàng này.</p>
            <div className="bf-promo-row">
              <input
                className="bf-input"
                type="text"
                value={promotionCode}
                onChange={(event) => { setPromotionCode(event.target.value); setPromotionFeedback("") }}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyPromotion() } }}
                placeholder="Nhập mã khác…"
                aria-label="Mã khuyến mãi"
              />
              <button type="button" className="bf-btn bf-btn-ghost" onClick={() => applyPromotion()} disabled={isSubmitting}>Áp dụng</button>
            </div>
            {promotionFeedback && <p className={`bf-promo-feedback${promotionOk ? " is-ok" : ""}`}>{promotionFeedback}</p>}
            <div className="bf-promo-list">
              {promotionsLoading && (
                <div className="bf-promo-item is-empty"><span><BadgePercent size={18} /></span><div><strong>Đang tải mã khuyến mãi…</strong></div></div>
              )}
              {!promotionsLoading && promotions.length === 0 && (
                <div className="bf-promo-item is-empty"><span><BadgePercent size={18} /></span><div><strong>Không có mã phù hợp</strong><small>Đơn hàng hiện chưa đủ điều kiện cho mã nào.</small></div></div>
              )}
              {!promotionsLoading && promotions.map((promotion) => (
                <div className="bf-promo-item" key={promotion.promotionId}>
                  <span><BadgePercent size={18} /></span>
                  <div><strong>{promotion.code} · {promotion.title}</strong><small>{promotion.message} · còn {formatVnd(promotion.finalAmount)}</small></div>
                  <button type="button" className="bf-btn bf-btn-primary" onClick={() => applyPromotion(promotion.code)} disabled={isSubmitting}>Chọn mã</button>
                </div>
              ))}
            </div>
          </div>
        </BookingModal>
      )}

      {showVietQrPayment && booking?.payment.method === "VIETQR" && booking.payment.qrImageUrl && (
        <BookingModal title="Thanh toán VietQR" showFooter={false} onClose={() => setShowVietQrPayment(false)}>
          <div className="bf-vietqr">
            <img src={booking.payment.qrImageUrl} alt="Mã VietQR thanh toán" />
            <dl className="bf-customer-list">
              <div><dt>Số tiền</dt><dd>{formatVnd(preview.totalAmount)}</dd></div>
              <div><dt>Ngân hàng</dt><dd>{booking.payment.bankName || "—"}</dd></div>
              <div><dt>Số tài khoản</dt><dd>{booking.payment.accountNumber}</dd></div>
              <div><dt>Chủ tài khoản</dt><dd>{booking.payment.accountName}</dd></div>
              <div><dt>Nội dung</dt><dd>{booking.payment.transferContent}</dd></div>
            </dl>
            <p>Đây là chế độ xác nhận thủ công. Chỉ nhấn sau khi bạn đã chuyển khoản.</p>
            {error && <p className="bf-error" role="alert">{error}</p>}
            <button className="bf-btn bf-btn-primary bf-btn-lg bf-btn-block" type="button" onClick={finishVietQr} disabled={isSubmitting || secondsLeft === 0}>
              {isSubmitting ? "Đang xác nhận…" : "Tôi đã thanh toán"}
            </button>
            <p className="bf-note"><Building2 size={14} /> Kiểm tra đúng số tiền và nội dung trước khi chuyển</p>
          </div>
        </BookingModal>
      )}
    </section>
  )
}

export default BookingConfirmPage
