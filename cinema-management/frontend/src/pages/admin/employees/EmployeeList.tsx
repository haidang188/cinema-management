import { useEffect, useMemo, useState, type FormEvent } from "react"
import {
  AlertTriangle,
  Briefcase,
  Eye,
  EyeOff,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  UserCheck,
  UserPlus,
  Users,
  UserX,
} from "lucide-react"
import AppModal from "../../../component/common/AppModal"
import {
  createEmployee,
  deactivateEmployee,
  getEmployee,
  getEmployees,
  updateEmployee,
} from "../../../service/employee/employeeService"
import type {
  ApiRequestError,
  CreateEmployeeRequest,
  Employee,
  EmployeeListItem,
  NavigateHandler,
  UpdateEmployeeRequest,
} from "../../../types/admin"

const PAGE_SIZE = 10

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
}

const GENDER_LABELS: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
}

const STATUS_FILTERS = [
  { value: "", label: "Tất cả" },
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

const GENDER_OPTIONS = [
  { value: "", label: "Chọn giới tính" },
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
]

const EMPTY_FORM = {
  username: "",
  password: "",
  confirmPassword: "",
  employeeCode: "",
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  address: "",
  position: "",
  avatar: "",
  status: "ACTIVE",
}

type EmployeeFormValues = typeof EMPTY_FORM
type EmployeeFieldName = keyof EmployeeFormValues
type EmployeeFieldErrors = Partial<Record<EmployeeFieldName, string>>
type EmployeeModalMode = "create" | "edit"

interface EmployeeListProps {
  onNavigate: NavigateHandler
}

interface EmployeeFormProps {
  mode: EmployeeModalMode
  initialEmployee?: Employee | null
  onCancel: () => void
  onSubmit: (values: EmployeeFormValues) => Promise<void>
}

interface StatCardProps {
  tone: "blue" | "green" | "red" | "purple"
  icon: "users" | "active" | "inactive" | "position"
  label: string
  value: number
  caption: string
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

function cleanOptional(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "NV"
  return parts.slice(-2).map((part) => part[0]?.toUpperCase()).join("")
}

function formatDate(value?: string) {
  if (!value) return "-"
  const [year, month, day] = value.split("T")[0].split("-")
  if (!year || !month || !day) return value
  return `${day}/${month}/${year}`
}

function toFormValues(employee?: Employee | null): EmployeeFormValues {
  if (!employee) return EMPTY_FORM

  return {
    username: employee.username || "",
    password: "",
    confirmPassword: "",
    employeeCode: employee.employeeCode || "",
    fullName: employee.fullName || "",
    email: employee.email || "",
    phone: employee.phone || "",
    dateOfBirth: employee.dateOfBirth || "",
    gender: employee.gender || "",
    address: employee.address || "",
    position: employee.position || "",
    avatar: employee.avatar || "",
    status: employee.status || "ACTIVE",
  }
}

function validate(values: EmployeeFormValues, mode: EmployeeModalMode): EmployeeFieldErrors {
  const errors: EmployeeFieldErrors = {}
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phonePattern = /^(0[0-9]{9,10}|\+84[0-9]{9,10})$/

  if (mode === "create" && !values.username.trim()) {
    errors.username = "Tên đăng nhập không được để trống."
  }
  if (mode === "create" && values.password.length < 8) {
    errors.password = "Mật khẩu phải có ít nhất 8 ký tự."
  }
  if (mode === "create" && values.confirmPassword !== values.password) {
    errors.confirmPassword = "Xác nhận mật khẩu không khớp."
  }
  if (!values.employeeCode.trim()) {
    errors.employeeCode = "Mã nhân viên không được để trống."
  }
  if (!values.fullName.trim()) {
    errors.fullName = "Họ và tên không được để trống."
  }
  if (values.email.trim() && !emailPattern.test(values.email.trim())) {
    errors.email = "Email không đúng định dạng."
  }
  if (values.phone.trim() && !phonePattern.test(values.phone.trim())) {
    errors.phone = "Số điện thoại không đúng định dạng."
  }
  if (values.dateOfBirth) {
    const selectedDate = new Date(`${values.dateOfBirth}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (Number.isNaN(selectedDate.getTime()) || selectedDate > today) {
      errors.dateOfBirth = "Ngày sinh không hợp lệ."
    }
  }
  if (values.avatar.trim().length > 255) {
    errors.avatar = "Ảnh đại diện tối đa 255 ký tự."
  }

  return errors
}

function buildCreatePayload(values: EmployeeFormValues): CreateEmployeeRequest {
  return {
    username: values.username.trim(),
    password: values.password,
    employeeCode: values.employeeCode.trim(),
    fullName: values.fullName.trim(),
    email: cleanOptional(values.email),
    phone: cleanOptional(values.phone),
    dateOfBirth: cleanOptional(values.dateOfBirth),
    gender: cleanOptional(values.gender),
    address: cleanOptional(values.address),
    position: cleanOptional(values.position),
    avatar: cleanOptional(values.avatar),
    status: values.status,
  }
}

function buildUpdatePayload(values: EmployeeFormValues): UpdateEmployeeRequest {
  return {
    employeeCode: values.employeeCode.trim(),
    fullName: values.fullName.trim(),
    email: cleanOptional(values.email),
    phone: cleanOptional(values.phone),
    dateOfBirth: cleanOptional(values.dateOfBirth),
    gender: cleanOptional(values.gender),
    address: cleanOptional(values.address),
    position: cleanOptional(values.position),
    avatar: cleanOptional(values.avatar),
    status: values.status,
  }
}

function EmployeeAvatar({ employee }: { employee: Pick<EmployeeListItem, "avatar" | "fullName"> }) {
  const [broken, setBroken] = useState(false)

  if (employee.avatar && !broken) {
    return (
      <span className="employee-avatar">
        <img src={employee.avatar} alt={`Ảnh đại diện ${employee.fullName}`} onError={() => setBroken(true)} />
      </span>
    )
  }

  return <span className="employee-avatar employee-avatar-fallback">{initials(employee.fullName)}</span>
}

function EmployeeStatCard({ tone, icon, label, value, caption }: StatCardProps) {
  const Icon = icon === "active" ? UserCheck : icon === "inactive" ? UserX : icon === "position" ? Briefcase : Users

  return (
    <article className={`employee-stat-card employee-stat-${tone}`}>
      <span className="employee-stat-icon">
        <Icon size={24} />
      </span>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <small>{caption}</small>
      </div>
    </article>
  )
}

function EmployeeForm({ mode, initialEmployee, onCancel, onSubmit }: EmployeeFormProps) {
  const [values, setValues] = useState<EmployeeFormValues>(() => toFormValues(initialEmployee))
  const [errors, setErrors] = useState<EmployeeFieldErrors>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const isEdit = mode === "edit"

  function updateField(name: EmployeeFieldName, value: string) {
    setValues((current) => ({ ...current, [name]: value }))
    setErrors((current) => ({ ...current, [name]: undefined }))
    setFormError("")
  }

  function fieldError(name: EmployeeFieldName) {
    if (!errors[name]) return null
    return <small className="employee-field-error">{errors[name]}</small>
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return

    const nextErrors = validate(values, mode)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setFormError("")
    try {
      await onSubmit(values)
    } catch (requestError) {
      const apiError = requestError as ApiRequestError
      if (apiError.fieldErrors) {
        setErrors(apiError.fieldErrors as EmployeeFieldErrors)
      }
      setFormError(apiError.message || "Không thể lưu nhân viên. Vui lòng thử lại.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="employee-admin-form" onSubmit={handleSubmit} noValidate>
      {formError && <div className="employee-alert employee-alert-error">{formError}</div>}

      <section className="employee-form-section">
        <h3>Thông tin tài khoản</h3>
        <div className="employee-account-layout">
        <div className="employee-form-grid">
          <label className="employee-field">
            <span>Tên đăng nhập *</span>
            <input
              value={values.username}
              readOnly={isEdit}
              onChange={(event) => updateField("username", event.target.value)}
            />
            {fieldError("username")}
          </label>

          {!isEdit && (
            <>
              <label className="employee-field">
                <span>Mật khẩu *</span>
                <div className="employee-password-field">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={values.password}
                    onChange={(event) => updateField("password", event.target.value)}
                  />
                  <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label="Hiện hoặc ẩn mật khẩu">
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldError("password")}
              </label>
              <label className="employee-field">
                <span>Xác nhận mật khẩu *</span>
                <div className="employee-password-field">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={values.confirmPassword}
                    onChange={(event) => updateField("confirmPassword", event.target.value)}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword((current) => !current)} aria-label="Hiện hoặc ẩn xác nhận mật khẩu">
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {fieldError("confirmPassword")}
              </label>
            </>
          )}
        </div>
          <div className="employee-avatar-uploader">
            <span>Ảnh đại diện</span>
            <div className="employee-avatar-drop">
              {values.avatar.trim() ? (
                <img src={values.avatar.trim()} alt="Avatar preview" />
              ) : (
                <>
                  <strong>+</strong>
                  <small>Dán URL ảnh ở phần thông tin nhân viên</small>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="employee-form-section">
        <h3>Thông tin cá nhân</h3>
        <div className="employee-form-grid">
          <label className="employee-field">
            <span>Mã nhân viên *</span>
            <input value={values.employeeCode} onChange={(event) => updateField("employeeCode", event.target.value)} />
            {fieldError("employeeCode")}
          </label>
          <label className="employee-field">
            <span>Họ và tên *</span>
            <input value={values.fullName} onChange={(event) => updateField("fullName", event.target.value)} />
            {fieldError("fullName")}
          </label>
          <label className="employee-field">
            <span>Email</span>
            <input type="email" value={values.email} onChange={(event) => updateField("email", event.target.value)} />
            {fieldError("email")}
          </label>
          <label className="employee-field">
            <span>Số điện thoại</span>
            <input value={values.phone} onChange={(event) => updateField("phone", event.target.value)} />
            {fieldError("phone")}
          </label>
          <label className="employee-field">
            <span>Ngày sinh</span>
            <input type="date" value={values.dateOfBirth} onChange={(event) => updateField("dateOfBirth", event.target.value)} />
            {fieldError("dateOfBirth")}
          </label>
          <label className="employee-field">
            <span>Giới tính</span>
            <select value={values.gender} onChange={(event) => updateField("gender", event.target.value)}>
              {GENDER_OPTIONS.map((option) => (
                <option key={option.value || "none"} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="employee-field employee-field-full">
            <span>Địa chỉ</span>
            <textarea rows={3} value={values.address} onChange={(event) => updateField("address", event.target.value)} />
          </label>
          <label className="employee-field employee-field-full">
            <span>Ảnh đại diện</span>
            <input value={values.avatar} placeholder="Dán URL ảnh đại diện" onChange={(event) => updateField("avatar", event.target.value)} />
            {fieldError("avatar")}
          </label>
        </div>
      </section>

      <section className="employee-form-section">
        <h3>Thông tin công việc</h3>
        <div className="employee-form-grid">
          <label className="employee-field">
            <span>Chức vụ</span>
            <input value={values.position} onChange={(event) => updateField("position", event.target.value)} />
          </label>
          <label className="employee-field">
            <span>Trạng thái</span>
            <select value={values.status} onChange={(event) => updateField("status", event.target.value)}>
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <div className="employee-modal-footer">
        <button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm nhân viên"}
        </button>
      </div>
    </form>
  )
}

function EmployeeDetail({ employee }: { employee: Employee }) {
  return (
    <div className="employee-detail">
      <div className="employee-profile-card">
        <EmployeeAvatar employee={employee} />
        <div>
          <h3>{employee.fullName}</h3>
          <p>{employee.employeeCode}</p>
          <span className={`status-badge employee-status-${employee.status?.toLowerCase() || "unknown"}`}>
            {STATUS_LABELS[employee.status || ""] || employee.status || "-"}
          </span>
        </div>
      </div>

      <section>
        <h4>Thông tin cá nhân</h4>
        <dl className="employee-detail-grid">
          <div>
            <dt>Ngày sinh</dt>
            <dd>{formatDate(employee.dateOfBirth)}</dd>
          </div>
          <div>
            <dt>Giới tính</dt>
            <dd>{GENDER_LABELS[employee.gender || ""] || "-"}</dd>
          </div>
          <div>
            <dt>Email</dt>
            <dd>{employee.email || "-"}</dd>
          </div>
          <div>
            <dt>Điện thoại</dt>
            <dd>{employee.phone || "-"}</dd>
          </div>
          <div className="employee-detail-full">
            <dt>Địa chỉ</dt>
            <dd>{employee.address || "-"}</dd>
          </div>
        </dl>
      </section>

      <section>
        <h4>Thông tin công việc</h4>
        <dl className="employee-detail-grid">
          <div>
            <dt>Tên đăng nhập</dt>
            <dd>{employee.username}</dd>
          </div>
          <div>
            <dt>Chức vụ</dt>
            <dd>{employee.position || "-"}</dd>
          </div>
          <div>
            <dt>Trạng thái</dt>
            <dd>{STATUS_LABELS[employee.status || ""] || employee.status || "-"}</dd>
          </div>
          <div>
            <dt>Ngày tạo</dt>
            <dd>{formatDate(employee.createdAt)}</dd>
          </div>
        </dl>
      </section>
    </div>
  )
}

function EmployeeList({ onNavigate: _onNavigate }: EmployeeListProps) {
  const [employees, setEmployees] = useState<EmployeeListItem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("")
  const [positionFilter, setPositionFilter] = useState("")
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [activeTotal, setActiveTotal] = useState(0)
  const [inactiveTotal, setInactiveTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [toastMessage, setToastMessage] = useState("")
  const [formMode, setFormMode] = useState<EmployeeModalMode | null>(null)
  const [detailEmployee, setDetailEmployee] = useState<Employee | null>(null)
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [modalError, setModalError] = useState("")
  const [confirmEmployee, setConfirmEmployee] = useState<EmployeeListItem | null>(null)
  const [deactivating, setDeactivating] = useState(false)
  const [openActionId, setOpenActionId] = useState<number | null>(null)

  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages])
  const positionOptions = useMemo(
    () =>
      Array.from(new Set(employees.map((employee) => employee.position).filter(Boolean) as string[])).sort((a, b) =>
        a.localeCompare(b),
      ),
    [employees],
  )
  const visibleEmployees = useMemo(
    () => employees.filter((employee) => !positionFilter || employee.position === positionFilter),
    [employees, positionFilter],
  )
  const positionCount = positionOptions.length
  const activePercent = totalElements > 0 ? (activeTotal / totalElements) * 100 : 0
  const inactivePercent = totalElements > 0 ? (inactiveTotal / totalElements) * 100 : 0
  const firstItemIndex = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const lastItemIndex = Math.min(page * PAGE_SIZE + visibleEmployees.length, totalElements)
  const hasActiveFilter = Boolean(keyword || status || positionFilter)

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setPage(0)
      setKeyword(searchTerm.trim())
    }, 300)

    return () => window.clearTimeout(timeoutId)
  }, [searchTerm])

  useEffect(() => {
    let ignore = false
    // oxlint-disable-next-line react/set-state-in-effect
    setLoading(true)
    setError("")

    getEmployees({ page, size: PAGE_SIZE, keyword, status })
      .then((data) => {
        if (ignore) return
        setEmployees(data.content || [])
        setTotalPages(data.totalPages || 0)
        setTotalElements(data.totalElements || 0)
        if (data.totalPages > 0 && page >= data.totalPages) {
          setPage(data.totalPages - 1)
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

  useEffect(() => {
    let ignore = false

    Promise.all([
      getEmployees({ page: 0, size: 1, status: "ACTIVE" }),
      getEmployees({ page: 0, size: 1, status: "INACTIVE" }),
    ])
      .then(([activeData, inactiveData]) => {
        if (ignore) return
        setActiveTotal(activeData.totalElements || 0)
        setInactiveTotal(inactiveData.totalElements || 0)
      })
      .catch(() => {
        if (ignore) return
        setActiveTotal(0)
        setInactiveTotal(0)
      })

    return () => {
      ignore = true
    }
  }, [toastMessage])

  useEffect(() => {
    if (!toastMessage) return undefined
    const timeoutId = window.setTimeout(() => setToastMessage(""), 2600)
    return () => window.clearTimeout(timeoutId)
  }, [toastMessage])

  async function refreshCurrentPage() {
    const data = await getEmployees({ page, size: PAGE_SIZE, keyword, status })
    setEmployees(data.content || [])
    setTotalPages(data.totalPages || 0)
    setTotalElements(data.totalElements || 0)
  }

  function handleResetFilters() {
    setSearchTerm("")
    setKeyword("")
    setStatus("")
    setPositionFilter("")
    setPage(0)
  }

  async function openDetail(employeeId: number) {
    setDetailLoading(true)
    setModalError("")
    setDetailEmployee(null)
    try {
      setDetailEmployee(await getEmployee(String(employeeId)))
    } catch {
      setModalError("Không thể tải chi tiết nhân viên. Vui lòng thử lại.")
    } finally {
      setDetailLoading(false)
    }
  }

  async function openEdit(employeeId: number) {
    setDetailLoading(true)
    setModalError("")
    setEditingEmployee(null)
    setFormMode("edit")
    try {
      setEditingEmployee(await getEmployee(String(employeeId)))
    } catch {
      setModalError("Không thể tải thông tin nhân viên. Vui lòng thử lại.")
    } finally {
      setDetailLoading(false)
    }
  }

  async function handleCreate(values: EmployeeFormValues) {
    await createEmployee(buildCreatePayload(values))
    setFormMode(null)
    setPage(0)
    await refreshCurrentPage()
    setToastMessage("Thêm nhân viên thành công.")
  }

  async function handleUpdate(values: EmployeeFormValues) {
    if (!editingEmployee) return
    await updateEmployee(String(editingEmployee.id), buildUpdatePayload(values))
    setFormMode(null)
    setEditingEmployee(null)
    await refreshCurrentPage()
    setToastMessage("Cập nhật nhân viên thành công.")
  }

  async function handleDeactivate() {
    if (!confirmEmployee || deactivating) return

    setDeactivating(true)
    setError("")
    try {
      await deactivateEmployee(confirmEmployee.id)
      setConfirmEmployee(null)
      await refreshCurrentPage()
      setToastMessage("Đã ngừng hoạt động nhân viên.")
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể ngừng hoạt động nhân viên.")
    } finally {
      setDeactivating(false)
    }
  }

  const emptyMessage = hasActiveFilter ? "Không tìm thấy nhân viên phù hợp." : "Chưa có nhân viên nào."

  return (
    <main className="app-shell employee-admin-page employee-list-page">
      <header className="employee-page-header">
        <div>
          <p className="employee-page-eyebrow">Sprint 3</p>
          <h1>Quản lý nhân viên</h1>
          <p>Quản lý thông tin và trạng thái nhân viên trong hệ thống</p>
        </div>
        <button type="button" className="primary-button employee-add-button" onClick={() => setFormMode("create")}>
          <UserPlus size={16} />
          Thêm nhân viên
        </button>
      </header>

      <section className="employee-stat-grid" aria-label="Thống kê nhân viên">
        <EmployeeStatCard tone="blue" icon="users" label="Tổng nhân viên" value={totalElements} caption="Nhân viên trong hệ thống" />
        <EmployeeStatCard tone="green" icon="active" label="Đang hoạt động" value={activeTotal} caption={`${activePercent.toFixed(1)}% tổng số nhân viên`} />
        <EmployeeStatCard tone="red" icon="inactive" label="Ngừng hoạt động" value={inactiveTotal} caption={`${inactivePercent.toFixed(1)}% tổng số nhân viên`} />
        <EmployeeStatCard tone="purple" icon="position" label="Chức vụ" value={positionCount} caption="Loại chức vụ khác nhau" />
      </section>

      <section className="employee-toolbar" aria-label="Tìm kiếm và lọc nhân viên">
        <label className="employee-search-field">
          <span>Tìm kiếm</span>
          <div className="employee-search-control">
            <Search size={18} />
            <input
              name="keyword"
              type="search"
              placeholder="Tìm kiếm theo mã, tên, email hoặc số điện thoại..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
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

        <label className="employee-filter-field">
          <span>Chức vụ</span>
          <select
            aria-label="Lọc chức vụ nhân viên"
            value={positionFilter}
            onChange={(event) => setPositionFilter(event.target.value)}
          >
            <option value="">Tất cả chức vụ</option>
            {positionOptions.map((position) => (
              <option key={position} value={position}>
                {position}
              </option>
            ))}
          </select>
        </label>

        <button type="button" className="secondary-button employee-reset-button" disabled={!hasActiveFilter} onClick={handleResetFilters}>
          <RefreshCw size={15} />
          Làm mới
        </button>
      </section>

      {error && <div className="employee-alert employee-alert-error">{error}</div>}

      {loading && (
        <div className="employee-table-card" aria-label="Đang tải danh sách nhân viên...">
          <p className="employee-loading-text">Đang tải danh sách nhân viên...</p>
          <div className="employee-skeleton-row" />
          <div className="employee-skeleton-row" />
          <div className="employee-skeleton-row" />
        </div>
      )}

      {!loading && !error && visibleEmployees.length === 0 && (
        <section className="employee-empty-state">
          <Users size={46} />
          <h2>{emptyMessage}</h2>
          <p>
            {hasActiveFilter
              ? "Thử thay đổi từ khóa hoặc bộ lọc."
              : "Thêm nhân viên đầu tiên để bắt đầu quản lý thông tin nhân viên."}
          </p>
          {hasActiveFilter ? (
            <button type="button" className="secondary-button" onClick={handleResetFilters}>
              Xóa bộ lọc
            </button>
          ) : (
            <button type="button" className="primary-button" onClick={() => setFormMode("create")}>
              <UserPlus size={16} />
              Thêm nhân viên
            </button>
          )}
        </section>
      )}

      {!loading && !error && visibleEmployees.length > 0 && (
        <>
          <div className="employee-table-card">
            <table className="employee-table">
              <thead>
                <tr>
                  <th>Nhân viên</th>
                  <th>Mã nhân viên</th>
                  <th>Liên hệ</th>
                  <th>Chức vụ</th>
                  <th>Trạng thái</th>
                  <th className="action-column">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmployees.map((employee) => (
                  <tr key={employee.id}>
                    <td>
                      <div className="employee-person">
                        <EmployeeAvatar employee={employee} />
                        <div>
                          <strong>{employee.fullName}</strong>
                          <span>{employee.username || employee.email || "-"}</span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <strong className="employee-code-text">{employee.employeeCode}</strong>
                    </td>
                    <td>
                      <div className="employee-contact">
                        <span>{employee.email || "-"}</span>
                        <small>{employee.phone || "-"}</small>
                      </div>
                    </td>
                    <td>{employee.position || "-"}</td>
                    <td>
                      <span className={`status-badge employee-status-${employee.status?.toLowerCase() || "unknown"}`}>
                        {STATUS_LABELS[employee.status || ""] || employee.status || "-"}
                      </span>
                    </td>
                    <td className="employee-actions action-column">
                      <button type="button" className="edit-button" aria-label={`Xem ${employee.fullName}`} onClick={() => openDetail(employee.id)}>
                        <Eye size={16} />
                      </button>
                      <button type="button" className="edit-button" aria-label={`Sửa ${employee.fullName}`} onClick={() => openEdit(employee.id)}>
                        <Pencil size={16} />
                      </button>
                      <div className="employee-action-menu-wrap">
                        <button
                          type="button"
                          className="edit-button employee-more-button"
                          aria-label={`Mở menu thao tác cho ${employee.fullName}`}
                          onClick={() => setOpenActionId((current) => (current === employee.id ? null : employee.id))}
                        >
                          <MoreHorizontal size={17} />
                        </button>
                        {openActionId === employee.id && (
                          <div className="employee-action-menu">
                            <button type="button" onClick={() => {
                              setOpenActionId(null)
                              openDetail(employee.id)
                            }}>
                              Xem chi tiết
                            </button>
                            <button type="button" onClick={() => {
                              setOpenActionId(null)
                              openEdit(employee.id)
                            }}>
                              Chỉnh sửa
                            </button>
                            <button
                              type="button"
                              disabled={employee.status === "INACTIVE"}
                              onClick={() => {
                                setOpenActionId(null)
                                setConfirmEmployee(employee)
                              }}
                            >
                              Ngừng hoạt động
                            </button>
                          </div>
                        )}
                      </div>
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
            <button type="button" className="pagination-button" disabled={page === 0} onClick={() => setPage((current) => Math.max(current - 1, 0))}>
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

      {formMode && (
        <AppModal
          title={formMode === "create" ? "Thêm nhân viên" : "Chỉnh sửa nhân viên"}
          size="xl"
          closeOnOverlay={false}
          onClose={() => {
            setFormMode(null)
            setEditingEmployee(null)
            setModalError("")
          }}
        >
          {detailLoading && <div className="employee-alert">Đang tải thông tin nhân viên...</div>}
          {modalError && <div className="employee-alert employee-alert-error">{modalError}</div>}
          {(!detailLoading && (formMode === "create" || editingEmployee)) && (
            <EmployeeForm
              key={`${formMode}-${editingEmployee?.id || "new"}`}
              mode={formMode}
              initialEmployee={editingEmployee}
              onCancel={() => {
                setFormMode(null)
                setEditingEmployee(null)
              }}
              onSubmit={formMode === "create" ? handleCreate : handleUpdate}
            />
          )}
        </AppModal>
      )}

      {(detailEmployee || detailLoading || modalError) && !formMode && (
        <AppModal
          title="Chi tiết nhân viên"
          size="lg"
          closeOnOverlay
          onClose={() => {
            setDetailEmployee(null)
            setModalError("")
          }}
          footer={
            <div className="employee-modal-footer">
              <button type="button" className="secondary-button" onClick={() => setDetailEmployee(null)}>
                Đóng
              </button>
              {detailEmployee && (
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => {
                    setEditingEmployee(detailEmployee)
                    setDetailEmployee(null)
                    setFormMode("edit")
                  }}
                >
                  Chỉnh sửa
                </button>
              )}
            </div>
          }
        >
          {detailLoading && <div className="employee-alert">Đang tải thông tin nhân viên...</div>}
          {modalError && <div className="employee-alert employee-alert-error">{modalError}</div>}
          {detailEmployee && <EmployeeDetail employee={detailEmployee} />}
        </AppModal>
      )}

      {confirmEmployee && (
        <AppModal
          title="Ngừng hoạt động nhân viên?"
          variant="warning"
          size="sm"
          closeOnEsc={!deactivating}
          closeOnOverlay={!deactivating}
          onClose={() => {
            if (!deactivating) setConfirmEmployee(null)
          }}
          actions={[
            {
              label: "Hủy",
              variant: "secondary",
              disabled: deactivating,
              onClick: () => setConfirmEmployee(null),
            },
            {
              label: deactivating ? "Đang lưu..." : "Ngừng hoạt động",
              disabled: deactivating,
              onClick: handleDeactivate,
            },
          ]}
        >
          <div className="employee-confirm-copy">
            <span className="employee-confirm-icon">
              <AlertTriangle size={28} />
            </span>
            <p>
              Nhân viên <strong>{confirmEmployee.fullName}</strong> sẽ không còn ở trạng thái hoạt động. Dữ liệu nhân viên vẫn được giữ lại.
            </p>
          </div>
        </AppModal>
      )}

      {toastMessage && (
        <div className="employee-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </main>
  )
}

export default EmployeeList
