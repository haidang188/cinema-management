import {
  API_URL,
  apiRequest
} from './apiClient'

export type DiscountType =
  | 'FIXED'
  | 'PERCENTAGE'

export type PromotionStatus =
  | 'ACTIVE'
  | 'UPCOMING'
  | 'EXPIRED'
  | 'INACTIVE'

export interface Promotion {
  id: number

  title: string

  code: string

  description: string

  discountType: DiscountType

  discountValue: number

  minOrderAmount: number | null

  maxDiscountAmount: number | null

  usageLimit: number | null

  usedCount: number | null

  startDate: string

  endDate: string

  imageUrl: string | null

  status: PromotionStatus
}

export interface PromotionStatistics {
  total: number

  active: number

  upcoming: number

  expiringSoon: number
}

export interface PromotionListResponse {
  content: Promotion[]

  page: number

  size: number

  totalElements: number

  totalPages: number

  first: boolean

  last: boolean
}

export interface PromotionQuery {
  page?: number

  size?: number

  keyword?: string

  status?: string

  discountType?: string

  fromDate?: string

  toDate?: string
}

export interface PromotionForm {
  title: string

  code: string

  discountType: DiscountType

  startDate: string

  endDate: string

  discountValue: string

  minOrderAmount: string

  maxDiscountAmount: string

  usageLimit: string

  description: string

  image: File | null
}

export type PromotionFormErrors =
  Partial<
    Record<
      keyof PromotionForm | 'system',
      string
    >
  >

/**
 * Chuyển image path Backend trả về
 * thành URL có thể sử dụng trong <img>.
 */
export function toAssetUrl(
  path?: string | null
): string {
  if (!path) {
    return ''
  }

  // Nếu Backend đã trả URL hoàn chỉnh
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const normalizedPath =
    path.startsWith('/')
      ? path
      : `/${path}`

  return `${API_URL}${normalizedPath}`
}

/**
 * GET
 * /api/admin/promotions
 *
 * Lấy danh sách promotion có phân trang,
 * tìm kiếm và filter.
 */
export async function getPromotions({
  page = 0,
  size = 8,
  keyword = '',
  status = '',
  discountType = '',
  fromDate = '',
  toDate = ''
}: PromotionQuery = {}): Promise<PromotionListResponse> {
  const params =
    new URLSearchParams({
      page: String(page),
      size: String(size)
    })

  if (keyword.trim()) {
    params.set(
      'keyword',
      keyword.trim()
    )
  }

  if (status) {
    params.set(
      'status',
      status
    )
  }

  if (discountType) {
    params.set(
      'discountType',
      discountType
    )
  }

  if (fromDate) {
    params.set(
      'fromDate',
      `${fromDate}T00:00:00`
    )
  }

  if (toDate) {
    params.set(
      'toDate',
      `${toDate}T23:59:59`
    )
  }

  return apiRequest<PromotionListResponse>(
    `/admin/promotions?${params.toString()}`
  )
}

/**
 * GET
 * /api/admin/promotions/statistics
 *
 * Lấy thống kê promotion.
 */
export async function getPromotionStatistics():
  Promise<PromotionStatistics> {
  return apiRequest<PromotionStatistics>(
    '/admin/promotions/statistics'
  )
}

/**
 * GET
 * /api/admin/promotions/{id}
 *
 * Lấy chi tiết một promotion.
 */
export async function getPromotionById(
  id: string | number
): Promise<Promotion> {
  return apiRequest<Promotion>(
    `/admin/promotions/${id}`
  )
}

/**
 * POST
 * /api/admin/promotions
 *
 * Tạo promotion mới.
 *
 * Dùng FormData vì có upload ảnh.
 */
export async function createPromotion(
  payload: PromotionForm
): Promise<Promotion> {
  const formData =
    new FormData()

  if (payload.image) {
    formData.append(
      'image',
      payload.image
    )
  }

  formData.append(
    'title',
    payload.title.trim()
  )

  formData.append(
    'code',
    payload.code.trim()
  )

  formData.append(
    'discountType',
    payload.discountType
  )

  formData.append(
    'startDate',
    payload.startDate
  )

  formData.append(
    'endDate',
    payload.endDate
  )

  formData.append(
    'discountValue',
    payload.discountValue
  )

  formData.append(
    'description',
    payload.description.trim()
  )

  if (
    payload.minOrderAmount !== ''
  ) {
    formData.append(
      'minOrderAmount',
      payload.minOrderAmount
    )
  }

  if (
    payload.maxDiscountAmount !== ''
  ) {
    formData.append(
      'maxDiscountAmount',
      payload.maxDiscountAmount
    )
  }

  if (
    payload.usageLimit !== ''
  ) {
    formData.append(
      'usageLimit',
      payload.usageLimit
    )
  }

  return apiRequest<Promotion>(
    '/admin/promotions',
    {
      method: 'POST',
      body: formData
    }
  )
}