import { useEffect, useState } from "react"
import { Link, useParams, useSearchParams } from "react-router-dom"
import {
    ArrowLeft,
    ArrowRight,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    ChevronsLeft,
    ChevronsRight,
    Copy,
    Info,
    Search,
    Ticket,
} from "lucide-react"

import {
    getCustomerPromotion,
    getCustomerPromotions,
    type CustomerPromotion,
    type CustomerPromotionPage,
} from "../../service/promotion/customerPromotionService"

import "./customer-promotions.css"

function money(value: number | null) {
    return `${Number(value ?? 0).toLocaleString("vi-VN")} đ`
}

function date(value: string) {
    const parsed = new Date(value)

    return Number.isNaN(parsed.getTime())
        ? "Chưa cập nhật"
        : parsed.toLocaleString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
}

function discount(promotion: CustomerPromotion) {
    if (promotion.discountType === "PERCENTAGE") {
        return `Giảm ${Number(promotion.discountValue ?? 0)}%`
    }

    if (promotion.discountType === "FIXED") {
        return `Giảm ${money(promotion.discountValue)}`
    }

    return "Ưu đãi đặc biệt"
}

function message(error: unknown) {
    return error instanceof Error
        ? error.message
        : "Không tải được khuyến mãi."
}

function PromotionImage({
    promotion,
}: {
    promotion: CustomerPromotion
}) {
    const [failedSource, setFailedSource] = useState<string | null>(null)

    if (promotion.imageUrl && promotion.imageUrl !== failedSource) {
        return (
            <img
                src={promotion.imageUrl}
                alt={promotion.title}
                loading="lazy"
                onError={() => setFailedSource(promotion.imageUrl)}
            />
        )
    }

    return (
        <div className="offer-image-fallback">
            <Ticket size={36} aria-hidden="true" />
            <span>PREMIERE CINEMAS</span>
            <small>Ưu đãi dành cho trải nghiệm điện ảnh</small>
        </div>
    )
}

function Status({
    promotion,
}: {
    promotion: CustomerPromotion
}) {
    return (
        <span
            className={`offer-status ${promotion.status === "UPCOMING" ? "is-upcoming" : ""
                }`}
        >
            <span aria-hidden="true" />
            {promotion.status === "UPCOMING"
                ? "Sắp diễn ra"
                : "Đang áp dụng"}
        </span>
    )
}

function Feedback({
    text,
    onRetry,
}: {
    text: string
    onRetry: () => void
}) {
    return (
        <div className="offer-feedback" role="alert">
            <Info size={22} aria-hidden="true" />
            <p>{text}</p>
            <button
                type="button"
                className="offer-button"
                onClick={onRetry}
            >
                Thử lại
            </button>
        </div>
    )
}

