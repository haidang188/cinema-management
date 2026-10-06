import {
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react'

import type {
  FormEvent
} from 'react'

import {
  useNavigate
} from 'react-router-dom'

import {
  createPromotion,
  updatePromotion,
  toAssetUrl
} from '../../service/promotion/promotionService'

import type {
  Promotion,
  DiscountType,
  PromotionForm,
  PromotionFormErrors
} from '../../service/promotion/promotionService'


function formatMoney(
  value:
    | string
    | number
    | null
    | undefined
): string {
  if (
    value === '' ||
    value === null ||
    value === undefined
  ) {
    return '-'
  }

  return (
    new Intl.NumberFormat(
      'vi-VN'
    ).format(
      Number(value)
    ) + 'đ'
  )
}

function formatPreviewDiscount(
  form: PromotionForm
): string {
  if (
    !form.discountValue
  ) {
    return 'Chưa nhập mức giảm'
  }

  if (
    form.discountType ===
    'PERCENTAGE'
  ) {
    return `GIẢM ${new Intl.NumberFormat(
      'vi-VN'
    ).format(
      Number(
        form.discountValue
      )
    )}%`
  }

  return `GIẢM ${formatMoney(
    form.discountValue
  ).toUpperCase()}`
}

function formatPreviewDate(
  value: string
): string {
  if (!value) {
    return '--/--/----'
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '--/--/----'
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

export function PromotionCreate() {
  return <PromotionEditor />
}

function initialForm(item?: Promotion): PromotionForm {
  return {
    title: item?.title ?? '', code: item?.code ?? '',
    discountType: item?.discountType ?? 'FIXED',
    startDate: item?.startDate ?? '', endDate: item?.endDate ?? '',
    discountValue: item?.discountValue?.toString() ?? '',
    minOrderAmount: item?.minOrderAmount?.toString() ?? '',
    maxDiscountAmount: item?.maxDiscountAmount?.toString() ?? '',
    usageLimit: item?.usageLimit?.toString() ?? '',
    description: item?.description ?? '', image: null
  }
}

export function PromotionEditor({ promotion }: { promotion?: Promotion }) {
  const editing = Boolean(promotion)
  const termsLocked = Boolean(promotion?.hasUsage)
  const submittingRef = useRef(false)
  const originalForm = useMemo(() => initialForm(promotion), [promotion])
  const navigate =
    useNavigate()

  const [
    form,
    setForm
  ] =
    useState<PromotionForm>(() => originalForm)

  const [
    errors,
    setErrors
  ] =
    useState<PromotionFormErrors>(
      {}
    )

  const [
    submitting,
    setSubmitting
  ] = useState(false)

  const [
    submittedSuccessfully,
    setSubmittedSuccessfully
  ] = useState(false)

  const previewUrl =
    useMemo(() => {
      if (!form.image) {
        return toAssetUrl(promotion?.imageUrl) || null
      }

      return URL.createObjectURL(
        form.image
      )
    }, [form.image, promotion?.imageUrl])

  useEffect(() => {
    return () => {
      if (previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(
          previewUrl
        )
      }
    }
  }, [previewUrl])

  const isDirty = JSON.stringify(form) !== JSON.stringify(originalForm) || form.image !== null

  useEffect(() => {
    function handleBeforeUnload(
      event: BeforeUnloadEvent
    ): void {
      if (
        !isDirty ||
        submittedSuccessfully
      ) {
        return
      }

      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener(
      'beforeunload',
      handleBeforeUnload
    )

    return () =>
      window.removeEventListener(
        'beforeunload',
        handleBeforeUnload
      )
  }, [
    isDirty,
    submittedSuccessfully
  ])

  function changeField<
    K extends keyof PromotionForm
  >(
    name: K,
    value: PromotionForm[K]
  ): void {
    setForm(
      (previous) => ({
        ...previous,
        [name]: value
      })
    )

    setErrors(
      (previous) => ({
        ...previous,
        [name]: undefined
      })
    )
  }

  function leaveForm(): void {
    if (submittingRef.current) return
    if (
      isDirty &&
      !submittedSuccessfully
    ) {
      const confirmed =
        window.confirm(
          'Bạn có chắc muốn rời khỏi trang? Các thay đổi chưa lưu sẽ bị mất.'
        )

      if (!confirmed) {
        return
      }
    }

    navigate(
      '/admin/promotions'
    )
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ): Promise<void> {
    event.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true

    setSubmitting(true)
    setErrors({})

    try {
      if (promotion) await updatePromotion(promotion.id, form)
      else await createPromotion(form)

      setSubmittedSuccessfully(
        true
      )

      navigate(
        '/admin/promotions',
        {
          replace: true,
          state: {
            toast: editing ? 'Chỉnh sửa thành công' : `Khuyến mãi "${form.title.trim()}" đã được tạo thành công.`
          }
        }
      )
    } catch (
    err: unknown
    ) {
      if (
        err instanceof Error
      ) {
        const requestError =
          err as Error & {
            errors?: PromotionFormErrors
          }

        setErrors({
          ...requestError.errors,
          system: `${editing ? 'Chỉnh sửa thất bại' : 'Không thể thêm khuyến mãi'}: ${requestError.message}`
        })
      } else {
        setErrors({
          system:
            editing ? 'Chỉnh sửa thất bại' : 'Không thể thêm khuyến mãi'
        })
      }
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <section className="promotion-page">
      {termsLocked && <p role="status" className="promotion-state">Khuyến mãi đã được sử dụng. Chỉ được sửa tiêu đề, mô tả và ảnh. Để thay đổi điều kiện ưu đãi, hãy tạo chương trình mới.</p>}
      <div className="promotion-page-header premium-header create-header">
        <div className="promotion-header-copy">
          <button
            className="promotion-back-link"
            type="button"
            onClick={
              leaveForm
            }
          >
            ← QUẢN LÝ
            KHUYẾN MÃI
          </button>

          <span className="promotion-eyebrow">
            PREMIERE CINEMAS /
            {editing ? 'EDIT PROMOTION' : 'CREATE PROMOTION'}
          </span>

          <h1>
            {editing ? 'Sửa đợt khuyến mãi' : 'Thêm khuyến mãi mới'}
          </h1>

          <p>
            {editing ? 'Cập nhật thông tin chương trình. Không chọn ảnh mới để giữ ảnh hiện tại.' : 'Thiết lập nội dung, điều kiện áp dụng và hình ảnh cho chương trình ưu đãi mới.'}
          </p>
        </div>
      </div>

      <form
        className="promotion-create-layout premium-create-layout"
        noValidate
        onSubmit={
          handleSubmit
        }
      >
        <div className="promotion-form-panel premium-form-panel">
          <section className="promotion-form-section">
            <div className="panel-heading panel-heading-premium">
              <div>
                <span>
                  01 / THÔNG
                  TIN CHƯƠNG
                  TRÌNH
                </span>

                <h2>
                  Nội dung cơ
                  bản
                </h2>
              </div>

              <span className="required-note">
                * Bắt buộc
              </span>
            </div>

            <div className="form-grid">
              <div className="form-group full">
                <label>
                  TIÊU ĐỀ{' '}
                  <span>*</span>
                </label>

                <input

                  disabled={submitting}
                  type="text"
                  maxLength={
                    150
                  }
                  placeholder="VD: Ưu đãi cuối tuần - Giảm giá vé xem phim"
                  value={
                    form.title
                  }
                  onChange={(
                    e
                  ) =>
                    changeField(
                      'title',
                      e.target
                        .value
                    )
                  }
                />

                {errors.title && (
                  <small className="field-error">
                    {
                      errors.title
                    }
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>
                  MÃ KHUYẾN
                  MÃI{' '}
                  <span>*</span>
                </label>

                <input

                  disabled={submitting || termsLocked}
                  type="text"
                  maxLength={50}
                  placeholder="VD: WEEKEND50"
                  value={
                    form.code
                  }
                  onChange={(
                    e
                  ) =>
                    changeField(
                      'code',
                      e.target.value
                        .toUpperCase()
                        .replace(
                          /\s+/g,
                          ''
                        )
                    )
                  }
                />

                {errors.code && (
                  <small className="field-error">
                    {
                      errors.code
                    }
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>
                  LOẠI GIẢM
                  GIÁ{' '}
                  <span>*</span>
                </label>

                <select
                  disabled={submitting || termsLocked}
                  value={
                    form.discountType
                  }
                  onChange={(
                    e
                  ) => {
                    const value =
                      e.target
                        .value as DiscountType

                    changeField(
                      'discountType',
                      value
                    )

                    if (
                      value ===
                      'FIXED'
                    ) {
                      changeField(
                        'maxDiscountAmount',
                        ''
                      )
                    }
                  }}
                >
                  <option value="FIXED">
                    Giảm số tiền
                  </option>

                  <option value="PERCENTAGE">
                    Giảm phần
                    trăm
                  </option>
                </select>

                {errors.discountType && (
                  <small className="field-error">
                    {
                      errors.discountType
                    }
                  </small>
                )}
              </div>

              <div className="form-group full">
                <label>
                  CHI TIẾT
                  CHƯƠNG TRÌNH{' '}
                  <span>*</span>
                </label>

                <textarea
                  disabled={submitting}
                  rows={6}
                  maxLength={
                    2000
                  }
                  placeholder="Nhập nội dung chi tiết của chương trình khuyến mãi..."
                  value={
                    form.description
                  }
                  onChange={(
                    e
                  ) =>
                    changeField(
                      'description',
                      e.target
                        .value
                    )
                  }
                />

                <div className="textarea-counter">
                  {
                    form
                      .description
                      .length
                  }
                  /2000 ký tự
                </div>

                {errors.description && (
                  <small className="field-error">
                    {
                      errors.description
                    }
                  </small>
                )}
              </div>
            </div>
          </section>

          <section className="promotion-form-section">
            <div className="panel-heading panel-heading-premium">
              <div>
                <span>
                  02 / THIẾT
                  LẬP ƯU ĐÃI
                </span>

                <h2>
                  Cấu hình giá
                  trị khuyến
                  mãi
                </h2>

                <p>
                  Quy định mức
                  giảm và các
                  điều kiện tối
                  thiểu khi sử
                  dụng.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>
                  MỨC GIẢM GIÁ{' '}
                  <span>*</span>
                </label>

                <div className="money-input">
                  <input
                    disabled={submitting || termsLocked}
                    type="number"
                    min="0.01"
                    step={
                      form.discountType ===
                        'PERCENTAGE'
                        ? '0.01'
                        : '1'
                    }
                    max={
                      form.discountType ===
                        'PERCENTAGE'
                        ? '100'
                        : '5000000'
                    }
                    placeholder={
                      form.discountType ===
                        'PERCENTAGE'
                        ? '20'
                        : '50000'
                    }
                    value={
                      form.discountValue
                    }
                    onChange={(
                      e
                    ) =>
                      changeField(
                        'discountValue',
                        e.target
                          .value
                      )
                    }
                  />

                  <span>
                    {form.discountType ===
                      'PERCENTAGE'
                      ? '%'
                      : 'VNĐ'}
                  </span>
                </div>

                {errors.discountValue && (
                  <small className="field-error">
                    {
                      errors.discountValue
                    }
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>
                  ĐƠN HÀNG TỐI
                  THIỂU
                </label>

                <div className="money-input">
                  <input
                    disabled={submitting || termsLocked}
                    type="number"
                    min="0"
                    step="1"
                    placeholder="VD: 200000"
                    value={
                      form.minOrderAmount
                    }
                    onChange={(
                      e
                    ) =>
                      changeField(
                        'minOrderAmount',
                        e.target
                          .value
                      )
                    }
                  />

                  <span>
                    VNĐ
                  </span>
                </div>

                {errors.minOrderAmount && (
                  <small className="field-error">
                    {
                      errors.minOrderAmount
                    }
                  </small>
                )}
              </div>

              {form.discountType ===
                'PERCENTAGE' && (
                  <div className="form-group">
                    <label>
                      GIẢM TỐI ĐA
                    </label>

                    <div className="money-input">
                      <input
                        disabled={submitting || termsLocked}
                        type="number"
                        min="0"
                        step="1"
                        placeholder="VD: 50000"
                        value={
                          form.maxDiscountAmount
                        }
                        onChange={(
                          e
                        ) =>
                          changeField(
                            'maxDiscountAmount',
                            e.target
                              .value
                          )
                        }
                      />

                      <span>
                        VNĐ
                      </span>
                    </div>

                    {errors.maxDiscountAmount && (
                      <small className="field-error">
                        {
                          errors.maxDiscountAmount
                        }
                      </small>
                    )}
                  </div>
                )}

              <div className="form-group">
                <label>
                  GIỚI HẠN SỬ
                  DỤNG
                </label>

                <input

                  disabled={submitting || termsLocked}
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Để trống nếu không giới hạn"
                  value={
                    form.usageLimit
                  }
                  onChange={(
                    e
                  ) =>
                    changeField(
                      'usageLimit',
                      e.target
                        .value
                    )
                  }
                />

                {errors.usageLimit && (
                  <small className="field-error">
                    {
                      errors.usageLimit
                    }
                  </small>
                )}
              </div>
            </div>
          </section>

          <section className="promotion-form-section">
            <div className="panel-heading panel-heading-premium">
              <div>
                <span>
                  03 / THỜI
                  GIAN ÁP DỤNG
                </span>

                <h2>
                  Lịch chạy
                  chương trình
                </h2>

                <p>
                  Thiết lập
                  chính xác
                  thời điểm bắt
                  đầu và kết
                  thúc khuyến
                  mãi.
                </p>
              </div>
            </div>

            <div className="form-grid">
              <div className="form-group">
                <label>
                  THỜI GIAN BẮT
                  ĐẦU{' '}
                  <span>*</span>
                </label>

                <input

                  disabled={submitting || termsLocked}
                  type="datetime-local"
                  step="1"
                  value={
                    form.startDate
                  }
                  onChange={(
                    e
                  ) =>
                    changeField(
                      'startDate',
                      e.target
                        .value
                    )
                  }
                />

                {errors.startDate && (
                  <small className="field-error">
                    {
                      errors.startDate
                    }
                  </small>
                )}
              </div>

              <div className="form-group">
                <label>
                  THỜI GIAN KẾT
                  THÚC{' '}
                  <span>*</span>
                </label>

                <input

                  disabled={submitting || termsLocked}
                  type="datetime-local"
                  step="1"
                  value={
                    form.endDate
                  }
                  onChange={(
                    e
                  ) =>
                    changeField(
                      'endDate',
                      e.target
                        .value
                    )
                  }
                />

                {errors.endDate && (
                  <small className="field-error">
                    {
                      errors.endDate
                    }
                  </small>
                )}
              </div>
            </div>
          </section>

          {errors.system && (
            <div className="promotion-form-error">
              {
                errors.system
              }
            </div>
          )}

          <div className="promotion-form-actions premium-form-actions">
            <div>
              <small>
                {editing ? 'Các thay đổi chỉ được lưu sau khi bạn nhấn Lưu thay đổi.' : 'Các thay đổi chỉ được lưu sau khi bạn nhấn Thêm khuyến mãi.'}
              </small>
            </div>

            <div className="promotion-action-group">
              <button
                type="button"
                className="promotion-btn promotion-btn-secondary"
                onClick={
                  leaveForm
                }
              >
                HỦY
              </button>

              <button
                type="submit"
                className="promotion-btn promotion-btn-primary"
                disabled={
                  submitting
                }
              >
                {submitting
                  ? 'ĐANG LƯU...'
                  : editing ? 'LƯU THAY ĐỔI' : '+ THÊM KHUYẾN MÃI'}
              </button>
            </div>
          </div>
        </div>

        <aside className="promotion-image-panel premium-preview-column">
          <div className="promotion-sticky-preview">
            <section className="promotion-side-card">
              <div className="panel-heading panel-heading-premium compact-heading">
                <div>
                  <span>
                    HÌNH ẢNH
                  </span>

                  <h2>
                    Ảnh khuyến
                    mãi
                  </h2>
                </div>
              </div>

              <label className="promotion-upload-area premium-upload-area">
                {previewUrl ? (
                  <img
                    src={
                      previewUrl
                    }
                    alt="Preview"
                  />
                ) : (
                  <div className="upload-placeholder">
                    <div className="upload-icon">
                      +
                    </div>

                    <strong>
                      CHỌN HÌNH
                      ẢNH
                    </strong>

                    <span>
                      JPG, PNG
                      hoặc WEBP
                    </span>

                    <small>
                      Tối đa 5MB
                      · Khuyên
                      dùng ảnh
                      16:9
                    </small>
                  </div>
                )}

                <input

                  disabled={submitting}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(
                    e
                  ) =>
                    changeField(
                      'image',
                      e.target
                        .files?.[0] ??
                      null
                    )
                  }
                />
              </label>

              {errors.image && (
                <small className="field-error">
                  {
                    errors.image
                  }
                </small>
              )}

              {form.image && (
                <div className="selected-file premium-selected-file">
                  <div>
                    <span>
                      TỆP ĐÃ
                      CHỌN
                    </span>

                    <strong>
                      {
                        form
                          .image
                          .name
                      }
                    </strong>
                  </div>

                  <small>
                    {(
                      form.image
                        .size /
                      1024 /
                      1024
                    ).toFixed(
                      2
                    )}{' '}
                    MB
                  </small>
                </div>
              )}
            </section>

            <section className="promotion-side-card preview-side-card">
              <div className="promotion-preview-heading">
                <span>
                  XEM TRƯỚC
                  CHƯƠNG TRÌNH
                </span>

                <small>
                  LIVE PREVIEW
                </small>
              </div>

              <div className="promotion-preview-card premium-preview-card">
                <div className="promotion-preview-image">
                  {previewUrl ? (
                    <img
                      src={
                        previewUrl
                      }
                      alt="Promotion preview"
                    />
                  ) : (
                    <div className="promotion-preview-placeholder">
                      <span>
                        PREMIERE
                      </span>

                      <strong>
                        CINEMAS
                      </strong>
                    </div>
                  )}

                  <span className="preview-cinema-mark">
                    PREMIERE
                    CINEMAS
                  </span>
                </div>

                <div className="promotion-preview-content">
                  <small className="preview-code">
                    {form.code ||
                      'PROMO-CODE'}
                  </small>

                  <h3>
                    {form.title ||
                      'Tên chương trình khuyến mãi'}
                  </h3>

                  <strong className="preview-discount">
                    {formatPreviewDiscount(
                      form
                    )}
                  </strong>

                  <div className="preview-divider" />

                  <div className="preview-meta-grid">
                    <div>
                      <span>
                        THỜI GIAN
                      </span>

                      <p>
                        {formatPreviewDate(
                          form.startDate
                        )}{' '}
                        →{' '}
                        {formatPreviewDate(
                          form.endDate
                        )}
                      </p>
                    </div>

                    <div>
                      <span>
                        ĐIỀU KIỆN
                      </span>

                      <p>
                        {Number(
                          form.minOrderAmount
                        ) > 0
                          ? `Đơn từ ${formatMoney(
                            form.minOrderAmount
                          )}`
                          : 'Không yêu cầu đơn tối thiểu'}
                      </p>
                    </div>

                    {form.discountType ===
                      'PERCENTAGE' &&
                      Number(
                        form.maxDiscountAmount
                      ) >
                      0 && (
                        <div>
                          <span>
                            GIẢM TỐI
                            ĐA
                          </span>

                          <p>
                            {formatMoney(
                              form.maxDiscountAmount
                            )}
                          </p>
                        </div>
                      )}

                    <div>
                      <span>
                        LƯỢT DÙNG
                      </span>

                      <p>
                        {form.usageLimit ||
                          'Không giới hạn'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </aside>
      </form>
    </section>
  )
}
