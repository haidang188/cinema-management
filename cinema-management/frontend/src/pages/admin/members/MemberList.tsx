import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { FormEvent } from "react"
import { Calendar, Coins, Eye, Pencil, RefreshCw, Search, Upload, UserCheck, UserX, Users } from "lucide-react"
import AppModal from "../../../component/common/AppModal"
import { getMember, getMembers, getMemberStatistics, updateMember } from "../../../service/member/memberService"
import type { ApiRequestError, Member, MemberListItem, MemberStatistics, UpdateMemberRequest } from "../../../types/admin"

const PAGE_SIZE = 10

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Ngừng hoạt động",
}

const STATUS_FILTERS = [
  { value: "", label: "Tất cả trạng thái" },
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]

const GENDER_LABELS: Record<string, string> = {
  MALE: "Nam",
  FEMALE: "Nữ",
  OTHER: "Khác",
}

const GENDER_OPTIONS = [
  { value: "", label: "Chọn giới tính" },
  { value: "MALE", label: "Nam" },
  { value: "FEMALE", label: "Nữ" },
  { value: "OTHER", label: "Khác" },
]

const EMPTY_STATS: MemberStatistics = {
  totalMembers: 0,
  activeMembers: 0,
  inactiveMembers: 0,
  totalPointBalance: 0,
}

interface MemberFormValues {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: string
  avatar: string
  status: string
}

type MemberFieldName = keyof MemberFormValues
type MemberFieldErrors = Partial<Record<MemberFieldName, string>>
type TouchedFields = Partial<Record<MemberFieldName, boolean>>

const initialFormValues: MemberFormValues = {
  fullName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  gender: "",
  avatar: "",
  status: "ACTIVE",
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

function toFormValues(member: Member): MemberFormValues {
  return {
    fullName: member.fullName || "",
    email: member.email || "",
    phone: member.phone || "",
    dateOfBirth: member.dateOfBirth || "",
    gender: member.gender || "",
    avatar: member.avatar || "",
    status: member.status || "ACTIVE",
  }
}

function cleanOptional(value: string) {
  const trimmed = value.trim()
  return trimmed || undefined
}

function formatNumber(value?: number) {
  return new Intl.NumberFormat("vi-VN").format(value || 0)
}

function formatMemberCode(member: Pick<Member, "id" | "memberCode">) {
  return member.memberCode || `MB${String(member.id).padStart(6, "0")}`
}

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("vi-VN").format(date)
}

function formatDateTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "-"
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date)
}

function initials(name?: string) {
  const parts = (name || "?").trim().split(/\s+/)
  return parts.slice(-2).map((part) => part[0]?.toUpperCase()).join("") || "?"
}

function statusLabel(status?: string) {
  return STATUS_LABELS[status || ""] || status || "-"
}

function genderLabel(gender?: string) {
  return GENDER_LABELS[gender || ""] || gender || "-"
}

function validate(values: MemberFormValues): MemberFieldErrors {
  const errors: MemberFieldErrors = {}
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const phonePattern = /^(0[0-9]{9,10}|\+84[0-9]{9,10})$/

  if (!values.fullName.trim()) {
    errors.fullName = "Họ và tên không được để trống."
  }
  if (!values.email.trim()) {
    errors.email = "Email không được để trống."
  } else if (!emailPattern.test(values.email.trim())) {
    errors.email = "Email không đúng định dạng."
  }
  if (values.phone.trim() && !phonePattern.test(values.phone.trim())) {
    errors.phone = "Số điện thoại không hợp lệ."
  }
  if (values.dateOfBirth) {
    const selectedDate = new Date(`${values.dateOfBirth}T00:00:00`)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    if (Number.isNaN(selectedDate.getTime()) || selectedDate > today) {
      errors.dateOfBirth = "Ngày sinh không hợp lệ."
    }
  }
  if (values.avatar.trim()) {
    try {
      new URL(values.avatar.trim())
    } catch {
      errors.avatar = "Link ảnh đại diện không hợp lệ."
    }
  }

  return errors
}

