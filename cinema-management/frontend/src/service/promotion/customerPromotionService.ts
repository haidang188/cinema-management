import { apiRequest } from './apiClient'

export interface CustomerPromotion {
    id: number
    title: string
    description: string | null
    imageUrl: string | null
    code: string | null
    discountType: string
    discountValue: number | null
    minOrderAmount: number | null
    maxDiscountAmount: number | null
    startDate: string
    endDate: string
    status: 'ACTIVE' | 'UPCOMING'
}

export interface CustomerPromotionPage {
    content: CustomerPromotion[]
    page: number
    size: number
    totalElements: number
    totalPages: number
}

export function getCustomerPromotions(
    keyword: string,
    status: string,
    page: number,
    signal: AbortSignal,
) {
    const params = new URLSearchParams({
        page: String(page),
        size: '10',
    })

    if (keyword.trim()) {
        params.set('keyword', keyword.trim())
    }

    if (status) {
        params.set('status', status)
    }

    return apiRequest<CustomerPromotionPage>(
        `/promotions?${params}`,
        { signal },
    )
}

export function getCustomerPromotion(
    id: string,
    signal: AbortSignal,
) {
    return apiRequest<CustomerPromotion>(
        `/promotions/${encodeURIComponent(id)}`,
        { signal },
    )
}