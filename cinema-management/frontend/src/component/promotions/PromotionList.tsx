import {
  useEffect,
  useMemo,
  useState
} from 'react'

import {
  useLocation,
  useNavigate
} from 'react-router-dom'

import {
  getPromotions,
  getPromotionStatistics,
  toAssetUrl
} from '../../service/promotion/promotionService'

import type {
  Promotion,
  PromotionListResponse,
  PromotionStatistics
} from '../../service/promotion/promotionService'


import './promotion.css'

interface PromotionLocationState {
  toast?: string
}

function readSavedFilters(): Record<string, unknown> {
  try {
    return JSON.parse(window.sessionStorage.getItem('promotion-list-filters') || '{}') as Record<string, unknown>
  } catch {
    return {}
  }
}

function formatDate(
  value?: string | null
): string {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }
  ).format(date)
}

function formatMoney(
  value?: number | null
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return '-'
  }

  return (
    new Intl.NumberFormat('vi-VN')
      .format(value) + 'đ'
  )
}

function formatDiscount(
  item: Promotion
): string {
  if (
    item.discountValue === null ||
    item.discountValue === undefined
  ) {
    return '-'
  }

  if (
    item.discountType ===
    'PERCENTAGE'
  ) {
    return `${new Intl.NumberFormat(
      'vi-VN'
    ).format(item.discountValue)
      }%`
  }

  return formatMoney(
    item.discountValue
  )
}

function getStatusLabel(
  status?: string | null
): string {
  const labels: Record<
    string,
    string
  > = {
    ACTIVE: 'ĐANG ÁP DỤNG',
    UPCOMING: 'SẮP DIỄN RA',
    EXPIRED: 'ĐÃ HẾT HẠN',
    INACTIVE: 'ĐÃ TẮT',
    FULL: 'HẾT LƯỢT'
  }

  if (!status) {
    return 'KHÔNG XÁC ĐỊNH'
  }

  return (
    labels[status] ??
    status
  )
}

function getVisiblePages(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 0) return []
  const count = Math.min(3, totalPages)
  const start = Math.max(0, Math.min(currentPage - 1, totalPages - count))
  return Array.from({ length: count }, (_, index) => start + index)
}

