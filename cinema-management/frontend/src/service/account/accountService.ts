import { request } from "../httpClient"
import type {
  AccountProfile,
  PointHistoryPage,
  PointSummary,
  UpdateAccountPayload,
} from "../../types/account"

export const getAccount = (userId: number) =>
  request<AccountProfile>(`/api/account/${userId}`)

export const updateAccount = (userId: number, payload: UpdateAccountPayload) =>
  request<AccountProfile>(`/api/account/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  })

export const requestAccountDeletion = (userId: number, password: string, reason: string) =>
  request<AccountProfile>(`/api/account/${userId}/deletion`, {
    method: "POST",
    body: JSON.stringify({ password, reason }),
  })

export const restoreAccount = (userId: number, password: string) =>
  request<AccountProfile>(`/api/account/${userId}/restore`, {
    method: "POST",
    body: JSON.stringify({ password }),
  })

export const getPointSummary = (userId: number) =>
  request<PointSummary>(`/api/account/${userId}/points`)

export const getPointHistory = (userId: number, page = 0, size = 10) =>
  request<PointHistoryPage>(`/api/account/${userId}/points/history?page=${page}&size=${size}`)