export function CustomerPromotionList() {
    const [params, setParams] = useSearchParams()

    const keyword = params.get("q") ?? ""
    const rawStatus = params.get("status") ?? ""
    const status = ["ACTIVE", "UPCOMING"].includes(rawStatus)
        ? rawStatus
        : ""

    const rawPage = Number(params.get("page") ?? "0")
    const page = Number.isSafeInteger(rawPage) && rawPage >= 0
        ? rawPage
        : 0

    const [draft, setDraft] = useState(keyword)
    const [data, setData] = useState<CustomerPromotionPage | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [retry, setRetry] = useState(0)

    useEffect(() => {
        setDraft(keyword)
    }, [keyword])

    useEffect(() => {
        if (draft.trim() === keyword) return

        const timer = window.setTimeout(() => {
            const next = new URLSearchParams(params)

            if (draft.trim()) next.set("q", draft.trim())
            else next.delete("q")

            next.delete("page")
            setParams(next, { replace: true })
        }, 400)

        return () => window.clearTimeout(timer)
    }, [draft, keyword, params, setParams])

    useEffect(() => {
        const controller = new AbortController()

        setLoading(true)
        setError("")

        getCustomerPromotions(keyword, status, page, controller.signal)
            .then((result) => {
                if (controller.signal.aborted) return

                const lastPage = Math.max(0, result.totalPages - 1)

                if (page > lastPage) {
                    const next = new URLSearchParams(params)
                    next.set("page", String(lastPage))
                    setParams(next, { replace: true })
                    return
                }

                setData(result)
            })
            .catch((requestError: unknown) => {
                if (!controller.signal.aborted) {
                    setError(message(requestError))
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            })

        return () => controller.abort()
    }, [keyword, status, page, retry, params, setParams])

    function changePage(nextPage: number) {
        const next = new URLSearchParams(params)
        next.set("page", String(nextPage))
        setParams(next)
    }

    function changeStatus(nextStatus: string) {
        const next = new URLSearchParams(params)

        if (nextStatus) next.set("status", nextStatus)
        else next.delete("status")

        next.delete("page")
        setParams(next)
    }

    function clearFilters() {
        setDraft("")

        const next = new URLSearchParams(params)
            ;["q", "status", "page"].forEach((key) => next.delete(key))
        setParams(next)
    }

    const totalPages = data?.totalPages ?? 0
    const start = Math.max(0, Math.min(page - 1, totalPages - 3))
    const visiblePages = Array.from(
        { length: Math.min(3, totalPages) },
        (_, index) => start + index,
    )
    const query = params.toString()

    return (
        <section className="customer-offers">
            <header className="offer-page-heading">
                <span className="offer-eyebrow">PREMIERE CINEMAS</span>
                <h1>Ưu đãi cho buổi xem phim của bạn</h1>
                <p>
                    Tìm chương trình phù hợp và xem điều kiện trước khi đặt vé.
                </p>
            </header>

            <div className="offer-filters">
                <label className="offer-search">
                    <span>Tìm khuyến mãi</span>
                    <div>
                        <Search size={18} aria-hidden="true" />
                        <input
                            type="search"
                            value={draft}
                            maxLength={150}
                            placeholder="Nhập tên hoặc mã khuyến mãi"
                            onChange={(event) => setDraft(event.target.value)}
                        />
                    </div>
                </label>

                <label className="offer-select">
                    <span>Trạng thái</span>
                    <select
                        value={status}
                        onChange={(event) => changeStatus(event.target.value)}
                    >
                        <option value="">Tất cả ưu đãi</option>
                        <option value="ACTIVE">Đang áp dụng</option>
                        <option value="UPCOMING">Sắp diễn ra</option>
                    </select>
                </label>

                {(draft || status) && (
                    <button
                        type="button"
                        className="offer-reset"
                        onClick={clearFilters}
                    >
                        Xóa bộ lọc
                    </button>
                )}
            </div>

            <div
                className="offer-results-heading"
                role="status"
                aria-live="polite"
            >
                <span>
                    {loading
                        ? "Đang cập nhật ưu đãi…"
                        : error
                            ? "Chưa tải được danh sách"
                            : `${data?.totalElements ?? 0} khuyến mãi${keyword || status ? " phù hợp" : ""
                            }`}
                </span>

                {data && !error && totalPages > 0 && (
                    <span>Trang {page + 1} / {totalPages}</span>
                )}
            </div>

            <div className="offer-progress" aria-hidden="true">
                {loading && <span />}
            </div>

            {error && (
                <Feedback
                    text={error}
                    onRetry={() => setRetry((value) => value + 1)}
                />
            )}

            {!data && loading && (
                <div className="offer-grid" aria-hidden="true">
                    {Array.from({ length: 6 }, (_, index) => (
                        <div className="offer-skeleton" key={index}>
                            <div />
                            <span />
                            <span />
                        </div>
                    ))}
                </div>
            )}

            {data && !error && (
                <div aria-busy={loading}>
                    {data.content.length === 0 ? (
                        <div className="offer-empty">
                            <Ticket size={32} aria-hidden="true" />
                            <h2>Chưa có ưu đãi phù hợp</h2>
                            <p>
                                Thử tìm bằng từ khóa khác hoặc xem tất cả chương trình.
                            </p>
                            {(keyword || status) && (
                                <button
                                    type="button"
                                    className="offer-button"
                                    onClick={clearFilters}
                                >
                                    Xem tất cả ưu đãi
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="offer-grid">
                            {data.content.map((promotion) => {
                                const target =
                                    `/promotions/${promotion.id}${query ? `?${query}` : ""}`

                                return (
                                    <article className="offer-card" key={promotion.id}>
                                        <Link
                                            className="offer-card-image"
                                            to={target}
                                            aria-label={`Xem ưu đãi: ${promotion.title}`}
                                        >
                                            <PromotionImage promotion={promotion} />
                                        </Link>

                                        <div className="offer-card-body">
                                            <Status promotion={promotion} />

                                            <strong className="offer-discount">
                                                {discount(promotion)}
                                            </strong>

                                            <h2>
                                                <Link to={target}>{promotion.title}</Link>
                                            </h2>

                                            <p className="offer-card-description">
                                                {promotion.description ||
                                                    "Xem chi tiết để biết điều kiện áp dụng chương trình."}
                                            </p>

                                            <div className="offer-card-meta">
                                                <CalendarDays size={16} aria-hidden="true" />
                                                <span>
                                                    {promotion.status === "UPCOMING"
                                                        ? "Bắt đầu"
                                                        : "Kết thúc"}
                                                    :{" "}
                                                    {date(
                                                        promotion.status === "UPCOMING"
                                                            ? promotion.startDate
                                                            : promotion.endDate,
                                                    )}
                                                </span>
                                            </div>

                                            <p className="offer-minimum">
                                                Đơn tối thiểu:{" "}
                                                {promotion.minOrderAmount
                                                    ? money(promotion.minOrderAmount)
                                                    : "Không yêu cầu"}
                                            </p>

                                            <Link className="offer-card-link" to={target}>
                                                Xem chi tiết
                                                <ArrowRight size={17} aria-hidden="true" />
                                            </Link>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <nav
                            className="offer-pagination"
                            aria-label="Phân trang khuyến mãi"
                        >
                            <button
                                type="button"
                                disabled={loading || page === 0}
                                onClick={() => changePage(0)}
                                aria-label="Trang đầu"
                            >
                                <ChevronsLeft size={18} />
                            </button>

                            <button
                                type="button"
                                disabled={loading || page === 0}
                                onClick={() => changePage(page - 1)}
                                aria-label="Trang trước"
                            >
                                <ChevronLeft size={18} />
                            </button>

                            {visiblePages.map((number) => (
                                <button
                                    type="button"
                                    key={number}
                                    disabled={loading}
                                    aria-current={number === page ? "page" : undefined}
                                    onClick={() => changePage(number)}
                                >
                                    {number + 1}
                                </button>
                            ))}

                            <button
                                type="button"
                                disabled={loading || page >= totalPages - 1}
                                onClick={() => changePage(page + 1)}
                                aria-label="Trang sau"
                            >
                                <ChevronRight size={18} />
                            </button>

                            <button
                                type="button"
                                disabled={loading || page >= totalPages - 1}
                                onClick={() => changePage(totalPages - 1)}
                                aria-label="Trang cuối"
                            >
                                <ChevronsRight size={18} />
                            </button>
                        </nav>
                    )}
                </div>
            )}
        </section>
    )
}

export function CustomerPromotionDetail() {
    const { id = "" } = useParams()
    const [params] = useSearchParams()

    const [promotion, setPromotion] = useState<CustomerPromotion | null>(null)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(true)
    const [retry, setRetry] = useState(0)
    const [copyMessage, setCopyMessage] = useState("")
    const [copied, setCopied] = useState(false)
    const query = params.toString()

    useEffect(() => {
        const controller = new AbortController()

        setLoading(true)
        setPromotion(null)
        setError("")
        setCopyMessage("")
        setCopied(false)

        if (!/^\d+$/.test(id)) {
            setError("Đường dẫn khuyến mãi không hợp lệ.")
            setLoading(false)
            return () => controller.abort()
        }

        getCustomerPromotion(id, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) setPromotion(result)
            })
            .catch((requestError: unknown) => {
                if (!controller.signal.aborted) {
                    setError(message(requestError))
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false)
            })

        return () => controller.abort()
    }, [id, retry])

    async function copyCode() {
        if (!promotion?.code) return

        try {
            await navigator.clipboard.writeText(promotion.code)
            setCopied(true)
            setCopyMessage("Đã sao chép mã. Bạn có thể nhập mã khi đặt vé.")
        } catch {
            setCopied(false)
            setCopyMessage(
                "Không thể sao chép tự động. Hãy chọn mã và sao chép thủ công.",
            )
        }
    }

    return (
        <section className="customer-offers">
            <Link
                className="offer-back"
                to={`/promotions${query ? `?${query}` : ""}`}
            >
                <ArrowLeft size={17} aria-hidden="true" />
                Danh sách khuyến mãi
            </Link>

            {loading && (
                <div className="offer-detail-loading" role="status">
                    Đang tải thông tin ưu đãi…
                </div>
            )}

            {error && (
                <Feedback
                    text={error}
                    onRetry={() => setRetry((value) => value + 1)}
                />
            )}

            {promotion && (
                <article className="offer-detail">
                    <div className="offer-detail-main">
                        <header className="offer-detail-heading">
                            <Status promotion={promotion} />
                            <h1>{promotion.title}</h1>
                            <strong className="offer-discount">
                                {discount(promotion)}
                            </strong>
                        </header>

                        <div className="offer-detail-image">
                            <PromotionImage promotion={promotion} />
                        </div>

                        <section className="offer-description">
                            <h2>Về chương trình</h2>
                            <p>
                                {promotion.description ||
                                    "Chưa có nội dung bổ sung cho chương trình này."}
                            </p>
                        </section>
                    </div>

                    <aside
                        className="offer-summary"
                        aria-label="Mã ưu đãi và điều kiện áp dụng"
                    >
                        <h2>Ưu đãi của bạn</h2>

                        {promotion.code ? (
                            <div className="offer-code">
                                <span>Mã khuyến mãi</span>
                                <code>{promotion.code}</code>
                                <button
                                    type="button"
                                    className="offer-button"
                                    onClick={copyCode}
                                >
                                    {copied
                                        ? <Check size={17} aria-hidden="true" />
                                        : <Copy size={17} aria-hidden="true" />}
                                    {copied ? "Đã sao chép" : "Sao chép mã"}
                                </button>
                            </div>
                        ) : (
                            <p className="offer-note">
                                Chương trình này không có mã ưu đãi.
                            </p>
                        )}

                        <p
                            className="offer-copy-feedback"
                            role="status"
                            aria-live="polite"
                        >
                            {copyMessage}
                        </p>

                        <h3>Điều kiện áp dụng</h3>

                        <dl className="offer-terms">
                            <div>
                                <dt>Bắt đầu</dt>
                                <dd>{date(promotion.startDate)}</dd>
                            </div>
                            <div>
                                <dt>Kết thúc</dt>
                                <dd>{date(promotion.endDate)}</dd>
                            </div>
                            <div>
                                <dt>Đơn tối thiểu</dt>
                                <dd>
                                    {promotion.minOrderAmount
                                        ? money(promotion.minOrderAmount)
                                        : "Không yêu cầu"}
                                </dd>
                            </div>

                            {promotion.discountType === "PERCENTAGE" && (
                                <div>
                                    <dt>Giảm tối đa</dt>
                                    <dd>
                                        {promotion.maxDiscountAmount == null
                                            ? "Không giới hạn"
                                            : money(promotion.maxDiscountAmount)}
                                    </dd>
                                </div>
                            )}
                        </dl>

                        <div className="offer-notice">
                            <Info size={18} aria-hidden="true" />
                            <p>
                                {promotion.status === "UPCOMING"
                                    ? "Chương trình chưa bắt đầu. Mã chỉ áp dụng từ thời gian bắt đầu ưu đãi."
                                    : "Ưu đãi có thể kết thúc sớm khi hết lượt sử dụng. Điều kiện sẽ được kiểm tra khi áp dụng mã."}
                            </p>
                        </div>

                        <Link
                            className="offer-button offer-primary"
                            to="/showtimes"
                        >
                            Xem lịch chiếu
                            <ArrowRight size={17} aria-hidden="true" />
                        </Link>
                    </aside>
                </article>
            )}
        </section>
    )
}