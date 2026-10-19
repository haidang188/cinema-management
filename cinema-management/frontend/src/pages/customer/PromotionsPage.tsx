import { Check, ChevronDown, ChevronUp, Copy, Search, TicketPercent } from "lucide-react"
import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getActivePromotions } from "../../service/customerService"
import type { CustomerPromotion } from "../../types/customer"
import { formatDate, formatVnd } from "../../utils/format"
import "./customer-pages.css"
import "./PromotionsPage.css"

type DiscountFilter = "ALL" | "PERCENTAGE" | "FIXED"

const DISCOUNT_TABS: { value: DiscountFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PERCENTAGE", label: "Giảm theo %" },
  { value: "FIXED", label: "Giảm tiền" },
]

const PAGE_SIZE = 6
const DAY_MS = 24 * 60 * 60 * 1000

function formatShortVnd(value: number) {
  return value >= 1000 && value % 1000 === 0 ? `${value / 1000}K` : formatVnd(value)
}

function getDaysLeft(endDate: string) {
  const end = new Date(endDate)
  end.setHours(23, 59, 59, 999)
  return Math.ceil((end.getTime() - Date.now()) / DAY_MS)
}

function PromotionsPage() {
  const [items, setItems] = useState<CustomerPromotion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState("")
  const [showAll, setShowAll] = useState(false)
  const [keyword, setKeyword] = useState("")
  const [discountFilter, setDiscountFilter] = useState<DiscountFilter>("ALL")

  useEffect(() => {
    getActivePromotions().then(setItems).catch((err: Error) => setError(err.message)).finally(() => setLoading(false))
  }, [])

  const copyCode = async (code: string) => {
    await navigator.clipboard.writeText(code)
    setCopied(code)
    window.setTimeout(() => setCopied(""), 1500)
  }

  const normalizedKeyword = keyword.trim().toLocaleLowerCase("vi")
  const filteredItems = items.filter(item =>
    (discountFilter === "ALL" || item.discountType === discountFilter)
    && (!normalizedKeyword || [item.title, item.code, item.description]
      .filter(Boolean).some(value => String(value).toLocaleLowerCase("vi").includes(normalizedKeyword))))
  const visibleItems = showAll ? filteredItems : filteredItems.slice(0, PAGE_SIZE)
  const hasFilters = normalizedKeyword !== "" || discountFilter !== "ALL"

  const resetFilters = () => {
    setKeyword("")
    setDiscountFilter("ALL")
    setShowAll(false)
  }

  return <div className="pm">
    <header className="pm-header">
      <div>
        <nav className="pm-crumb" aria-label="Đường dẫn trang"><Link to="/">Trang chủ</Link><span>›</span><strong>Khuyến mãi</strong></nav>
        <h1>Khuyến mãi</h1>
      </div>
      <span className="pm-status"><i />{loading ? "Đang tải..." : `${items.length} ưu đãi đang diễn ra`}</span>
    </header>

    <section className="pm-panel">
      <div className="pm-heading">
        <div className="pm-title">
          <span className="pm-step"><TicketPercent size={15} /></span>
          <div>
            <h2>Ưu đãi dành cho bạn</h2>
            <p>Sao chép mã và dán ở bước xác nhận đặt vé.</p>
          </div>
        </div>
        <label className="pm-search">
          <Search size={14} />
          <input
            type="search"
            value={keyword}
            onChange={event => { setKeyword(event.target.value); setShowAll(false) }}
            placeholder="Tìm mã hoặc tên ưu đãi..."
            aria-label="Tìm kiếm khuyến mãi"
          />
        </label>
      </div>

      <div className="pm-filters">
        <div className="pm-segment" role="group" aria-label="Loại giảm giá">
          {DISCOUNT_TABS.map(tab => <button
            key={tab.value}
            type="button"
            className={discountFilter === tab.value ? "active" : ""}
            onClick={() => { setDiscountFilter(tab.value); setShowAll(false) }}
          >{tab.label}</button>)}
        </div>
        {!loading && <span className="pm-count">{filteredItems.length} kết quả</span>}
        {hasFilters && <button type="button" className="pm-reset" onClick={resetFilters}>Xóa bộ lọc</button>}
      </div>

      {loading ? <div className="pm-grid">{Array.from({ length: 4 }, (_, index) => <div className="pm-skeleton" key={index} />)}</div>
        : error ? <div className="pm-empty pm-empty--error"><strong>Không thể tải khuyến mãi</strong><span>{error}</span></div>
          : filteredItems.length === 0 ? <div className="pm-empty">
            <strong>{items.length === 0 ? "Chưa có khuyến mãi đang hoạt động" : "Không tìm thấy khuyến mãi phù hợp"}</strong>
            <span>{items.length === 0 ? "Hãy quay lại sau để nhận ưu đãi mới." : "Thử từ khóa hoặc loại giảm giá khác."}</span>
          </div>
            : <div className="pm-grid">{visibleItems.map(item => {
              const isPercent = item.discountType === "PERCENTAGE"
              const daysLeft = getDaysLeft(item.endDate)
              const isCopied = copied === item.code

              return <article className="pm-card" key={item.id}>
                <div className="pm-card-stub">
                  <span>Giảm</span>
                  <strong>{isPercent ? `${item.discountValue}%` : formatShortVnd(item.discountValue)}</strong>
                  {daysLeft <= 7 && <em>{daysLeft <= 1 ? "Hết hạn hôm nay" : `Còn ${daysLeft} ngày`}</em>}
                </div>

                <div className="pm-card-body">
                  <h3>{item.title}</h3>
                  <p>{item.description || "Ưu đãi áp dụng cho đơn hàng đủ điều kiện."}</p>

                  <div className="pm-pills">
                    <span>HSD {formatDate(item.endDate)}</span>
                    {item.minOrderAmount ? <span>Đơn từ {formatVnd(item.minOrderAmount)}</span> : null}
                    {isPercent && item.maxDiscountAmount ? <span>Tối đa {formatVnd(item.maxDiscountAmount)}</span> : null}
                  </div>

                  <div className="pm-card-actions">
                    <button
                      type="button"
                      className={`pm-code${isCopied ? " copied" : ""}`}
                      onClick={() => copyCode(item.code)}
                      title="Bấm để sao chép mã"
                    >
                      <code>{item.code}</code>
                      {isCopied ? <Check size={13} /> : <Copy size={13} />}
                    </button>
                    <Link className="pm-btn pm-btn--primary" to="/showtimes">Dùng ngay</Link>
                  </div>
                </div>
              </article>
            })}</div>}

      {filteredItems.length > PAGE_SIZE && <button className="pm-btn pm-more" type="button" onClick={() => setShowAll(value => !value)}>
        {showAll ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        {showAll ? "Thu gọn" : `Xem thêm ${filteredItems.length - PAGE_SIZE} khuyến mãi`}
      </button>}
    </section>

    <section className="pm-panel pm-guide">
      <h2>Cách dùng mã ưu đãi</h2>
      <ol>
        <li><span className="pm-step">01</span><div><strong>Sao chép mã</strong><p>Bấm vào mã ưu đãi bạn muốn dùng.</p></div></li>
        <li><span className="pm-step">02</span><div><strong>Chọn suất chiếu &amp; ghế</strong><p>Chọn phim, suất chiếu và vị trí ghế.</p></div></li>
        <li><span className="pm-step">03</span><div><strong>Dán mã &amp; thanh toán</strong><p>Dán mã ở bước xác nhận đặt vé.</p></div></li>
      </ol>
    </section>
  </div>
}

export default PromotionsPage
