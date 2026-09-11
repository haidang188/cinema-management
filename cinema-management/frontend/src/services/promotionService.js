import {
  API_URL,
  apiRequest
} from './apiClient'

export function toAssetUrl(path) {
  if (!path) return ''
  if (/^https?:\/\//i.test(path)) return path
  return `${API_URL}${path}`
}

export async function getPromotions({
  page = 0,
  size = 8,
  keyword = '',
  status = '',
  discountType = '',
  fromDate = '',
  toDate = '',
} = {}) {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (keyword.trim()) params.set('keyword', keyword.trim())
  if (status) params.set('status', status)
  if (discountType) params.set('discountType', discountType)
  if (fromDate) params.set('fromDate', `${fromDate}T00:00:00`)
  if (toDate) params.set('toDate', `${toDate}T23:59:59`)

  return apiRequest(`/api/admin/promotions?${params}`)
}

export async function getPromotionStatistics() {
  return apiRequest('/api/admin/promotions/statistics')
}

export async function getPromotionById(id) {
  return apiRequest(`/api/admin/promotions/${id}`)
}

export async function createPromotion(payload) {
  const formData = new FormData()

  formData.append('image', payload.image)
  formData.append('title', payload.title.trim())
  formData.append('code', payload.code.trim())
  formData.append('discountType', payload.discountType)
  formData.append('startDate', payload.startDate)
  formData.append('endDate', payload.endDate)
  formData.append('discountValue', String(payload.discountValue))
  formData.append('description', payload.description.trim())

  if (payload.minOrderAmount !== '') {
    formData.append('minOrderAmount', String(payload.minOrderAmount))
  }

  if (payload.maxDiscountAmount !== '') {
    formData.append('maxDiscountAmount', String(payload.maxDiscountAmount))
  }

  if (payload.usageLimit !== '') {
    formData.append('usageLimit', String(payload.usageLimit))
  }

  return apiRequest('/api/admin/promotions', {
    method: 'POST',
    body: formData,
  })
}
