import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { createEmployee, getEmployee, updateEmployee } from "../../../service/employee/employeeService"
import type {
  ApiRequestError,
  CreateEmployeeRequest,
  Employee,
  NavigateHandler,
  UpdateEmployeeRequest,
} from "../../../types/admin"

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

interface EmployeeFormValues {
  username: string
  password: string
  employeeCode: string
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  address: string
  position: string
  avatar: string
  status: string
}

type EmployeeFieldName = keyof EmployeeFormValues
type EmployeeFieldErrors = Partial<Record<EmployeeFieldName, string>>
type TouchedFields = Partial<Record<EmployeeFieldName, boolean>>

interface EmployeeFormPageProps {
  employeeId?: string
  onNavigate: NavigateHandler
}

const initialValues: EmployeeFormValues = {
  username: "",
  password: "",
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

function toFormValues(employee: Employee): EmployeeFormValues {
  return {
    username: employee.username || "",
    password: "",
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

function isValidUrl(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

function validateCloudinaryUrl(value: string) {
  const avatarUrl = value.trim()
  if (!avatarUrl) return ""

  if (avatarUrl.length > 255) {
    return "Link ảnh đại diện tối đa 255 ký tự."
  }

  if (!isValidUrl(avatarUrl)) {
    return "Link ảnh đại diện không hợp lệ."
  }

  if (!new URL(avatarUrl).hostname.includes("cloudinary.com")) {
    return "Vui lòng dùng link ảnh từ Cloudinary."
  }

  return ""
}

function validate(values: EmployeeFormValues, isEditMode: boolean): EmployeeFieldErrors {
  const errors: EmployeeFieldErrors = {}
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phonePattern = /^(0[0-9]{9,10}|\+84[0-9]{9,10})$/
  const avatarError = validateCloudinaryUrl(values.avatar)

  if (!isEditMode && !values.username.trim()) {
    errors.username = "Tên đăng nhập không được để trống."
  }
  if (!isEditMode && values.password.length < 8) {
    errors.password = "Mật khẩu phải có ít nhất 8 ký tự."
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
  if (avatarError) {
    errors.avatar = avatarError
  }

  return errors
}

function cleanOptional(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

function EmployeeFormPage({ employeeId, onNavigate }: EmployeeFormPageProps) {
  const isEditMode = Boolean(employeeId)
  const [values, setValues] = useState<EmployeeFormValues>(initialValues)
  const [errors, setErrors] = useState<EmployeeFieldErrors>({})
  const [touched, setTouched] = useState<TouchedFields>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [pageError, setPageError] = useState("")

  useEffect(() => {
    if (!employeeId) return

    let ignore = false
    setLoading(true)
    setPageError("")

    getEmployee(employeeId)
      .then((employee) => {
        if (!ignore) {
          setValues(toFormValues(employee))
          setErrors({})
          setTouched({})
          setSubmitAttempted(false)
        }
      })
      .catch(() => {
        if (!ignore) setPageError("Không thể tải thông tin nhân viên. Vui lòng thử lại.")
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [employeeId])

  function shouldShowError(name: EmployeeFieldName) {
    return Boolean(errors[name] && (touched[name] || submitAttempted))
  }

  function getInputClass(name: EmployeeFieldName) {
    return shouldShowError(name) ? "is-invalid" : undefined
  }

  function fieldError(name: EmployeeFieldName) {
    if (!shouldShowError(name)) return null

    return (
      <small className="employee-field-error" role="alert">
        {errors[name]}
      </small>
    )
  }

  function updateField(name: EmployeeFieldName, value: string) {
    const nextValues = { ...values, [name]: value }
    const nextErrors = validate(nextValues, isEditMode)

    setValues(nextValues)
    setErrors((current) => ({
      ...current,
      [name]: touched[name] || submitAttempted ? nextErrors[name] : "",
    }))
    setPageError("")
  }

  function handleFieldBlur(name: EmployeeFieldName) {
    setTouched((current) => ({ ...current, [name]: true }))
    setErrors((current) => ({ ...current, [name]: validate(values, isEditMode)[name] }))
  }

  function buildCreatePayload(): CreateEmployeeRequest {
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

  function buildUpdatePayload(): UpdateEmployeeRequest {
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitAttempted(true)

    const nextErrors = validate(values, isEditMode)
    setErrors(nextErrors)

    if (Object.keys(nextErrors).length > 0) {
      return
    }

    setSaving(true)
    setPageError("")
    const action = isEditMode && employeeId
      ? updateEmployee(employeeId, buildUpdatePayload())
      : createEmployee(buildCreatePayload())

    action
      .then(() => onNavigate("/admin/employees"))
      .catch((requestError: ApiRequestError) => {
        if (requestError.fieldErrors) {
          setErrors(requestError.fieldErrors)
          setSubmitAttempted(true)
        }
        setPageError(requestError.message || "Không thể lưu nhân viên. Vui lòng thử lại.")
      })
      .finally(() => setSaving(false))
  }

  return (
    <main className="app-shell employee-admin-page employee-form-page">
      <header className="employee-page-header">
        <div>
          <p className="employee-page-eyebrow">Sprint 3</p>
          <h1>{isEditMode ? "Chỉnh sửa nhân viên" : "Thêm nhân viên"}</h1>
          <p>Quản lý thông tin tài khoản và nhân viên trong hệ thống</p>
        </div>
      </header>

      {pageError && <div className="employee-alert employee-alert-error">{pageError}</div>}

      {loading ? (
        <div className="employee-table-card">
          <div className="employee-skeleton-row" />
          <div className="employee-skeleton-row" />
        </div>
      ) : (
        <form className="employee-admin-form" onSubmit={handleSubmit} noValidate>
          <section className="form-panel">
            <div className="employee-panel-heading">
              <h2>Thông tin tài khoản</h2>
            </div>
            <div className="employee-form-grid">
              <label className="employee-field">
                <span>Tên đăng nhập *</span>
                <input
                  name="username"
                  value={values.username}
                  readOnly={isEditMode}
                  className={getInputClass("username")}
                  aria-invalid={shouldShowError("username")}
                  onBlur={() => handleFieldBlur("username")}
                  onChange={(event) => updateField("username", event.target.value)}
                />
                {fieldError("username")}
              </label>

              {!isEditMode && (
                <label className="employee-field">
                  <span>Mật khẩu *</span>
                  <input
                    name="password"
                    type="password"
                    value={values.password}
                    className={getInputClass("password")}
                    aria-invalid={shouldShowError("password")}
                    onBlur={() => handleFieldBlur("password")}
                    onChange={(event) => updateField("password", event.target.value)}
                  />
                  {fieldError("password")}
                </label>
              )}
            </div>
          </section>

          <section className="form-panel">
            <div className="employee-panel-heading">
              <h2>Thông tin nhân viên</h2>
            </div>
            <div className="employee-form-grid">
              <label className="employee-field">
                <span>Mã nhân viên *</span>
                <input
                  name="employeeCode"
                  placeholder="VD: NV011"
                  value={values.employeeCode}
                  className={getInputClass("employeeCode")}
                  aria-invalid={shouldShowError("employeeCode")}
                  onBlur={() => handleFieldBlur("employeeCode")}
                  onChange={(event) => updateField("employeeCode", event.target.value)}
                />
                {fieldError("employeeCode")}
              </label>

              <label className="employee-field">
                <span>Họ và tên *</span>
                <input
                  name="fullName"
                  value={values.fullName}
                  className={getInputClass("fullName")}
                  aria-invalid={shouldShowError("fullName")}
                  onBlur={() => handleFieldBlur("fullName")}
                  onChange={(event) => updateField("fullName", event.target.value)}
                />
                {fieldError("fullName")}
              </label>

              <label className="employee-field">
                <span>Email</span>
                <input
                  name="email"
                  type="email"
                  value={values.email}
                  className={getInputClass("email")}
                  aria-invalid={shouldShowError("email")}
                  onBlur={() => handleFieldBlur("email")}
                  onChange={(event) => updateField("email", event.target.value)}
                />
                {fieldError("email")}
              </label>

              <label className="employee-field">
                <span>Số điện thoại</span>
                <input
                  name="phone"
                  value={values.phone}
                  className={getInputClass("phone")}
                  aria-invalid={shouldShowError("phone")}
                  onBlur={() => handleFieldBlur("phone")}
                  onChange={(event) => updateField("phone", event.target.value)}
                />
                {fieldError("phone")}
              </label>

              <label className="employee-field">
                <span>Ngày sinh</span>
                <input
                  name="dateOfBirth"
                  type="date"
                  value={values.dateOfBirth}
                  className={getInputClass("dateOfBirth")}
                  aria-invalid={shouldShowError("dateOfBirth")}
                  onBlur={() => handleFieldBlur("dateOfBirth")}
                  onChange={(event) => updateField("dateOfBirth", event.target.value)}
                />
                {fieldError("dateOfBirth")}
              </label>

              <label className="employee-field">
                <span>Giới tính</span>
                <select name="gender" value={values.gender} onChange={(event) => updateField("gender", event.target.value)}>
                  {GENDER_OPTIONS.map((option) => (
                    <option key={option.value || "empty"} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="employee-field">
                <span>Chức vụ</span>
                <input name="position" value={values.position} onChange={(event) => updateField("position", event.target.value)} />
              </label>

              <label className="employee-field">
                <span>Trạng thái</span>
                <select name="status" value={values.status} onChange={(event) => updateField("status", event.target.value)}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="employee-field employee-field-full">
                <span>Địa chỉ</span>
                <textarea name="address" rows={3} value={values.address} onChange={(event) => updateField("address", event.target.value)} />
              </label>

              <label className="employee-field employee-field-full">
                <span>Link ảnh đại diện Cloudinary</span>
                <input
                  name="avatar"
                  placeholder="Dán link ảnh Cloudinary"
                  value={values.avatar}
                  className={getInputClass("avatar")}
                  aria-invalid={shouldShowError("avatar")}
                  onBlur={() => handleFieldBlur("avatar")}
                  onChange={(event) => updateField("avatar", event.target.value)}
                />
                {fieldError("avatar")}
              </label>

              <div className="employee-avatar-preview employee-field-full">
                {values.avatar.trim() && !errors.avatar ? (
                  <img src={values.avatar.trim()} alt="Ảnh đại diện nhân viên" onError={(event) => event.currentTarget.classList.add("is-broken")} />
                ) : (
                  <span>Ảnh đại diện</span>
                )}
              </div>
            </div>
          </section>

          <div className="employee-action-bar">
            <button type="button" className="secondary-button" disabled={saving} onClick={() => onNavigate("/admin/employees")}>
              Quay lại
            </button>
            <button type="submit" className="primary-button" disabled={saving}>
              {saving ? "Đang lưu..." : isEditMode ? "Cập nhật nhân viên" : "Thêm nhân viên"}
            </button>
          </div>
        </form>
      )}
    </main>
  )
}

export default EmployeeFormPage
