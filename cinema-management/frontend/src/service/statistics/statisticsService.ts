import { API_BASE_URL } from "../apiBase"
import { authHeaders } from "../auth/authStorage"

export type ReportType = "movies" | "members" | "genres"
export type Channel = "ALL" | "ONLINE" | "COUNTER"
export type ReportSort = "REVENUE" | "TICKETS"

export interface StatisticsFilters {
    from: string
    to: string
    channel: Channel
    sort: ReportSort
}

export interface StatisticsRow {
    id: number
    code: string | null
    name: string
    tickets: number
    revenue: number
    pointBalance: number | null
    movieCount: number | null
}

export interface StatisticsReport {
    type: ReportType
    sort: ReportSort
    summary: {
        revenue: number
        tickets: number
        bookings: number
        members: number
        unlinkedBookings: number
    }
    rows: StatisticsRow[]
}

export class StatisticsError extends Error {
    status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = "StatisticsError"
        this.status = status
    }
}

export async function getStatistics(
    type: ReportType,
    filters: StatisticsFilters,
    signal?: AbortSignal,
): Promise<StatisticsReport> {
    const query = new URLSearchParams({
        channel: filters.channel,
        sort: filters.sort,
    })

    if (filters.from) {
        query.set("from", filters.from)
    }

    if (filters.to) {
        query.set("to", filters.to)
    }

    const response = await fetch(
        `${API_BASE_URL}/admin/statistics/${type}?${query}`,
        {
            credentials: "include",
            cache: "no-store",
            headers: authHeaders(),
            signal,
        },
    )

    const data = await response.json().catch(() => null)

    if (!response.ok) {
        throw new StatisticsError(
            response.status,
            data?.message || "Không thể tải thống kê",
        )
    }

    if (!data || !Array.isArray(data.rows) || !data.summary) {
        throw new StatisticsError(
            502,
            "Dữ liệu thống kê trả về không hợp lệ",
        )
    }

    return data as StatisticsReport
}