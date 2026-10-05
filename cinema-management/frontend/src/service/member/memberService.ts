import { request } from "../httpClient"
import type { Member, MemberListItem, MemberStatistics, PageResponse, UpdateMemberRequest } from "../../types/admin"

interface MemberSearchParams {
  page?: number
  size?: number
  keyword?: string
  status?: string
}

export function getMembers({
  page = 0,
  size = 10,
  keyword = "",
  status = "",
}: MemberSearchParams = {}): Promise<PageResponse<MemberListItem>> {
  const params = new URLSearchParams({
    page: String(page),
    size: String(size),
  })

  if (keyword.trim()) {
    params.set("keyword", keyword.trim())
  }
  if (status) {
    params.set("status", status)
  }

  return request<PageResponse<MemberListItem>>(`/api/admin/members?${params.toString()}`)
}

export function getMember(id: number | string): Promise<Member> {
  return request<Member>(`/api/admin/members/${id}`)
}

export function getMemberStatistics(): Promise<MemberStatistics> {
  return request<MemberStatistics>("/api/admin/members/statistics")
}

export function updateMember(id: number | string, data: UpdateMemberRequest): Promise<Member> {
  return request<Member>(`/api/admin/members/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}
