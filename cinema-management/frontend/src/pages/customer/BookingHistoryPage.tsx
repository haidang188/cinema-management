import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Download,
  Film,
  QrCode,
  ReceiptText,
  Search,
  ShieldCheck,
  Ticket,
  Trophy,
  Wallet,
} from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useMemo, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { getPointSummary } from "../../service/account/accountService"
import { confirmVietQr, getBooking } from "../../service/booking/bookingService"
import { getBookingHistory } from "../../service/customerService"
import { toAssetUrl } from "../../service/promotion/promotionService"
import type { AuthResponse } from "../../types/auth"
import type { BookingDetail } from "../../types/booking"
import type { BookingHistoryPage as HistoryPage } from "../../types/customer"
import { formatDate, formatDateTime, formatTime, formatVnd } from "../../utils/format"
import { downloadTicketQr } from "../../utils/ticketQr"
import "./booking-history.css"

type HistoryTab = "UNPAID" | "UPCOMING" | "COMPLETED"

const emptyPage: HistoryPage = { content: [], number: 0, totalPages: 0, totalElements: 0, first: true, last: true }
const inputDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
const defaultTo = inputDate(new Date())
const initialFrom = new Date(); initialFrom.setDate(initialFrom.getDate() - 30)
const defaultFrom = inputDate(initialFrom)

const TAB_META: Record<HistoryTab, { label: string; status: string; tone: string }> = {
  UNPAID: { label: "Chờ thanh toán", status: "Chờ thanh toán", tone: "amber" },
  UPCOMING: { label: "Sắp chiếu", status: "Sắp chiếu", tone: "green" },
  COMPLETED: { label: "Đã xem", status: "Đã xem", tone: "muted" },
}

const LEVEL_LABEL: Record<string, string> = {
  BASIC: "Thành viên",
  SILVER: "Hạng Bạc",
  GOLD: "Hạng Vàng",
  PLATINUM: "Hạng Bạch kim",
  DIAMOND: "Hạng Kim cương",
}

function paymentLabel(method: string | null) {
  if (!method) return "—"
  const value = method.toUpperCase()
  if (value === "VIETQR") return "VietQR"
  if (value === "VNPAY") return "VNPay"
  if (value === "CASH") return "Tiền mặt"
  return method
}

