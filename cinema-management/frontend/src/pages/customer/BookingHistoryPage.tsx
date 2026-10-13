import { CalendarDays, ChevronLeft, ChevronRight, CircleHelp, Clock3, Film, MapPin, QrCode, Search, ShieldCheck, Star, Ticket, Trophy } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getPointSummary } from "../../service/account/accountService"
import { confirmVietQr } from "../../service/booking/bookingService"
import { getBookingHistory } from "../../service/customerService"
import { toAssetUrl } from "../../service/promotion/promotionService"
import type { AuthResponse } from "../../types/auth"
import type { BookingHistoryPage as HistoryPage } from "../../types/customer"
import "./customer-pages.css"

const emptyPage: HistoryPage = { content: [], number: 0, totalPages: 0, totalElements: 0, first: true, last: true }
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
const dateTime = (value: string) => new Date(value).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })
const inputDate = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
const defaultTo = inputDate(new Date())
const initialFrom = new Date(); initialFrom.setDate(initialFrom.getDate() - 30)
const defaultFrom = inputDate(initialFrom)

function BookingHistoryPage({ currentUser }: { currentUser: AuthResponse }) {
  const [data, setData] = useState<HistoryPage>(emptyPage)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [dates, setDates] = useState({ from: defaultFrom, to: defaultTo })
  const [appliedDates, setAppliedDates] = useState({ from: defaultFrom, to: defaultTo })
  const [keyword, setKeyword] = useState("")
  const [tab, setTab] = useState<"UNPAID" | "UPCOMING" | "COMPLETED">("UNPAID")
  const [counts, setCounts] = useState({ unpaid: 0, upcoming: 0, completed: 0 })
  const [points, setPoints] = useState(0)
  const [refreshKey, setRefreshKey] = useState(0)
  const [confirmingCode, setConfirmingCode] = useState("")

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

  useEffect(() => { getPointSummary(currentUser.userId).then(result => setPoints(result.pointBalance)).catch(() => undefined) }, [currentUser.userId])

  const visibleItems = useMemo(() => data.content.filter(item => {
    const query = keyword.trim().toLocaleLowerCase("vi")
    return !query || item.movieTitle.toLocaleLowerCase("vi").includes(query) || item.bookingCode.toLocaleLowerCase("vi").includes(query)
  }), [data.content, keyword])

  const filterHistory = () => {
    if (dates.from && dates.to && dates.from > dates.to) return setError("Ngày bắt đầu không được sau ngày kết thúc.")
    setPage(0); setAppliedDates({ ...dates })
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

  return <section className="customer-page history-page">
    <nav className="history-breadcrumb page-breadcrumb" aria-label="Đường dẫn trang"><Link to="/">Trang chủ</Link><span>›</span><Link to="/account">Tài khoản</Link><span>›</span><strong>Lịch sử đặt vé</strong></nav>
    <header className="history-titlebar">
      <h1>LỊCH SỬ ĐẶT VÉ</h1>
      <div className="history-metrics"><div><small>TỔNG SỐ ĐƠN</small><strong>{counts.unpaid + counts.upcoming + counts.completed}</strong><span>giao dịch</span></div><div><small>CHƯA THANH TOÁN</small><strong>{counts.unpaid}</strong><span>đơn chờ xác nhận</span></div><div><small>VÉ SẮP CHIẾU</small><strong>{counts.upcoming}</strong><span>vé hợp lệ</span></div><div><small>ĐIỂM TÍCH LŨY</small><strong>{points}</strong><span>Premiere Gold</span></div></div>
    </header>
    <div className="history-toolbar">
      <div className="history-tabs"><button className={tab === "UNPAID" ? "is-active" : ""} onClick={() => { setTab("UNPAID"); setPage(0) }}>Chưa thanh toán ({counts.unpaid})</button><button className={tab === "UPCOMING" ? "is-active" : ""} onClick={() => { setTab("UPCOMING"); setPage(0) }}>Sắp diễn ra ({counts.upcoming})</button><button className={tab === "COMPLETED" ? "is-active" : ""} onClick={() => { setTab("COMPLETED"); setPage(0) }}>Đã hoàn thành ({counts.completed})</button></div>
      <label className="history-search"><Search size={16} /><input value={keyword} onChange={event => setKeyword(event.target.value)} placeholder="Tìm theo tên phim, mã đơn..." /></label>
      <div className="history-date-range"><label><span>Từ ngày</span><input type="date" value={dates.from} max={dates.to || undefined} onChange={event => setDates(current => ({ ...current, from: event.target.value }))} /></label><i>—</i><label><span>Đến ngày</span><input type="date" value={dates.to} min={dates.from || undefined} onChange={event => setDates(current => ({ ...current, to: event.target.value }))} /></label><button onClick={filterHistory}>Lọc</button></div>
    </div>
    {error && <div className="customer-empty customer-empty--error">{error}</div>}
    <div className="history-content-grid"><main>
      {loading && <div className="customer-empty">Đang tải lịch sử đặt vé...</div>}
      {!loading && !error && visibleItems.length === 0 && (tab === "UNPAID"
        ? <p className="history-empty-compact">Không có vé nào chưa thanh toán.</p>
        : <div className="customer-empty"><Film /><h2>Không có vé trong khoảng thời gian này</h2><Link to="/showtimes">Chọn suất chiếu</Link></div>)}
      <div className="ticket-history-list">{visibleItems.map(item => <article className="history-ticket" key={item.id}>
        <div className="history-ticket__status"><strong>{tab === "UNPAID" ? "CHƯA THANH TOÁN" : tab === "UPCOMING" ? "SẮP CHIẾU" : "ĐÃ XEM"}</strong><span>Mã: {item.bookingCode}</span><time>Giao dịch: {dateTime(item.createdAt)}</time></div>
        <div className="history-ticket__body"><div className="history-ticket__poster">{item.posterUrl ? <img src={toAssetUrl(item.posterUrl)} alt={item.movieTitle} /> : <Film />}</div><div className="history-ticket__info"><h2>{item.movieTitle}</h2><p><CalendarDays /> {dateTime(item.showtimeStart)}</p><p><MapPin /> Premiere Cinemas · {item.roomName}</p><p><Ticket /> Ghế đã chọn: <b>{item.seats.join(", ") || "—"}</b></p></div></div>
        <footer className="history-ticket__footer"><div><small>TỔNG TIỀN</small><strong>{money(item.totalAmount)}</strong></div><div className="history-ticket__actions">{tab === "UNPAID" ? <><button className="primary" type="button" disabled={confirmingCode === item.bookingCode} onClick={() => confirmPayment(item.bookingCode)}><QrCode /> {confirmingCode === item.bookingCode ? "Đang xác nhận..." : "Xác nhận đã thanh toán"}</button><Link to={`/booking/result/${item.bookingCode}`}><Star /> Chi tiết đơn</Link></> : <><Link className="primary" to={`/booking/result/${item.bookingCode}`}><QrCode /> Xem vé điện tử / QR</Link><Link to="/showtimes"><Clock3 /> Mua lại</Link><Link to={`/booking/result/${item.bookingCode}`}><Star /> Chi tiết đơn</Link></>}</div></footer>
      </article>)}</div>
      {data.totalPages > 1 && <nav className="customer-pagination"><button disabled={data.first} onClick={() => setPage(value => value - 1)}><ChevronLeft /> Trước</button><span>{data.number + 1} / {data.totalPages}</span><button disabled={data.last} onClick={() => setPage(value => value + 1)}>Sau <ChevronRight /></button></nav>}
    </main><aside className="history-side">
      <section><h2><QrCode /> VÉ NHANH VÀO RẠP</h2><p>Quét mã vé trên điện thoại tại cổng soát vé Premiere Cinemas.</p><div className="history-qr"><QRCodeSVG value={`${window.location.origin}/booking-history`} size={150} /><strong>{currentUser.fullName}</strong><span>Chạm để phóng to mã QR</span></div></section>
      <section><h2><ShieldCheck /> CHÍNH SÁCH VÉ &amp; LƯU Ý</h2><ul><li>Kiểm tra thông tin suất chiếu trước khi thanh toán.</li><li>Đến rạp trước giờ chiếu ít nhất 15 phút.</li><li>Không chia sẻ mã QR vé với người khác.</li></ul><a href="tel:19000000"><CircleHelp /> Hỗ trợ khách hàng</a></section>
      <section className="history-member"><Trophy /><div><h2>PREMIERE GOLD</h2><span>Tích điểm trên mỗi vé đã mua</span></div><strong>{points} điểm</strong></section>
    </aside></div>
  </section>
}

export default BookingHistoryPage