function MemberList() {
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [members, setMembers] = useState<MemberListItem[]>([])
  const [statistics, setStatistics] = useState<MemberStatistics>(EMPTY_STATS)
  const [searchTerm, setSearchTerm] = useState("")
  const [keyword, setKeyword] = useState("")
  const [status, setStatus] = useState("")
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [successMessage, setSuccessMessage] = useState("")
  const [detailMember, setDetailMember] = useState<Member | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [values, setValues] = useState<MemberFormValues>(initialFormValues)
  const [fieldErrors, setFieldErrors] = useState<MemberFieldErrors>({})
  const [touched, setTouched] = useState<TouchedFields>({})
  const [submitAttempted, setSubmitAttempted] = useState(false)
  const [saving, setSaving] = useState(false)
  const visiblePages = useMemo(() => getVisiblePages(page, totalPages), [page, totalPages])
  const firstItemIndex = totalElements === 0 ? 0 : page * PAGE_SIZE + 1
  const lastItemIndex = Math.min(page * PAGE_SIZE + members.length, totalElements)
  const hasActiveFilter = Boolean(keyword || status)

  const refreshStatistics = useCallback(() => {
    getMemberStatistics()
      .then(setStatistics)
      .catch(() => setStatistics(EMPTY_STATS))
  }, [])

  useEffect(() => {
    refreshStatistics()
  }, [refreshStatistics])

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

    getMembers({ page, size: PAGE_SIZE, keyword, status })
      .then((data) => {
        if (ignore) return
        setMembers(data.content || [])
        setTotalPages(data.totalPages || 0)
        setTotalElements(data.totalElements || 0)

        if (data.totalPages > 0 && page >= data.totalPages) {
          setPage(data.totalPages - 1)
        }
      })
      .catch(() => {
        if (!ignore) setError("Không thể tải danh sách thành viên. Vui lòng thử lại.")
      })
      .finally(() => {
        if (!ignore) setLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [keyword, page, status])

  function refreshCurrentPage() {
    setLoading(true)
    setError("")
    refreshStatistics()
    getMembers({ page, size: PAGE_SIZE, keyword, status })
      .then((data) => {
        setMembers(data.content || [])
        setTotalPages(data.totalPages || 0)
        setTotalElements(data.totalElements || 0)
      })
      .catch(() => setError("Không thể tải danh sách thành viên. Vui lòng thử lại."))
      .finally(() => setLoading(false))
  }

  function handleResetFilters() {
    setSearchTerm("")
    setKeyword("")
    setStatus("")
    setPage(0)
  }

  function openDetail(memberId: number) {
    setDetailLoading(true)
    setError("")
    getMember(memberId)
      .then(setDetailMember)
      .catch(() => setError("Không thể tải chi tiết thành viên. Vui lòng thử lại."))
      .finally(() => setDetailLoading(false))
  }

  function openEdit(member: Member) {
    setDetailMember(null)
    setEditingMember(member)
    setValues(toFormValues(member))
    setFieldErrors({})
    setTouched({})
    setSubmitAttempted(false)
    setError("")
  }

  function shouldShowError(name: MemberFieldName) {
    return Boolean(fieldErrors[name] && (touched[name] || submitAttempted))
  }

  function fieldError(name: MemberFieldName) {
    if (!shouldShowError(name)) return null

    return (
      <small className="member-field-error" role="alert">
        {fieldErrors[name]}
      </small>
    )
  }

  function updateField(name: MemberFieldName, value: string) {
    const nextValues = { ...values, [name]: value }
    const nextErrors = validate(nextValues)

    setValues(nextValues)
    setFieldErrors((current) => ({
      ...current,
      [name]: touched[name] || submitAttempted ? nextErrors[name] : "",
    }))
  }

  function handleFieldBlur(name: MemberFieldName) {
    setTouched((current) => ({ ...current, [name]: true }))
    setFieldErrors((current) => ({ ...current, [name]: validate(values)[name] }))
  }

  function buildUpdatePayload(): UpdateMemberRequest {
    return {
      fullName: values.fullName.trim(),
      email: cleanOptional(values.email),
      phone: cleanOptional(values.phone),
      dateOfBirth: cleanOptional(values.dateOfBirth),
      gender: cleanOptional(values.gender),
      avatar: cleanOptional(values.avatar),
      status: values.status,
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingMember) return

    setSubmitAttempted(true)
    const nextErrors = validate(values)
    setFieldErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSaving(true)
    setError("")
    updateMember(editingMember.id, buildUpdatePayload())
      .then(() => {
        setEditingMember(null)
        setSuccessMessage("Đã cập nhật thông tin thành viên.")
        refreshCurrentPage()
      })
      .catch((requestError: ApiRequestError) => {
        if (requestError.fieldErrors) {
          setFieldErrors(requestError.fieldErrors)
          setSubmitAttempted(true)
        }
        setError(requestError.message || "Không thể cập nhật thành viên. Vui lòng thử lại.")
      })
      .finally(() => setSaving(false))
  }

  const emptyTitle = hasActiveFilter ? "Không tìm thấy thành viên phù hợp" : "Chưa có thành viên nào"
  const emptyDescription = hasActiveFilter
    ? "Thử thay đổi từ khóa hoặc bộ lọc."
    : "Thành viên đăng ký tài khoản sẽ xuất hiện tại đây."

  return (
    <main className="app-shell member-page">
      <header className="member-page-header">
        <div>
          <h1>Quản lý thành viên</h1>
          <p>Quản lý thông tin và tài khoản thành viên rạp</p>
        </div>
      </header>

      <section className="member-stats" aria-label="Thống kê thành viên">
        <article className="member-stat-card member-stat-card-blue">
          <div className="member-stat-icon"><Users size={24} /></div>
          <div>
            <span>Tổng thành viên</span>
            <strong>{formatNumber(statistics.totalMembers)}</strong>
            <small>Dữ liệu từ hệ thống</small>
          </div>
        </article>
        <article className="member-stat-card member-stat-card-green">
          <div className="member-stat-icon"><UserCheck size={24} /></div>
          <div>
            <span>Đang hoạt động</span>
            <strong>{formatNumber(statistics.activeMembers)}</strong>
            <small>{statistics.totalMembers ? `${Math.round((statistics.activeMembers / statistics.totalMembers) * 100)}% tổng thành viên` : "Chưa có dữ liệu"}</small>
          </div>
        </article>
        <article className="member-stat-card member-stat-card-red">
          <div className="member-stat-icon"><UserX size={24} /></div>
          <div>
            <span>Ngừng hoạt động</span>
            <strong>{formatNumber(statistics.inactiveMembers)}</strong>
            <small>{statistics.totalMembers ? `${Math.round((statistics.inactiveMembers / statistics.totalMembers) * 100)}% tổng thành viên` : "Chưa có dữ liệu"}</small>
          </div>
        </article>
        <article className="member-stat-card member-stat-card-gold">
          <div className="member-stat-icon"><Coins size={24} /></div>
          <div>
            <span>Tổng điểm thành viên</span>
            <strong>{formatNumber(statistics.totalPointBalance)}</strong>
            <small>Tổng điểm tích lũy</small>
          </div>
        </article>
      </section>

      <section className="member-toolbar" aria-label="Tìm kiếm và lọc thành viên">
        <label className="member-search-field">
          <Search size={22} aria-hidden="true" />
          <span>Tìm kiếm</span>
          <input
            name="keyword"
            type="search"
            placeholder="Tìm kiếm theo mã, tên, email hoặc số điện thoại..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </label>

        <label className="member-filter-field">
          <span>Trạng thái</span>
          <select
            aria-label="Lọc trạng thái thành viên"
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

        <button type="button" className="secondary-button member-refresh-button" onClick={refreshCurrentPage}>
          <RefreshCw size={16} aria-hidden="true" />
          Làm mới
        </button>
      </section>

      {successMessage && <div className="member-alert member-alert-success">{successMessage}</div>}
      {error && <div className="member-alert member-alert-error">{error}</div>}

      {loading && (
        <div className="member-table-card" aria-label="Đang tải danh sách thành viên">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="member-skeleton-row" key={index}>
              <span className="member-skeleton-avatar" />
              <span className="member-skeleton-lines" />
              <span />
              <span />
              <span />
              <span />
            </div>
          ))}
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <section className="member-empty-state">
          <div className="member-empty-icon"><Users size={34} /></div>
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
          {hasActiveFilter && (
            <button type="button" className="secondary-button" onClick={handleResetFilters}>
              Xóa bộ lọc
            </button>
          )}
        </section>
      )}

      {!loading && !error && members.length > 0 && (
        <div className="member-table-card">
          <table className="member-table">
            <thead>
              <tr>
                <th>Thành viên</th>
                <th>Mã thành viên</th>
                <th>Liên hệ</th>
                <th>Điểm</th>
                <th>Trạng thái</th>
                <th className="action-column">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id}>
                  <td>
                    <div className="member-identity">
                      <div className="member-avatar">
                        {member.avatar ? <img src={member.avatar} alt={member.fullName} /> : <span>{initials(member.fullName)}</span>}
                      </div>
                      <div>
                        <strong>{member.fullName}</strong>
                        <span>{member.username}</span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <strong className="member-code">{formatMemberCode(member)}</strong>
                  </td>
                  <td>
                    <div className="member-contact">
                      <strong>{member.email || "-"}</strong>
                      <span>{member.phone || "-"}</span>
                    </div>
                  </td>
                  <td>
                    <strong className="member-points">{formatNumber(member.pointBalance)} điểm</strong>
                  </td>
                  <td>
                    <span className={`status-badge status-${member.status?.toLowerCase() || "unknown"}`}>
                      <span aria-hidden="true">●</span>
                      {statusLabel(member.status)}
                    </span>
                  </td>
                  <td className="member-actions action-column">
                    <button type="button" className="edit-button member-action-view" onClick={() => openDetail(member.id)}>
                      <Eye size={15} aria-hidden="true" />
                      Xem
                    </button>
                    <button type="button" className="primary-button member-action-edit" onClick={() => openEdit(member)}>
                      <Pencil size={15} aria-hidden="true" />
                      Sửa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <nav className="pagination member-pagination" aria-label="Phân trang thành viên">
            <span className="pagination-summary">
              Hiển thị {firstItemIndex}-{lastItemIndex} / {totalElements} thành viên
            </span>
            <button type="button" className="pagination-button" disabled={page === 0} onClick={() => setPage((current) => Math.max(current - 1, 0))}>
              &lt;
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
              &gt;
            </button>
          </nav>
        </div>
      )}

      {detailLoading && (
        <AppModal title="Chi tiết thành viên" subtitle="Đang tải thông tin thành viên" size="lg" onClose={() => setDetailLoading(false)}>
          <div className="member-skeleton-row" />
          <div className="member-skeleton-row" />
        </AppModal>
      )}

      {detailMember && (
        <AppModal
          title="Chi tiết thành viên"
          size="lg"
          onClose={() => setDetailMember(null)}
          footer={
            <>
              <button type="button" className="secondary-button modal__button" onClick={() => setDetailMember(null)}>
                Đóng
              </button>
              <button type="button" className="primary-button modal__button" onClick={() => openEdit(detailMember)}>
                <Pencil size={15} aria-hidden="true" />
                Chỉnh sửa
              </button>
            </>
          }
        >
          <div className="member-profile">
            <aside className="member-profile-summary">
              <div className="member-profile-avatar">
                {detailMember.avatar ? <img src={detailMember.avatar} alt={detailMember.fullName} /> : <span>{initials(detailMember.fullName)}</span>}
              </div>
              <h3>{detailMember.fullName}</h3>
              <span className={`status-badge status-${detailMember.status?.toLowerCase() || "unknown"}`}>
                <span aria-hidden="true">●</span>
                {statusLabel(detailMember.status)}
              </span>
              <dl>
                <div>
                  <dt>Mã thành viên</dt>
                  <dd>{formatMemberCode(detailMember)}</dd>
                </div>
                <div>
                  <dt>Tên đăng nhập</dt>
                  <dd>{detailMember.username}</dd>
                </div>
                <div>
                  <dt>Ngày tham gia</dt>
                  <dd>{formatDate(detailMember.createdAt)}</dd>
                </div>
                <div>
                  <dt>Điểm hiện tại</dt>
                  <dd>{formatNumber(detailMember.pointBalance)} điểm</dd>
                </div>
              </dl>
            </aside>
            <section className="member-profile-details">
              <div className="member-detail-panel">
                <h3>Thông tin cá nhân</h3>
                <div className="member-detail-grid">
                  <span>Họ và tên</span>
                  <strong>{detailMember.fullName}</strong>
                  <span>Ngày sinh</span>
                  <strong>{formatDate(detailMember.dateOfBirth)}</strong>
                  <span>Giới tính</span>
                  <strong>{genderLabel(detailMember.gender)}</strong>
                  <span>Email</span>
                  <strong>{detailMember.email || "-"}</strong>
                  <span>Số điện thoại</span>
                  <strong>{detailMember.phone || "-"}</strong>
                  <span>Địa chỉ</span>
                  <strong>-</strong>
                </div>
              </div>
              <div className="member-detail-panel">
                <h3>Thông tin thành viên</h3>
                <div className="member-detail-grid">
                  <span>Mã thành viên</span>
                  <strong>{formatMemberCode(detailMember)}</strong>
                  <span>Điểm tích lũy</span>
                  <strong>{formatNumber(detailMember.pointBalance)} điểm</strong>
                  <span>Hạng thành viên</span>
                  <strong>{detailMember.membershipLevel || "-"}</strong>
                  <span>Trạng thái</span>
                  <strong>{statusLabel(detailMember.status)}</strong>
                  <span>Ngày tạo tài khoản</span>
                  <strong>{formatDateTime(detailMember.createdAt)}</strong>
                </div>
              </div>
            </section>
          </div>
        </AppModal>
      )}

      {editingMember && (
        <AppModal
          title="Chỉnh sửa thành viên"
          subtitle="Cập nhật thông tin thành viên"
          size="lg"
          onClose={() => setEditingMember(null)}
          footer={
            <>
              <button type="button" className="secondary-button modal__button" disabled={saving} onClick={() => setEditingMember(null)}>
                Hủy
              </button>
              <button type="submit" form="member-edit-form" className="primary-button modal__button" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </button>
            </>
          }
        >
          <form id="member-edit-form" className="member-form" onSubmit={handleSubmit} noValidate>
            <section className="member-avatar-editor">
              <span>Ảnh đại diện</span>
              <div className="member-avatar-editor-row">
                <div className="member-profile-avatar member-edit-avatar">
                  {values.avatar ? <img src={values.avatar} alt={values.fullName} /> : <span>{initials(values.fullName)}</span>}
                </div>
                <div>
                  <button type="button" className="secondary-button member-avatar-button" onClick={() => avatarInputRef.current?.focus()}>
                    <Upload size={15} aria-hidden="true" />
                    Thay đổi ảnh
                  </button>
                  <small>Giữ URL ảnh hiện tại. JPG, PNG hoặc WebP.</small>
                </div>
              </div>
            </section>

            <label className="member-field">
              <span>Mã thành viên</span>
              <input value={formatMemberCode(editingMember)} readOnly />
            </label>
            <label className="member-field">
              <span>Tên đăng nhập</span>
              <input value={editingMember.username} readOnly />
            </label>
            <label className="member-field">
              <span>Họ và tên *</span>
              <input
                value={values.fullName}
                className={shouldShowError("fullName") ? "is-invalid" : undefined}
                aria-invalid={shouldShowError("fullName")}
                onBlur={() => handleFieldBlur("fullName")}
                onChange={(event) => updateField("fullName", event.target.value)}
              />
              {fieldError("fullName")}
            </label>
            <label className="member-field">
              <span>Ngày sinh</span>
              <div className="member-date-field">
                <input
                  type="date"
                  value={values.dateOfBirth}
                  className={shouldShowError("dateOfBirth") ? "is-invalid" : undefined}
                  aria-invalid={shouldShowError("dateOfBirth")}
                  onBlur={() => handleFieldBlur("dateOfBirth")}
                  onChange={(event) => updateField("dateOfBirth", event.target.value)}
                />
                <Calendar size={15} aria-hidden="true" />
              </div>
              {fieldError("dateOfBirth")}
            </label>
            <label className="member-field">
              <span>Giới tính</span>
              <select value={values.gender} onChange={(event) => updateField("gender", event.target.value)}>
                {GENDER_OPTIONS.map((option) => (
                  <option key={option.value || "empty"} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="member-field">
              <span>Email *</span>
              <input
                type="email"
                value={values.email}
                className={shouldShowError("email") ? "is-invalid" : undefined}
                aria-invalid={shouldShowError("email")}
                onBlur={() => handleFieldBlur("email")}
                onChange={(event) => updateField("email", event.target.value)}
              />
              {fieldError("email")}
            </label>
            <label className="member-field">
              <span>Số điện thoại</span>
              <input
                value={values.phone}
                className={shouldShowError("phone") ? "is-invalid" : undefined}
                aria-invalid={shouldShowError("phone")}
                onBlur={() => handleFieldBlur("phone")}
                onChange={(event) => updateField("phone", event.target.value)}
              />
              {fieldError("phone")}
            </label>
            <label className="member-field">
              <span>Trạng thái</span>
              <select value={values.status} onChange={(event) => updateField("status", event.target.value)}>
                {STATUS_FILTERS.filter((option) => option.value).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="member-field member-field-full">
              <span>Ảnh đại diện</span>
              <input
                ref={avatarInputRef}
                value={values.avatar}
                className={shouldShowError("avatar") ? "is-invalid" : undefined}
                aria-invalid={shouldShowError("avatar")}
                placeholder="Dán link ảnh đại diện"
                onBlur={() => handleFieldBlur("avatar")}
                onChange={(event) => updateField("avatar", event.target.value)}
              />
              {fieldError("avatar")}
            </label>
            <label className="member-field member-field-full">
              <span>Địa chỉ</span>
              <input value="-" readOnly />
            </label>
          </form>
        </AppModal>
      )}
    </main>
  )
}

export default MemberList