export function PromotionList() {
  const [savedFilters] = useState(readSavedFilters)
  const navigate =
    useNavigate()

  const location =
    useLocation()

  const locationState =
    location.state as PromotionLocationState | null

  const [data, setData] =
    useState<PromotionListResponse | null>(
      null
    )

  const [
    statistics,
    setStatistics
  ] =
    useState<PromotionStatistics | null>(
      null
    )

  const [
    keyword,
    setKeyword
  ] = useState(typeof savedFilters.keyword === 'string' ? savedFilters.keyword : '')

  const [
    status,
    setStatus
  ] = useState(typeof savedFilters.status === 'string' ? savedFilters.status : '')

  const [
    discountType,
    setDiscountType
  ] = useState(typeof savedFilters.discountType === 'string' ? savedFilters.discountType : '')

  const [
    fromDate,
    setFromDate
  ] = useState(typeof savedFilters.fromDate === 'string' ? savedFilters.fromDate : '')

  const [
    toDate,
    setToDate
  ] = useState(typeof savedFilters.toDate === 'string' ? savedFilters.toDate : '')

  const [
    page,
    setPage
  ] = useState(typeof savedFilters.page === 'number' && savedFilters.page >= 0 ? savedFilters.page : 0)

  const [
    pageSize,
    setPageSize
  ] = useState([10, 20, 50, 100].includes(Number(savedFilters.pageSize)) ? Number(savedFilters.pageSize) : 10)

  useEffect(() => {
    window.sessionStorage.setItem('promotion-list-filters', JSON.stringify({
      keyword, status, discountType, fromDate, toDate, page, pageSize
    }))
  }, [keyword, status, discountType, fromDate, toDate, page, pageSize])

  const [
    loading,
    setLoading
  ] = useState(false)

  const [debouncedKeyword, setDebouncedKeyword] = useState(keyword)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedKeyword(keyword), 400)
    return () => window.clearTimeout(timer)
  }, [keyword])

  const [
    error,
    setError
  ] = useState('')

  const [
    toast,
    setToast
  ] = useState(
    locationState?.toast ?? ''
  )

  useEffect(() => {
    getPromotionStatistics()
      .then(setStatistics)
      .catch(() =>
        setStatistics(null)
      )
  }, [])

  useEffect(() => {
    const state =
      location.state as PromotionLocationState | null

    if (!state?.toast) {
      return
    }

    setToast(
      state.toast
    )

    navigate(
      location.pathname,
      {
        replace: true,
        state: {}
      }
    )
  }, [
    location.pathname,
    location.state,
    navigate
  ])

  useEffect(() => {
    if (!toast) {
      return
    }

    const timer =
      window.setTimeout(
        () =>
          setToast(''),
        3500
      )

    return () =>
      window.clearTimeout(
        timer
      )
  }, [toast])

  useEffect(() => {
    let current = true
    if (keyword !== debouncedKeyword) return () => { current = false }
    setLoading(true)
    setError('')
    getPromotions({
      page, size: pageSize, keyword: debouncedKeyword,
      status, discountType, fromDate, toDate
    }).then(result => {
      if (!current) return
      setData(result)
      if (result.totalPages > 0 && page >= result.totalPages) {
        setPage(result.totalPages - 1)
      }
    }).catch((err: unknown) => {
      if (current) setError(err instanceof Error ? err.message : 'Không thể tải dữ liệu')
    }).finally(() => {
      if (current) setLoading(false)
    })
    return () => { current = false }
  }, [keyword, debouncedKeyword, status, discountType, fromDate, toDate, page, pageSize])

  const visiblePages =
    useMemo(
      () =>
        getVisiblePages(
          data?.page ?? 0,
          data?.totalPages ??
          0
        ),
      [
        data?.page,
        data?.totalPages
      ]
    )

  const firstItem =
    data?.totalElements
      ? data.page *
      data.size +
      1
      : 0

  const lastItem =
    data?.totalElements
      ? Math.min(
        (data.page + 1) *
        data.size,
        data.totalElements
      )
      : 0

  function resetFilters(): void {
    setKeyword('')
    setDebouncedKeyword('')
    setStatus('')
    setDiscountType('')
    setFromDate('')
    setToDate('')
    setPage(0)
  }

  return (
    <section className="promotion-page">
      {toast && (
        <div className="promotion-toast success">
          ✓ {toast}
        </div>
      )}

      <div className="promotion-page-header premium-header">
        <div className="promotion-header-copy">
          <span className="promotion-eyebrow">
            PREMIERE CINEMAS /
            PROMOTIONS
          </span>

          <h1>
            Quản lý khuyến mãi
          </h1>
        </div>

        <button
          type="button"
          className="promotion-btn promotion-btn-primary promotion-header-cta"
          onClick={() =>
            navigate(
              '/admin/promotions/create'
            )
          }
        >
          <span className="plus-icon">
            +
          </span>

          THÊM KHUYẾN MÃI
        </button>
      </div>

      <div className="promotion-section-heading">
        <div>
          <span className="promotion-section-kicker">
            OVERVIEW
          </span>

          <h2>
            Tổng quan chương
            trình
          </h2>
        </div>

        <p>
          Dữ liệu tổng hợp
          trên toàn bộ hệ
          thống.
        </p>
      </div>

      <div className="promotion-stat-grid promotion-stat-grid-four">
        <article className="promotion-stat-card">
          <div className="promotion-stat-topline">
            <span>
              TỔNG KHUYẾN MÃI
            </span>
            <i>01</i>
          </div>

          <strong>
            {statistics?.total ??
              '--'}
          </strong>

          <small>
            Chương trình toàn
            hệ thống
          </small>
        </article>

        <article className="promotion-stat-card accent">
          <div className="promotion-stat-topline">
            <span>
              ĐANG ÁP DỤNG
            </span>
            <i>02</i>
          </div>

          <strong>
            {statistics?.active ??
              '--'}
          </strong>

          <small>
            Khuyến mãi còn
            hiệu lực
          </small>
        </article>

        <article className="promotion-stat-card">
          <div className="promotion-stat-topline">
            <span>
              SẮP DIỄN RA
            </span>
            <i>03</i>
          </div>

          <strong>
            {statistics?.upcoming ??
              '--'}
          </strong>

          <small>
            Chương trình chưa
            bắt đầu
          </small>
        </article>

        <article className="promotion-stat-card">
          <div className="promotion-stat-topline">
            <span>
              SẮP HẾT HẠN
            </span>
            <i>04</i>
          </div>

          <strong>
            {statistics?.expiringSoon ??
              '--'}
          </strong>

          <small>
            Kết thúc trong 7
            ngày
          </small>
        </article>
      </div>

      <div className="promotion-section-heading promotion-list-heading">
        <div>
          <span className="promotion-section-kicker">
            PROMOTION DIRECTORY
          </span>

          <h2>
            Danh sách khuyến
            mãi
          </h2>
        </div>

        <p>
          Tìm kiếm và lọc
          nhanh chương trình
          theo nhu cầu quản
          trị.
        </p>
      </div>

      <div className="promotion-directory-panel">
        <div className="promotion-toolbar promotion-toolbar-advanced">
          <div className="promotion-search premium-search">
            <span className="search-icon">
              ⌕
            </span>

            <input
              type="text"
              placeholder="Tìm theo tên, mô tả hoặc mã khuyến mãi..."
              value={keyword}
              onChange={(
                e
              ) => {
                setKeyword(
                  e.target.value
                )
                setPage(0)
              }}
            />
          </div>

          <div className="promotion-filter-row">
            <div className="promotion-filter-field">
              <label>
                TRẠNG THÁI
              </label>

              <select
                className="promotion-filter-control"
                value={status}
                onChange={(
                  e
                ) => {
                  setStatus(
                    e.target.value
                  )
                  setPage(0)
                }}
              >
                <option value="">
                  Tất cả trạng
                  thái
                </option>

                <option value="UPCOMING">
                  Sắp diễn ra
                </option>

                <option value="ACTIVE">
                  Đang áp dụng
                </option>

                <option value="EXPIRED">
                  Đã hết hạn
                </option>

                <option value="INACTIVE">
                  Đã tắt
                </option>
                <option value="FULL">Hết lượt</option>
              </select>
            </div>

            <div className="promotion-filter-field">
              <label>
                LOẠI GIẢM
              </label>

              <select
                className="promotion-filter-control"
                value={
                  discountType
                }
                onChange={(
                  e
                ) => {
                  setDiscountType(
                    e.target.value
                  )
                  setPage(0)
                }}
              >
                <option value="">
                  Tất cả loại
                  giảm
                </option>

                <option value="FIXED">
                  Giảm số tiền
                </option>

                <option value="PERCENTAGE">
                  Giảm phần
                  trăm
                </option>
              </select>
            </div>

            <div className="promotion-filter-field">
              <label>
                GIAO VỚI KHOẢNG TỪ
              </label>

              <input
                className="promotion-filter-control date"
                type="date"
                value={fromDate}
                onChange={(
                  e
                ) => {
                  setFromDate(
                    e.target.value
                  )
                  setPage(0)
                }}
              />
            </div>

            <div className="promotion-filter-field">
              <label>
                ĐẾN NGÀY
              </label>

              <input
                className="promotion-filter-control date"
                type="date"
                value={toDate}
                onChange={(
                  e
                ) => {
                  setToDate(
                    e.target.value
                  )
                  setPage(0)
                }}
              />
            </div>

            <button
              type="button"
              className="promotion-btn promotion-btn-secondary promotion-reset-btn"
              onClick={
                resetFilters
              }
            >
              ĐẶT LẠI
            </button>
          </div>
        </div>

        <div className="promotion-table-panel premium-table-panel">
          {loading && <div className="promotion-loading-bar" role="status" aria-label="Đang cập nhật kết quả" />}
          {loading && !data && <div className="promotion-state">Đang tải dữ liệu...</div>}

          {error && (
            <div className="promotion-state error">
              {error}
            </div>
          )}

          {!loading &&
            !error &&
            data?.content
              ?.length === 0 && (
              <div className="promotion-state">
                Không tìm thấy
                chương trình
                khuyến mãi phù
                hợp.
                <button type="button" className="promotion-btn promotion-btn-secondary promotion-empty-reset"
                  onClick={resetFilters}>Xóa bộ lọc</button>
              </div>
            )}

          {data &&
            data.content.length >
            0 && (
              <>
                <div className={`promotion-table-wrapper${loading ? ' is-updating' : ''}`} aria-busy={loading}>
                  <table className="promotion-table promotion-table-modern">
                    <thead>
                      <tr>
                        <th>
                          KHUYẾN
                          MÃI
                        </th>

                        <th>
                          THỜI
                          GIAN
                        </th>

                        <th>
                          ƯU ĐÃI
                        </th>

                        <th>
                          SỬ DỤNG
                        </th>

                        <th>
                          TRẠNG
                          THÁI
                        </th>

                        <th>THAO TÁC</th>
                      </tr>
                    </thead>

                    <tbody>
                      {data.content.map(
                        (
                          item
                        ) => {
                          const usagePercent =
                            item.usageLimit
                              ? Math.min(
                                100,
                                ((item.usedCount ??
                                  0) /
                                  item.usageLimit) *
                                100
                              )
                              : 0

                          return (
                            <tr
                              key={
                                item.id
                              }
                            >
                              <td data-label="Khuyến mãi">
                                <div className="promotion-main-cell">
                                  <div className="promotion-image-box promotion-image-box-wide">
                                    {item.imageUrl ? (
                                      <img
                                        src={toAssetUrl(
                                          item.imageUrl
                                        )}
                                        alt={
                                          item.title
                                        }
                                      />
                                    ) : (
                                      <span>
                                        NO
                                        IMAGE
                                      </span>
                                    )}
                                  </div>

                                  <div className="promotion-title-cell promotion-title-cell-rich">
                                    <span className="promotion-code-tag">
                                      {item.code ||
                                        `ID #${String(
                                          item.id
                                        ).padStart(
                                          3,
                                          '0'
                                        )}`}
                                    </span>

                                    <strong>
                                      {
                                        item.title
                                      }
                                    </strong>


                                  </div>
                                </div>
                              </td>

                              <td data-label="Thời gian">
                                <div className="promotion-date-cell promotion-date-cell-modern">
                                  <span><small>Bắt đầu</small>{formatDate(item.startDate)}</span>
                                  <span><small>Kết thúc</small>{formatDate(item.endDate)}</span>
                                </div>
                              </td>

                              <td data-label="Ưu đãi">
                                <div className="promotion-discount-cell promotion-discount-cell-modern">
                                  <strong className="discount-value">
                                    {formatDiscount(
                                      item
                                    )}
                                  </strong>

                                  <small>
                                    {(item.minOrderAmount ??
                                      0) >
                                      0
                                      ? `Đơn từ ${formatMoney(
                                        item.minOrderAmount
                                      )}`
                                      : 'Không yêu cầu đơn tối thiểu'}
                                  </small>
                                </div>
                              </td>

                              <td data-label="Sử dụng">
                                <div className="promotion-usage-cell promotion-usage-cell-modern">
                                  <div className="promotion-usage-copy">
                                    <strong>
                                      {item.usedCount ??
                                        0}
                                    </strong>

                                    <span>
                                      {' '}
                                      /{' '}
                                      {item.usageLimit ??
                                        '∞'}
                                    </span>
                                  </div>

                                  {item.usageLimit && (
                                    <div className="promotion-usage-track">
                                      <span
                                        style={{
                                          width: `${usagePercent}%`
                                        }}
                                      />
                                    </div>
                                  )}
                                </div>
                              </td>

                              <td data-label="Trạng thái">
                                <span
                                  className={`promotion-status ${String(
                                    item.status ||
                                    ''
                                  ).toLowerCase()}`}
                                >
                                  <i />

                                  {getStatusLabel(
                                    item.status
                                  )}
                                </span>
                              </td>

                              <td data-label="Thao tác">
                                <button
                                  className="promotion-view-link promotion-detail-link"
                                  aria-label={`Xem chi tiết ${item.title}`}
                                  type="button"
                                  onClick={() =>
                                    navigate(
                                      `/admin/promotions/${item.id}`
                                    )
                                  }
                                >
                                  Xem chi tiết{' '}
                                  <span>
                                    →
                                  </span>
                                </button>
                              </td>
                            </tr>
                          )
                        }
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="promotion-pagination promotion-pagination-modern">
                  <div className="pagination-summary pagination-summary-rich">
                    <span>
                      Hiển thị{' '}
                      <strong>
                        {
                          firstItem
                        }
                        –
                        {
                          lastItem
                        }
                      </strong>{' '}
                      trong{' '}
                      <strong>
                        {
                          data.totalElements
                        }
                      </strong>{' '}
                      khuyến mãi
                    </span>

                    <select
                      className="promotion-page-size"
                      value={
                        pageSize
                      }
                      onChange={(
                        e
                      ) => {
                        setPageSize(
                          Number(
                            e
                              .target
                              .value
                          )
                        )

                        setPage(
                          0
                        )
                      }}
                    >
                      <option value="10">
                        10 / trang
                      </option>

                      <option value="20">
                        20 / trang
                      </option>

                      <option value="50">
                        50 / trang
                      </option>
                      <option value="100">100 / trang</option>
                    </select>
                  </div>

                  <div className="pagination-buttons" aria-label="Phân trang">
                    <button type="button" aria-label="Trang đầu" title="Trang đầu"
                      disabled={loading || data.first} onClick={() => setPage(0)}>«</button>
                    <button type="button" aria-label="Trang trước" title="Trang trước"
                      disabled={loading || data.first} onClick={() => setPage(Math.max(0, data.page - 1))}>‹</button>
                    {visiblePages.map(pageNumber => (
                      <button type="button" key={pageNumber}
                        aria-label={`Trang ${pageNumber + 1}`}
                        aria-current={pageNumber === data.page ? 'page' : undefined}
                        className={pageNumber === data.page ? 'current' : ''}
                        disabled={loading}
                        onClick={() => setPage(pageNumber)}>{pageNumber + 1}</button>
                    ))}
                    <button type="button" aria-label="Trang sau" title="Trang sau"
                      disabled={loading || data.last} onClick={() => setPage(data.page + 1)}>›</button>
                    <button type="button" aria-label="Trang cuối" title="Trang cuối"
                      disabled={loading || data.last} onClick={() => setPage(data.totalPages - 1)}>»</button>
                  </div>
                </div>
              </>
            )}
        </div>
      </div>
    </section>
  )
}