function BookingHistoryPage({ currentUser }: { currentUser: AuthResponse }) {
  const [data, setData] = useState<HistoryPage>(emptyPage)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dates, setDates] = useState({ from: defaultFrom, to: defaultTo })
  const [appliedDates, setAppliedDates] = useState({ from: defaultFrom, to: defaultTo })
  const [keyword, setKeyword] = useState("")
  const [tab, setTab] = useState<HistoryTab>("UNPAID")
  const [counts, setCounts] = useState({ unpaid: 0, upcoming: 0, completed: 0 })
  const [points, setPoints] = useState<{ balance: number; level: string | null; next: string | null; nextPoints: number }>({
    balance: 0,
    level: null,
    next: null,
    nextPoints: 0,
  })
  const [refreshKey, setRefreshKey] = useState(0)
  const [confirmingCode, setConfirmingCode] = useState("")

  // Tải mã QR: lấy chi tiết đơn (có mã QR), vẽ QR ẩn rồi xuất ảnh PNG.
  const [qrBooking, setQrBooking] = useState<BookingDetail | null>(null)
  const [downloadingCode, setDownloadingCode] = useState("")
  const qrRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoading(true); setError("")
    getBookingHistory(currentUser.userId, page, 8, appliedDates.from, appliedDates.to, tab)
      .then(setData).catch((err: Error) => setError(err.message)).finally(() => setLoading(false))
  }, [currentUser.userId, page, appliedDates, tab, refreshKey])

  useEffect(() => {
    Promise.all([
      getBookingHistory(currentUser.userId, 0, 1, appliedDates.from, appliedDates.to, "UNPAID"),
      getBookingHistory(currentUser.userId, 0, 1, appliedDates.from, appliedDates.to, "UPCOMING"),
      getBookingHistory(currentUser.userId, 0, 1, appliedDates.from, appliedDates.to, "COMPLETED"),
    ]).then(([unpaid, upcoming, completed]) => setCounts({ unpaid: unpaid.totalElements, upcoming: upcoming.totalElements, completed: completed.totalElements })).catch(() => undefined)
  }, [currentUser.userId, appliedDates, refreshKey])

  useEffect(() => {
    getPointSummary(currentUser.userId)
      .then(result => setPoints({
        balance: result.pointBalance,
        level: result.membershipLevel,
        next: result.nextLevel,
        nextPoints: result.nextLevelPoints,
      }))
      .catch(() => undefined)
  }, [currentUser.userId])

  useEffect(() => {
    const svg = qrRef.current?.querySelector("svg")
    if (!qrBooking || !svg) return

    downloadTicketQr(svg, {
      bookingCode: qrBooking.bookingCode,
      movieTitle: qrBooking.movieTitle,
      showtime: `${formatTime(qrBooking.startTime)} · ${formatDate(qrBooking.startTime)}`,
      room: qrBooking.roomName,
      seats: qrBooking.tickets.map(ticket => ticket.seatName).join(", "),
    })
      .catch((cause: Error) => setError(cause.message || "Không thể tải mã QR"))
      .finally(() => {
        setQrBooking(null)
        setDownloadingCode("")
      })
  }, [qrBooking])

  const visibleItems = useMemo(() => data.content.filter(item => {
    const query = keyword.trim().toLocaleLowerCase("vi")
    return !query || item.movieTitle.toLocaleLowerCase("vi").includes(query) || item.bookingCode.toLocaleLowerCase("vi").includes(query)
  }), [data.content, keyword])

  const filterHistory = () => {
    if (dates.from && dates.to && dates.from > dates.to) return setError("Ngày bắt đầu không được sau ngày kết thúc.")
    setError("")
    setPage(0); setAppliedDates({ ...dates })
  }

  const changeTab = (next: HistoryTab) => {
    setTab(next)
    setPage(0)
  }

  const confirmPayment = async (bookingCode: string) => {
    try {
      setConfirmingCode(bookingCode)
      setError("")
      await confirmVietQr(bookingCode, currentUser.userId)
      setPage(0)
      setTab("UPCOMING")
      setRefreshKey(value => value + 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể xác nhận thanh toán")
    } finally {
      setConfirmingCode("")
    }
  }

  const downloadQr = async (bookingCode: string) => {
    if (downloadingCode) return
    try {
      setDownloadingCode(bookingCode)
      setError("")
      const detail = await getBooking(bookingCode, currentUser.userId)
      if (!detail.bookingQrToken) throw new Error("Đơn này chưa có mã QR vào rạp")
      setQrBooking(detail)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải mã QR")
      setDownloadingCode("")
    }
  }

  const tabs: { key: HistoryTab; count: number }[] = [
    { key: "UNPAID", count: counts.unpaid },
    { key: "UPCOMING", count: counts.upcoming },
    { key: "COMPLETED", count: counts.completed },
  ]

  return <section className="bh-page">
    <nav className="bh-breadcrumb" aria-label="Đường dẫn trang">
      <Link to="/">Trang chủ</Link><span>›</span><Link to="/account">Tài khoản</Link><span>›</span><strong>Lịch sử đặt vé</strong>
    </nav>

    <header className="bh-head">
      <div className="bh-title">
        <h1>Lịch sử đặt vé</h1>
        <p>Theo dõi đơn đặt vé, vé sắp chiếu và tải mã QR vào rạp.</p>
      </div>

      <div className="bh-stats">
        <div className="bh-stat"><Wallet size={18} /><div><strong>{counts.unpaid}</strong><span>Chờ thanh toán</span></div></div>
        <div className="bh-stat is-green"><Ticket size={18} /><div><strong>{counts.upcoming}</strong><span>Vé sắp chiếu</span></div></div>
        <div className="bh-stat"><Film size={18} /><div><strong>{counts.completed}</strong><span>Đã xem</span></div></div>
        <div className="bh-stat is-gold"><Trophy size={18} /><div><strong>{points.balance}</strong><span>Điểm tích lũy</span></div></div>
      </div>
    </header>

    <div className="bh-toolbar">
      <div className="bh-tabs" role="tablist" aria-label="Lọc theo trạng thái">
        {tabs.map(item => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            className={tab === item.key ? "is-active" : ""}
            onClick={() => changeTab(item.key)}
          >
            {TAB_META[item.key].label}<b>{item.count}</b>
          </button>
        ))}
      </div>

      <label className="bh-search">
        <Search size={15} />
        <input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm theo tên phim, mã đơn…" />
      </label>

      <div className="bh-dates">
        <label><span>Từ ngày</span><input type="date" value={dates.from} max={dates.to || undefined} onChange={event => setDates(current => ({ ...current, from: event.target.value }))} /></label>
        <label><span>Đến ngày</span><input type="date" value={dates.to} min={dates.from || undefined} onChange={event => setDates(current => ({ ...current, to: event.target.value }))} /></label>
        <button type="button" onClick={filterHistory}>Lọc</button>
      </div>
    </div>

    {error && <div className="bh-alert" role="alert">{error}</div>}

    <div className="bh-layout">
      <main className="bh-list-wrap">
        {loading && (
          <div className="bh-list" aria-busy="true">
            {Array.from({ length: 3 }).map((_, index) => <div className="bh-skeleton" key={index} />)}
          </div>
        )}

        {!loading && !error && visibleItems.length === 0 && (
          <div className="bh-empty">
            <Film size={26} />
            <strong>{tab === "UNPAID" ? "Không có đơn nào chờ thanh toán" : "Không có vé trong khoảng thời gian này"}</strong>
            <span>Thử đổi khoảng ngày hoặc chọn một suất chiếu mới.</span>
            <Link to="/">Chọn phim</Link>
          </div>
        )}

        {!loading && visibleItems.length > 0 && (
          <div className="bh-list">
            {visibleItems.map(item => {
              const meta = TAB_META[tab]
              const busyQr = downloadingCode === item.bookingCode
              return (
                <article className={`bh-ticket is-${meta.tone}`} key={item.id}>
                  <div className="bh-poster">
                    {item.posterUrl ? <img src={toAssetUrl(item.posterUrl)} alt={item.movieTitle} /> : <Film />}
                  </div>

                  <div className="bh-info">
                    <div className="bh-info-top">
                      <span className={`bh-status is-${meta.tone}`}>{meta.status}</span>
                      <code>{item.bookingCode}</code>
                    </div>
                    <h2>{item.movieTitle}</h2>
                    <p className="bh-meta">
                      <span><CalendarDays size={13} />{formatDate(item.showtimeStart)}</span>
                      <span><Clock3 size={13} />{formatTime(item.showtimeStart)}</span>
                      <span>{item.roomName}</span>
                    </p>
                    <div className="bh-seats">
                      {item.seats.length ? item.seats.map(seat => <span key={seat}>{seat}</span>) : <span>—</span>}
                    </div>
                  </div>

                  <div className="bh-side">
                    <div className="bh-amount">
                      <strong>{formatVnd(item.totalAmount)}</strong>
                      <span>{paymentLabel(item.paymentMethod)} · đặt lúc {formatDateTime(item.createdAt)}</span>
                    </div>

                    <div className="bh-actions">
                      {tab === "UNPAID" ? (
                        <>
                          <button className="is-primary" type="button" disabled={confirmingCode === item.bookingCode} onClick={() => confirmPayment(item.bookingCode)}>
                            <QrCode size={14} /> {confirmingCode === item.bookingCode ? "Đang xác nhận…" : "Xác nhận đã thanh toán"}
                          </button>
                          <Link to={`/booking/result/${item.bookingCode}`}><ReceiptText size={14} /> Chi tiết</Link>
                        </>
                      ) : (
                        <>
                          <Link className="is-primary" to={`/booking/result/${item.bookingCode}`}><Ticket size={14} /> Xem vé</Link>
                          <button type="button" disabled={busyQr} onClick={() => void downloadQr(item.bookingCode)}>
                            <Download size={14} /> {busyQr ? "Đang tạo…" : "Tải mã QR"}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}

        {data.totalPages > 1 && (
          <nav className="bh-pagination" aria-label="Phân trang">
            <button type="button" disabled={data.first} onClick={() => setPage(value => value - 1)}><ChevronLeft size={15} /> Trước</button>
            <span>Trang {data.number + 1} / {data.totalPages}</span>
            <button type="button" disabled={data.last} onClick={() => setPage(value => value + 1)}>Sau <ChevronRight size={15} /></button>
          </nav>
        )}
      </main>

      <aside className="bh-aside">
        <section className="bh-card bh-member">
          <div className="bh-member-head"><Trophy size={18} /><span>{LEVEL_LABEL[points.level || ""] || points.level || "Thành viên"}</span></div>
          <strong>{points.balance.toLocaleString("vi-VN")} điểm</strong>
          {points.next && points.nextPoints > 0
            ? <p>Còn <b>{Math.max(points.nextPoints - points.balance, 0).toLocaleString("vi-VN")} điểm</b> để lên {LEVEL_LABEL[points.next] || points.next}.</p>
            : <p>Tích điểm trên mỗi vé đã mua.</p>}
          <Link to="/account">Xem tài khoản</Link>
        </section>

        <section className="bh-card">
          <h3><ShieldCheck size={16} /> Lưu ý khi đến rạp</h3>
          <ul>
            <li>Tải mã QR về máy hoặc mở vé điện tử để xuất trình tại cửa soát vé.</li>
            <li>Đến rạp trước giờ chiếu ít nhất 15 phút.</li>
            <li>Không chia sẻ mã QR vé với người khác.</li>
          </ul>
        </section>
      </aside>
    </div>

    {/* QR ẩn chỉ để xuất ảnh khi bấm "Tải mã QR". */}
    <div className="bh-qr-offscreen" ref={qrRef} aria-hidden="true">
      {qrBooking && <QRCodeSVG value={qrBooking.bookingQrToken} size={440} bgColor="#ffffff" fgColor="#111111" level="M" marginSize={1} />}
    </div>
  </section>
}

export default BookingHistoryPage
