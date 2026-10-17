import { CalendarDays, ChevronDown, ChevronUp, Copy, Gift, Search, TicketPercent } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getActivePromotions } from "../../service/customerService"
import type { CustomerPromotion } from "../../types/customer"
import "./customer-pages.css"

const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)
const date = (value: string) => new Date(value).toLocaleDateString("vi-VN")

function PromotionsPage() {
  const [items, setItems] = useState<CustomerPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [keyword, setKeyword] = useState("")

  useEffect(() => {
    getActivePromotions().then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    window.setTimeout(() => setCopied(""), 1500)
  }

  const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi")
  const filteredItems = items.filter(item => !normalizedKeyword || [item.title, item.code, item.description]
    .filter(Boolean).some(value => String(value).toLocaleLowerCase("vi").includes(normalizedKeyword)))

  return <section className="customer-page">
    <nav className="promotion-breadcrumb page-breadcrumb" aria-label="Đường dẫn trang"><Link to="/">Trang chủ</Link><span>›</span><strong>Khuyến mãi</strong></nav>
    <header className="customer-page__hero"><TicketPercent /><div><p>Ưu đãi dành cho bạn</p><h1>Khuyến mãi đang diễn ra</h1><span>Chọn mã phù hợp và áp dụng ở bước xác nhận đặt vé.</span></div></header>
    <label className="promotion-search"><Search /><input type="search" value={keyword} onChange={event => { setKeyword(event.target.value); setShowAll(false) }} placeholder="Tìm kiếm mã ưu đãi, voucher (ví dụ: COUPLE25, STUDENT30...)" /></label>
    {loading && <div className="customer-empty">Đang tải khuyến mãi...</div>}
    {error && <div className="customer-empty customer-empty--error">{error}</div>}
    {!loading && !error && items.length === 0 && <div className="customer-empty"><Gift /><h2>Chưa có khuyến mãi đang hoạt động</h2></div>}
    {!loading && !error && filteredItems.length === 0 && items.length > 0 && <div className="customer-empty"><Search /><h2>Không tìm thấy khuyến mãi phù hợp</h2></div>}
    <div className="promotion-grid">{filteredItems.slice(0, showAll ? filteredItems.length : 6).map((item, index) => <article className={`promotion-card promotion-card--${index % 4}`} key={item.id}>
      <div className="promotion-card__icon"><Gift /></div>
      <div className="promotion-card__body">
        <div className="promotion-card__value">{item.discountType === "PERCENTAGE" ? `Giảm ${item.discountValue}%` : `Giảm ${money(item.discountValue)}`}</div>
        <h2>{item.title}</h2><p>{item.description || "Ưu đãi áp dụng cho đơn hàng đủ điều kiện."}</p>
        <div className="promotion-card__terms"><span><CalendarDays size={14} /> Hạn dùng: <b>{date(item.endDate)}</b></span>{item.minOrderAmount ? <span>Đơn tối thiểu: <b>{money(item.minOrderAmount)}</b></span> : null}</div>
        <div className="promotion-card__actions"><code>{item.code}</code><button type="button" onClick={() => copyCode(item.code)}><Copy size={14} /> {copied === item.code ? "Đã chép" : "Sao chép"}</button><Link to="/showtimes">Dùng ngay</Link></div>
      </div>
    </article>)}</div>
    {filteredItems.length > 6 && <button className="promotion-more" type="button" onClick={() => setShowAll(value => !value)}>{showAll ? <ChevronUp /> : <ChevronDown />}{showAll ? "Thu gọn" : `Xem thêm ${filteredItems.length - 6} khuyến mãi`}</button>}
    <section className="promotion-guide">
      <h2>HƯỚNG DẪN ÁP DỤNG MÃ ƯU ĐÃI TRONG 3 BƯỚC</h2>
      <div>
        <article><b>01</b><strong>Chọn &amp; Sao Chép Mã</strong><p>Nhấn “Sao chép” mã ưu đãi bạn muốn sử dụng.</p></article>
        <article><b>02</b><strong>Chọn Suất Chiếu &amp; Ghế</strong><p>Lựa chọn bộ phim, suất chiếu và vị trí ghế mong muốn.</p></article>
        <article><b>03</b><strong>Dán Mã &amp; Thanh Toán</strong><p>Dán mã ở bước xác nhận đặt vé và tiến hành thanh toán.</p></article>
      </div>
    </section>
  </section>
}

export default PromotionsPage
