import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { getPromotionById } from '../../service/promotion/promotionService'
import type { Promotion } from '../../service/promotion/promotionService'
import { PromotionEditor } from './PromotionCreate'

import './promotion.css'

export function PromotionEdit() {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()

    const [item, setItem] = useState<Promotion | null>(null)
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let current = true

        setLoading(true)
        setItem(null)
        setError('')

        if (!id || !/^\d+$/.test(id)) {
            setError('ID khuyến mãi không hợp lệ')
            setLoading(false)
            return
        }

        getPromotionById(id)
            .then(result => {
                if (current) setItem(result)
            })
            .catch((err: unknown) => {
                if (current) {
                    setError(
                        err instanceof Error ? err.message : 'Không thể tải khuyến mãi'
                    )
                }
            })
            .finally(() => {
                if (current) setLoading(false)
            })

        return () => {
            current = false
        }
    }, [id])

    if (loading) {
        return (
            <section className="promotion-page">
                <p role="status">Đang tải dữ liệu...</p>
            </section>
        )
    }

    if (error || !item) {
        return (
            <section className="promotion-page">
                <button
                    type="button"
                    className="promotion-back-link"
                    onClick={() => navigate('/admin/promotions')}
                >
                    ← Quay lại danh sách
                </button>

                <p role="alert" className="promotion-state error">
                    {error || 'Không tìm thấy khuyến mãi'}
                </p>
            </section>
        )
    }

    return <PromotionEditor key={item.id} promotion={item} />
}