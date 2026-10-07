import {
  useEffect,
  useState
} from 'react'

import {
  useNavigate,
  useParams
} from 'react-router-dom'

import {
  getPromotionById,
  toAssetUrl
} from '../../service/promotion/promotionService'

import type {
  Promotion
} from '../../service/promotion/promotionService'


function formatDate(
  value?: string | null
): string {
  if (!value) {
    return '-'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '-'
  }

  return new Intl.DateTimeFormat(
    'vi-VN',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
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
    new Intl.NumberFormat(
      'vi-VN'
    ).format(value) + 'đ'
  )
}

function formatDiscount(
  item?: Promotion | null
): string {
  if (!item) {
    return '-'
  }

  if (
    item.discountType ===
    'PERCENTAGE'
  ) {
    return `GIẢM ${new Intl.NumberFormat(
      'vi-VN'
    ).format(
      item.discountValue
    )}%`
  }

  return `GIẢM ${formatMoney(
    item.discountValue
  )}`
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
    INACTIVE: 'ĐÃ TẮT'
  }

  if (!status) {
    return 'KHÔNG XÁC ĐỊNH'
  }

  return (
    labels[status] ??
    status
  )
}

export function PromotionDetail() {
  const navigate =
    useNavigate()

  const { id } =
    useParams<{
      id: string
    }>()

  const [
    promotion,
    setPromotion
  ] =
    useState<Promotion | null>(
      null
    )

  const [
    loading,
    setLoading
  ] = useState(true)

  const [
    error,
    setError
  ] = useState('')

  useEffect(() => {
    if (!id) {
      setError(
        'ID khuyến mãi không hợp lệ'
      )
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    getPromotionById(id)
      .then(
        setPromotion
      )
      .catch(
        (
          err: unknown
        ) => {
          setError(
            err instanceof
              Error
              ? err.message
              : 'Không thể tải chi tiết khuyến mãi'
          )
        }
      )
      .finally(() =>
        setLoading(false)
      )
  }, [id])

  if (loading) {
    return (
      <section className="promotion-page">
        <div className="promotion-detail-simple-state promotion-state">
          Đang tải dữ liệu...
        </div>
      </section>
    )
  }

  if (
    error ||
    !promotion
  ) {
    return (
      <section className="promotion-page">
        <button
          className="promotion-back-link"
          type="button"
          onClick={() =>
            navigate(
              '/admin/promotions'
            )
          }
        >
          ← Quay lại danh sách
        </button>

        <div className="promotion-detail-simple-state promotion-state error">
          {error ||
            'Không tìm thấy chương trình khuyến mãi'}
        </div>
      </section>
    )
  }

  const usedCount =
    promotion.usedCount ??
    0

  const usageLimit =
    promotion.usageLimit ??
    null

  return (
    <section className="promotion-page promotion-detail-simple-page">
      <div className="promotion-detail-simple-card">
        <button
          className="promotion-back-link promotion-detail-simple-back"
          type="button"
          onClick={() =>
            navigate(
              '/admin/promotions'
            )
          }
        >
          ← Quay lại danh sách
        </button>

        <div className="promotion-detail-simple-body">
          <div className="promotion-detail-simple-image-wrap">
            <div className="promotion-detail-simple-image-box">
              {promotion.imageUrl ? (
                <img
                  src={toAssetUrl(
                    promotion.imageUrl
                  )}
                  alt={
                    promotion.title
                  }
                  className="promotion-detail-simple-image"
                />
              ) : (
                <div className="promotion-detail-simple-placeholder">
                  ẢNH KHUYẾN MÃI
                </div>
              )}
            </div>
          </div>

          <div className="promotion-detail-simple-content">
            <div className="promotion-detail-simple-topline">
              <span className="promotion-code-tag promotion-detail-simple-code">
                {promotion.code ||
                  `PROMOTION-${promotion.id}`}
              </span>

              <span
                className={`promotion-status ${String(
                  promotion.status ||
                  ''
                ).toLowerCase()}`}
              >
                <i />

                {getStatusLabel(
                  promotion.status
                )}
              </span>
            </div>

            <h1 className="promotion-detail-simple-title">
              {
                promotion.title
              }
            </h1>

            <div className="promotion-detail-simple-price-block">
              <strong className="promotion-detail-simple-discount">
                {formatDiscount(
                  promotion
                )}
              </strong>

              <p className="promotion-detail-simple-min-order">
                Đơn tối thiểu:{' '}
                {formatMoney(
                  promotion.minOrderAmount ??
                  0
                )}
              </p>

              {promotion.discountType ===
                'PERCENTAGE' &&
                promotion.maxDiscountAmount && (
                  <p className="promotion-detail-simple-subnote">
                    Giảm tối đa{' '}
                    {formatMoney(
                      promotion.maxDiscountAmount
                    )}
                  </p>
                )}
            </div>

            <div className="promotion-detail-simple-block">
              <span>
                Mô tả chương
                trình
              </span>

              <p>
                {promotion.description ||
                  'Chưa có mô tả cho chương trình này.'}
              </p>
            </div>

            <div className="promotion-detail-simple-block">
              <span>
                Thời gian áp
                dụng
              </span>

              <p>
                {formatDate(
                  promotion.startDate
                )}{' '}
                →{' '}
                {formatDate(
                  promotion.endDate
                )}
              </p>
            </div>

            <div className="promotion-detail-simple-block">
              <span>
                Giới hạn sử
                dụng
              </span>

              <p>
                {usedCount}

                {usageLimit
                  ? ` / ${usageLimit}`
                  : ''}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}