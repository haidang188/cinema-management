import { useEffect, useMemo, useState } from "react"
import { deleteEmployee, getEmployees } from "../../../service/employee/employeeService"
import type { EmployeeListItem, NavigateHandler } from "../../../types/admin"

const PAGE_SIZE = 10

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
}

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

interface EmployeeListProps {
  onNavigate: NavigateHandler
}

function getVisiblePages(currentPage: number, totalPages: number) {
  if (totalPages <= 0) return []

  const maxVisiblePages = 5
  const startPage = Math.max(
    0,
    Math.min(currentPage - Math.floor(maxVisiblePages / 2), totalPages - maxVisiblePages),
  )
  const endPage = Math.min(totalPages, startPage + maxVisiblePages)

  return Array.from({ length: endPage - startPage }, (_, index) => startPage + index)
}

function EmployeeList({ onNavigate }: EmployeeListProps) {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [confirmEmployee, setConfirmEmployee] = useState<EmployeeListItem | null>(null)
  const [deleting, setDeleting] = useState(false)
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages])
  const firstItemIndex = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const lastItemIndex = Math.min(page * PAGE_SIZE + employees.length, totalElements)
  const hasActiveFilter = Boolean(keyword || status)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(0)
      setKeyword(searchTerm.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    let ignore = false
    setLoading(true)
    setError("")

    getEmployees({ page, size: PAGE_SIZE, keyword, status })
      .then((data) => {
        if (!ignore) {
          setEmployees(data.content || [])
          setTotalPages(data.totalPages || 0)
          setTotalElements(data.totalElements || 0)

          if (data.totalPages > 0 && page >= data.totalPages) {
            setPage(data.totalPages - 1)
          }
        }
      })
      .catch(() => {
        if (!ignore) setError("Không thể tải danh sách nhân viên. Vui lòng thử lại.")
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [keyword, page, status])

  function handleResetFilters() {
    setSearchTerm("")
    setKeyword("")
    setStatus("")
    setPage(0)
  }

  function refreshCurrentPage() {
    setLoading(true)
    setError("")
    getEmployees({ page, size: PAGE_SIZE, keyword, status })
      .then((data) => {
        setEmployees(data.content || [])
        setTotalPages(data.totalPages || 0)
        setTotalElements(data.totalElements || 0)
      })
      .catch(() => setError("Không thể tải danh sách nhân viên. Vui lòng thử lại."))
      .finally(() => setLoading(false))
  }

  function handleDeleteConfirm() {
    if (!confirmEmployee) return

    setDeleting(true)
    deleteEmployee(confirmEmployee.id)
      .then(() => {
        setConfirmEmployee(null)
        setSuccessMessage("Đã ngừng hoạt động nhân viên.")
        refreshCurrentPage()
      })
      .catch((requestError: Error) => setError(requestError.message || "Không thể ngừng hoạt động nhân viên."))
      .finally(() => setDeleting(false))
  }

  const emptyMessage = hasActiveFilter
    ? "Không tìm thấy nhân viên phù hợp."
    : "Chưa có nhân viên nào."

  return (
    <main className="app-shell employee-admin-page employee-list-page">
      <header className="employee-page-header">
        <div>
          <p className="employee-page-eyebrow">Sprint 3</p>
          <h1>Quản lý nhân viên</h1>
          <p>Quản lý thông tin tài khoản và nhân viên trong hệ thống</p>
        </div>
        <button type="button" className="primary-button employee-add-button" onClick={() => onNavigate("/admin/employees/create")}>
          + Thêm nhân viên
        </button>
      </header>

      <section className="employee-toolbar" aria-label="Tìm kiếm và lọc nhân viên">
        <label className="employee-search-field">
          <span>Tìm kiếm</span>
          <input
            name="keyword"
            type="search"
            placeholder="Tìm kiếm theo mã, tên, tài khoản, email hoặc số điện thoại..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <label className="employee-filter-field">
          <span>Trạng thái</span>
          <select
            aria-label="Lọc trạng thái nhân viên"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value)
              setPage(0)
            }}
          >
            {STATUS_FILTERS.map((filter) => (
              <option key={filter.value || "all"} value={filter.value}>
                {filter.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className="secondary-button employee-reset-button"
          disabled={!hasActiveFilter}
          onClick={handleResetFilters}
        >
          Đặt lại
        </button>
      </section>

      {successMessage && <div className="employee-alert employee-alert-success">{successMessage}</div>}
      {error && <div className="employee-alert employee-alert-error">{error}</div>}

      {loading && (
        <div className="employee-table-card" aria-label="Đang tải danh sách nhân viên...">
          <div className="employee-skeleton-row" />
          <div className="employee-skeleton-row" />
          <div className="employee-skeleton-row" />
        </div>
      )}

      {!loading && !error && employees.length === 0 && (
        <section className="employee-empty-state">
          <h2>{emptyMessage}</h2>
          <p>Thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái.</p>
        </section>
      )}

      {!loading && !error && employees.length > 0 && (
        <>
          <div className="employee-table-card">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Mã nhân viên</th>
                  <th>Họ và tên</th>
                  <th>Tên đăng nhập</th>
                  <th>Email</th>
                  <th>Số điện thoại</th>
                  <th>Chức vụ</th>
                  <th>Trạng thái</th>
                  <th className="action-column">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee, index) => (
                  <tr key={employee.id}>
                    <td>{page * PAGE_SIZE + index + 1}</td>
                    <td>
                      <strong className="employee-code-text">{employee.employeeCode}</strong>
                    </td>
                    <td>{employee.fullName}</td>
                    <td>{employee.username}</td>
                    <td>{employee.email || "-"}</td>
                    <td>{employee.phone || "-"}</td>
                    <td>{employee.position || "-"}</td>
                    <td>
                      <span className={`status-badge employee-status-${employee.status?.toLowerCase() || "unknown"}`}>
                        {STATUS_LABELS[employee.status || ""] || employee.status || "-"}
                      </span>
                    </td>
                    <td className="employee-actions action-column">
                      <button
                        type="button"
                        className="edit-button"
                        onClick={() => onNavigate(`/admin/employees/${employee.id}/edit`)}
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        disabled={employee.status === "INACTIVE"}
                        onClick={() => setConfirmEmployee(employee)}
                      >
                        Ngừng hoạt động
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="pagination employee-pagination" aria-label="Phân trang nhân viên">
            <span className="pagination-summary">
              Hiển thị {firstItemIndex}-{lastItemIndex} trong {totalElements} nhân viên
            </span>
            <button
              type="button"
              className="pagination-button"
              disabled={page === 0}
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
            >
              Trước
            </button>
            {visiblePages.map((pageNumber) => (
              <button
                key={pageNumber}
                type="button"
                className={`pagination-button${pageNumber === page ? " is-active" : ""}`}
                aria-current={pageNumber === page ? "page" : undefined}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber + 1}
              </button>
            ))}
            <button
              type="button"
              className="pagination-button"
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages - 1))}
            >
              Sau
            </button>
          </nav>
        </>
      )}

      {confirmEmployee && (
        <div className="employee-modal-backdrop" role="presentation">
          <section className="employee-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="employee-delete-title">
            <h2 id="employee-delete-title">Bạn có chắc muốn xóa nhân viên này?</h2>
            <p>Nhân viên sẽ không thể tiếp tục sử dụng tài khoản.</p>
            <div className="employee-modal-actions">
              <button type="button" className="secondary-button" disabled={deleting} onClick={() => setConfirmEmployee(null)}>
                Hủy
              </button>
              <button type="button" className="primary-button" disabled={deleting} onClick={handleDeleteConfirm}>
                {deleting ? "Đang lưu..." : "Xác nhận"}
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default EmployeeList
