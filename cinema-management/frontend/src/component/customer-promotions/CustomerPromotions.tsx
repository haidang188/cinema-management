import { useEffect, useState } from "react"
import {
    Link,
    useParams,
    useSearchParams,
} from "react-router-dom"

import {
    getCustomerPromotion,
    getCustomerPromotions,
    type CustomerPromotion,
    type CustomerPromotionPage,
} from "../../service/promotion/customerPromotionService"

import "./customer-promotions.css"

function formatMoney(value: number | null) {
    return `${Number(value ?? 0).toLocaleString("vi-VN")} đ`
}

function formatDate(value: string) {
    return new Date(value).toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    })
}

function formatDiscount(promotion: CustomerPromotion) {
    if (promotion.discountType === "PERCENTAGE") {
        return `Giảm ${Number(promotion.discountValue ?? 0)}%`
    }

    return `Giảm ${formatMoney(promotion.discountValue)}`
}

function getErrorMessage(error: unknown) {
    return error instanceof Error
        ? error.message
        : "Không tải được khuyến mãi."
}

function PromotionImage({
    promotion,
}: {
    promotion: CustomerPromotion
}) {
    const [failed, setFailed] = useState(false)

    useEffect(() => {
        setFailed(false)
    }, [promotion.imageUrl])

    if (promotion.imageUrl && !failed) {
        return (
            <img
                src={promotion.imageUrl}
                alt={promotion.title}
                loading="lazy"
                onError={() => setFailed(true)}
            />
        )
    }

    return (
        <div className="cp-image-placeholder">
            PREMIERE CINEMAS
            <br />
            {formatDiscount(promotion)}
        </div>
    )
}

