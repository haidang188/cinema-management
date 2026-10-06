import './promotion.css'
import {
  useEffect,
  useRef,
  useState
} from 'react'

import {
  useNavigate,
  useParams
} from 'react-router-dom'

import {
  getPromotionById,
  deletePromotion,
  setPromotionEnabled,
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
      year: 'numeric', hour: '2-digit', minute: '2-digit'
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

export function PromotionDetail({ deleteMode = false }: { deleteMode?: boolean }) {
  const [deleting, setDeleting] = useState(false)
  const deletingRef = useRef(false)
  const [deleteError, setDeleteError] = useState('')
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
    let current = true
    setDeleteError('')
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
      .then(result => { if (current) setPromotion(result) })
      .catch(
        (
          err: unknown
        ) => {
          if (!current) return
          setError(
            err instanceof
              Error
              ? err.message
              : 'Không thể tải chi tiết khuyến mãi'
          )
        }
      )
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [id])

  async function handleDelete() {
    if (!id || deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    setDeleteError('')
    try {
      await deletePromotion(id)
      navigate('/admin/promotions', { replace: true, state: { toast: 'Xóa đợt khuyến mãi thành công' } })
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Không thể xóa khuyến mãi')
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  async function handleToggle() {
    if (!id || deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    setDeleteError('')
    try {
      const updated = await setPromotionEnabled(id, promotion?.status === 'INACTIVE')
      setPromotion(updated)
      navigate('/admin/promotions', { replace: true, state: { toast: updated.status === 'INACTIVE' ? 'Đã tắt khuyến mãi' : 'Đã bật khuyến mãi' } })
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Không thể cập nhật trạng thái')
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

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
        {deleteMode && <div className="promotion-delete-heading">
          <h1>{promotion.hasUsage ? 'Ngừng áp dụng khuyến mãi' : 'Xóa đợt khuyến mãi'}</h1>
          <p>{promotion.hasUsage ? 'Chương trình đã được sử dụng nên không thể xóa. Bạn có thể tắt để ngừng áp dụng.' : 'Kiểm tra thông tin bên dưới trước khi xác nhận xóa. Thao tác này không thể hoàn tác.'}</p>
        </div>}
        <button
          className="promotion-back-link promotion-detail-simple-back"
          disabled={deleting}
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
        <div className="promotion-form-actions">
          {deleteMode ? <div>
            {deleteError && <p role="alert" className="promotion-form-error">{deleteError}</p>}
            {promotion.hasUsage && <p>Đã có giao dịch sử dụng chương trình này.{promotion.status === 'INACTIVE' ? ' Chương trình đã tắt.' : ''}</p>}
            <div className="promotion-action-group">
              <button type="button" className="promotion-btn promotion-btn-secondary" disabled={deleting}
                onClick={() => navigate('/admin/promotions')}>QUAY LẠI</button>
              <button type="button" className="promotion-btn promotion-btn-danger" disabled={deleting || (promotion.hasUsage && promotion.status === 'INACTIVE')}
                onClick={promotion.hasUsage ? handleToggle : handleDelete}>{deleting ? 'ĐANG XỬ LÝ...' : promotion.hasUsage ? 'TẮT KHUYẾN MÃI' : 'XÁC NHẬN XÓA'}</button>
            </div>
          </div> : <div className="promotion-detail-actions">
            <div className="promotion-action-group">
              <button type="button" className="promotion-btn promotion-btn-primary"
                onClick={() => navigate(`/admin/promotions/${id}/edit`)}>Chỉnh sửa</button>
              {promotion.hasUsage && promotion.status === 'INACTIVE' ? (
                <button type="button" className="promotion-btn promotion-btn-secondary" disabled={deleting}
                  onClick={handleToggle}>{deleting ? 'Đang xử lý...' : 'Bật lại'}</button>
              ) : (
                <button type="button"
                  className={`promotion-btn ${promotion.hasUsage ? 'promotion-btn-secondary' : 'promotion-btn-danger'}`}
                  onClick={() => navigate(`/admin/promotions/${id}/delete`)}>
                  {promotion.hasUsage ? 'Ngừng áp dụng' : 'Xóa khuyến mãi'}
                </button>
              )}
            </div>
            {promotion.hasUsage && (
              <p className="promotion-action-note">
                Khuyến mãi đã được sử dụng nên không thể xóa.
                {promotion.status === 'INACTIVE'
                  ? ' Chương trình hiện đã ngừng áp dụng; bật lại chỉ có hiệu lực nếu còn thời hạn và lượt dùng.'
                  : ' Ngừng áp dụng sẽ không ảnh hưởng đến các giao dịch trước đó.'}
              </p>
            )}
            {deleteError && <p role="alert" className="promotion-form-error">{deleteError}</p>}
          </div>}
        </div>
      </div>
    </section>
  )
}
