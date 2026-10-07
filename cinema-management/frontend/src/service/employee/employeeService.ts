import { request } from "../httpClient"
import type {
  CreateEmployeeRequest,
  Employee,
  EmployeeListItem,
  PageResponse,
  UpdateEmployeeRequest,
} from "../../types/admin"

interface EmployeeSearchParams {
  page?: number
  size?: number
  keyword?: string
  status?: string
}

export function getEmployees({
  page = 0,
  size = 10,
  keyword = "",
  status = "",
}: EmployeeSearchParams = {}): Promise<PageResponse<EmployeeListItem>> {
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

  return request<PageResponse<EmployeeListItem>>(`/api/admin/employees?${params.toString()}`)
}

export function getEmployee(id: string): Promise<Employee> {
  return request<Employee>(`/api/admin/employees/${id}`)
}

export function createEmployee(data: CreateEmployeeRequest): Promise<Employee> {
  return request<Employee>("/api/admin/employees", {
    method: "POST",
    body: JSON.stringify(data),
  })
}

export function updateEmployee(id: string, data: UpdateEmployeeRequest): Promise<Employee> {
  return request<Employee>(`/api/admin/employees/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  })
}

export function deleteEmployee(id: number): Promise<void> {
  return request<void>(`/api/admin/employees/${id}`, {
    method: "DELETE",
  })
}