function PromotionStatus({
    promotion,
}: {
    promotion: CustomerPromotion
}) {
    const upcoming = promotion.status === "UPCOMING"

    return (
        <span
            className={`cp-status ${upcoming ? "cp-upcoming" : ""}`}
        >
            {upcoming ? "Sắp diễn ra" : "Đang áp dụng"}
        </span>
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
    const page =
        Number.isSafeInteger(rawPage) && rawPage >= 0
            ? rawPage
            : 0

    const [draft, setDraft] = useState(keyword)
    const [data, setData] =
        useState<CustomerPromotionPage | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState("")
    const [retry, setRetry] = useState(0)

    useEffect(() => {
        setDraft(keyword)
    }, [keyword])

    useEffect(() => {
        if (draft.trim() === keyword) {
            return
        }

        const timer = window.setTimeout(() => {
            const next = new URLSearchParams(params)

            if (draft.trim()) {
                next.set("q", draft.trim())
            } else {
                next.delete("q")
            }

            next.delete("page")
            setParams(next, { replace: true })
        }, 400)

        return () => window.clearTimeout(timer)
    }, [draft, keyword, params, setParams])

    useEffect(() => {
        const controller = new AbortController()

        setLoading(true)
        setError("")

        getCustomerPromotions(
            keyword,
            status,
            page,
            controller.signal,
        )
            .then((result) => {
                if (controller.signal.aborted) {
                    return
                }

                if (
                    result.totalPages > 0 &&
                    page >= result.totalPages
                ) {
                    const next = new URLSearchParams(params)

                    next.set(
                        "page",
                        String(result.totalPages - 1),
                    )

                    setParams(next, { replace: true })
                    return
                }

                setData(result)
            })
            .catch((requestError: unknown) => {
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(requestError))
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

        if (nextStatus) {
            next.set("status", nextStatus)
        } else {
            next.delete("status")
        }

        next.delete("page")
        setParams(next)
    }

    const totalPages = data?.totalPages ?? 0
    const firstPageNumber = Math.max(
        0,
        Math.min(page - 1, totalPages - 3),
    )

    const visiblePages = Array.from(
        { length: Math.min(3, totalPages) },
        (_, index) => firstPageNumber + index,
    )

    return (
        <section className="cp-page">
            <h1>Khuyến mãi</h1>

            <p>
                Khám phá ưu đãi và điều kiện áp dụng tại
                Premiere Cinemas.
            </p>

            <div className="cp-filters">
                <label>
                    Tìm khuyến mãi
                    <input
                        type="search"
                        value={draft}
                        maxLength={150}
                        placeholder="Tên hoặc mã khuyến mãi"
                        onChange={(event) => {
                            setDraft(event.target.value)
                        }}
                    />
                </label>

                <label>
                    Trạng thái
                    <select
                        value={status}
                        onChange={(event) => {
                            changeStatus(event.target.value)
                        }}
                    >
                        <option value="">Tất cả ưu đãi</option>
                        <option value="ACTIVE">Đang áp dụng</option>
                        <option value="UPCOMING">Sắp diễn ra</option>
                    </select>
                </label>
            </div>

            <div
                className="cp-progress"
                role="status"
                aria-label={
                    loading ? "Đang tải khuyến mãi" : "Đã tải"
                }
            >
                {loading && <span />}
            </div>

            {error && (
                <div className="cp-feedback" role="alert">
                    {error}{" "}
                    <button
                        type="button"
                        onClick={() => setRetry((value) => value + 1)}
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {!data && loading && (
                <p role="status">
                    Đang tải danh sách khuyến mãi…
                </p>
            )}

            {data && (
                <div aria-busy={loading}>
                    <p aria-live="polite">
                        {data.totalElements} khuyến mãi
                    </p>

                    {data.content.length === 0 ? (
                        <div className="cp-feedback">
                            Không có khuyến mãi phù hợp.
                        </div>
                    ) : (
                        <div className="cp-grid">
                            {data.content.map((promotion) => (
                                <article
                                    className="cp-card"
                                    key={promotion.id}
                                >
                                    <Link
                                        className="cp-card-image"
                                        to={`/promotions/${promotion.id}`}
                                    >
                                        <PromotionImage
                                            promotion={promotion}
                                        />
                                    </Link>

                                    <div className="cp-card-body">
                                        <PromotionStatus
                                            promotion={promotion}
                                        />

                                        <h2>{promotion.title}</h2>

                                        <strong className="cp-discount">
                                            {formatDiscount(promotion)}
                                        </strong>

                                        <p>
                                            {promotion.status === "UPCOMING"
                                                ? "Bắt đầu"
                                                : "Kết thúc"}
                                            :{" "}
                                            {formatDate(
                                                promotion.status === "UPCOMING"
                                                    ? promotion.startDate
                                                    : promotion.endDate,
                                            )}
                                        </p>

                                        <Link
                                            className="cp-button"
                                            to={`/promotions/${promotion.id}`}
                                        >
                                            Xem chi tiết
                                            <span aria-hidden="true">→</span>
                                        </Link>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <nav
                            className="cp-pagination"
                            aria-label="Phân trang khuyến mãi"
                        >
                            <button
                                type="button"
                                disabled={loading || page === 0}
                                onClick={() => changePage(0)}
                                aria-label="Trang đầu"
                            >
                                «
                            </button>

                            <button
                                type="button"
                                disabled={loading || page === 0}
                                onClick={() => changePage(page - 1)}
                                aria-label="Trang trước"
                            >
                                ‹
                            </button>

                            {visiblePages.map((pageNumber) => (
                                <button
                                    type="button"
                                    key={pageNumber}
                                    disabled={loading}
                                    aria-current={
                                        pageNumber === page
                                            ? "page"
                                            : undefined
                                    }
                                    onClick={() => changePage(pageNumber)}
                                >
                                    {pageNumber + 1}
                                </button>
                            ))}

                            <button
                                type="button"
                                disabled={
                                    loading || page >= totalPages - 1
                                }
                                onClick={() => changePage(page + 1)}
                                aria-label="Trang sau"
                            >
                                ›
                            </button>

                            <button
                                type="button"
                                disabled={
                                    loading || page >= totalPages - 1
                                }
                                onClick={() => {
                                    changePage(totalPages - 1)
                                }}
                                aria-label="Trang cuối"
                            >
                                »
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

    const [promotion, setPromotion] =
        useState<CustomerPromotion | null>(null)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(true)
    const [retry, setRetry] = useState(0)
    const [copyMessage, setCopyMessage] = useState("")

    useEffect(() => {
        const controller = new AbortController()

        setLoading(true)
        setPromotion(null)
        setError("")
        setCopyMessage("")

        if (!/^\d+$/.test(id)) {
            setError("Đường dẫn khuyến mãi không hợp lệ.")
            setLoading(false)

            return () => controller.abort()
        }

        getCustomerPromotion(id, controller.signal)
            .then((result) => {
                if (!controller.signal.aborted) {
                    setPromotion(result)
                }
            })
            .catch((requestError: unknown) => {
                if (!controller.signal.aborted) {
                    setError(getErrorMessage(requestError))
                }
            })
            .finally(() => {
                if (!controller.signal.aborted) {
                    setLoading(false)
                }
            })

        return () => controller.abort()
    }, [id, retry])

    async function copyCode() {
        if (!promotion?.code) {
            return
        }

        try {
            await navigator.clipboard.writeText(promotion.code)
            setCopyMessage("Đã sao chép mã khuyến mãi.")
        } catch {
            setCopyMessage(
                "Không thể sao chép tự động. Bạn có thể chọn và sao chép mã bên trên.",
            )
        }
    }

    return (
        <section className="cp-page">
            <Link className="cp-back" to="/promotions">
                ← Danh sách khuyến mãi
            </Link>

            {loading && (
                <p role="status">
                    Đang tải chi tiết khuyến mãi…
                </p>
            )}

            {error && (
                <div className="cp-feedback" role="alert">
                    {error}{" "}
                    <button
                        type="button"
                        onClick={() => setRetry((value) => value + 1)}
                    >
                        Thử lại
                    </button>
                </div>
            )}

            {promotion && (
                <article className="cp-detail">
                    <div className="cp-detail-image">
                        <PromotionImage promotion={promotion} />
                    </div>

                    <div>
                        <PromotionStatus promotion={promotion} />

                        <h1>{promotion.title}</h1>

                        <strong className="cp-discount">
                            {formatDiscount(promotion)}
                        </strong>

                        {promotion.code && (
                            <div className="cp-code">
                                <code>{promotion.code}</code>

                                <button
                                    type="button"
                                    onClick={copyCode}
                                >
                                    Sao chép mã
                                </button>
                            </div>
                        )}

                        <p role="status" aria-live="polite">
                            {copyMessage}
                        </p>

                        <h2>Điều kiện áp dụng</h2>

                        <dl className="cp-terms">
                            <dt>Thời gian bắt đầu</dt>
                            <dd>{formatDate(promotion.startDate)}</dd>

                            <dt>Thời gian kết thúc</dt>
                            <dd>{formatDate(promotion.endDate)}</dd>

                            <dt>Giá trị đơn tối thiểu</dt>
                            <dd>
                                {formatMoney(promotion.minOrderAmount)}
                            </dd>

                            {promotion.discountType === "PERCENTAGE" && (
                                <>
                                    <dt>Mức giảm tối đa</dt>
                                    <dd>
                                        {promotion.maxDiscountAmount == null
                                            ? "Không giới hạn"
                                            : formatMoney(
                                                promotion.maxDiscountAmount,
                                            )}
                                    </dd>
                                </>
                            )}
                        </dl>

                        <p>
                            Ưu đãi có thể kết thúc sớm khi hết lượt
                            sử dụng.
                            {promotion.status === "UPCOMING" &&
                                " Mã chỉ áp dụng từ thời gian bắt đầu chương trình."}
                        </p>

                        <h2>Nội dung khuyến mãi</h2>

                        <p className="cp-description">
                            {promotion.description ||
                                "Chưa có nội dung bổ sung."}
                        </p>
                    </div>
                </article>
            )}
        </section>
    )
}