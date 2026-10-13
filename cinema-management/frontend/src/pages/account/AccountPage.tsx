import { useCallback, useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { Award, CalendarClock, RotateCcw, Save, ShieldAlert, UserRound } from "lucide-react"

import type { AuthResponse } from "../../types/auth"
import type { AccountProfile, PointHistoryPage, PointSummary, UpdateAccountPayload } from "../../types/account"
import {
  getAccount,
  getPointHistory,
  getPointSummary,
  requestAccountDeletion,
  restoreAccount,
  updateAccount,
} from "../../service/account/accountService"
import "./account.css"

interface Props {
  currentUser: AuthResponse
  onUserChanged: (user: AuthResponse | null) => void
}

const emptyHistory: PointHistoryPage = {
  content: [], number: 0, totalPages: 0, totalElements: 0, first: true, last: true,
}

function toPayload(profile: AccountProfile): UpdateAccountPayload {
  return {
    fullName: profile.fullName,
    email: profile.email,
    phone: profile.phone,
    dateOfBirth: profile.dateOfBirth,
    gender: profile.gender,
    avatar: profile.avatar,
  }
}

function AccountPage({ currentUser, onUserChanged }: Props) {
  const navigate = useNavigate()
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [form, setForm] = useState<UpdateAccountPayload | null>(null)
  const [summary, setSummary] = useState<PointSummary | null>(null)
  const [history, setHistory] = useState<PointHistoryPage>(emptyHistory)
  const [page, setPage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [password, setPassword] = useState("")
  const [reason, setReason] = useState("")
  const [showDelete, setShowDelete] = useState(false)

  const syncAuth = useCallback((next: AccountProfile) => {
    onUserChanged({
      ...currentUser,
      fullName: next.fullName,
      email: next.email,
      phone: next.phone,
      accountStatus: next.status,
      scheduledDeletionAt: next.scheduledDeletionAt,
    })
  }, [currentUser, onUserChanged])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([
      getAccount(currentUser.userId),
      getPointSummary(currentUser.userId),
      getPointHistory(currentUser.userId, page),
    ]).then(([account, pointSummary, pointHistory]) => {
      if (!active) return
      setProfile(account)
      setForm(toPayload(account))
      setSummary(pointSummary)
      setHistory(pointHistory)
    }).catch((caught: unknown) => {
      if (active) setError(caught instanceof Error ? caught.message : "Không tải được thông tin tài khoản")
    }).finally(() => active && setLoading(false))
    return () => { active = false }
  }, [currentUser.userId, page])

  async function save(event: FormEvent) {
    event.preventDefault()
    if (!form) return
    setSaving(true); setError(""); setMessage("")
    try {
      const updated = await updateAccount(currentUser.userId, form)
      setProfile(updated); setForm(toPayload(updated)); syncAuth(updated)
      setMessage("Đã cập nhật thông tin tài khoản")
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể cập nhật tài khoản")
    } finally { setSaving(false) }
  }

  async function deleteAccount(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("")
    try {
      const updated = await requestAccountDeletion(currentUser.userId, password, reason)
      setProfile(updated); setPassword(""); setShowDelete(false)
      onUserChanged(null)
      navigate("/login", { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể gửi yêu cầu xóa")
    } finally { setSaving(false) }
  }

  async function restore(event: FormEvent) {
    event.preventDefault(); setSaving(true); setError("")
    try {
      const updated = await restoreAccount(currentUser.userId, password)
      setProfile(updated); syncAuth(updated); setPassword("")
      navigate("/account", { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể khôi phục tài khoản")
    } finally { setSaving(false) }
  }

  if (loading || !profile || !form) return <div className="account-loading">Đang tải tài khoản...</div>

  if (profile.status === "PENDING_DELETION") {
    return (
      <section className="account-recovery-card">
        <CalendarClock size={48} />
        <h1>Tài khoản đang tạm khóa</h1>
        <p>Tài khoản sẽ được xóa và ẩn danh sau ngày <strong>{profile.scheduledDeletionAt ? new Date(profile.scheduledDeletionAt).toLocaleString("vi-VN") : "--"}</strong>.</p>
        <p>Bạn có thể khôi phục tài khoản trong thời gian chờ bằng mật khẩu hiện tại.</p>
        {error && <div className="account-alert error">{error}</div>}
        <form onSubmit={restore}>
          <input type="password" placeholder="Mật khẩu hiện tại" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button className="account-primary" disabled={saving}><RotateCcw size={17} /> Khôi phục tài khoản</button>
        </form>
      </section>
    )
  }

  const progressTarget = summary?.membershipLevel === "BASIC" ? 100 : summary?.membershipLevel === "SILVER" ? 300 : summary?.membershipLevel === "GOLD" ? 600 : summary?.pointBalance || 1
  const progress = Math.min(100, ((summary?.pointBalance || 0) / progressTarget) * 100)

  return (
    <main className="account-page">
      <header className="account-title"><div><span>TÀI KHOẢN THÀNH VIÊN</span><h1>Thông tin của tôi</h1></div><UserRound size={38} /></header>
      {message && <div className="account-alert success">{message}</div>}
      {error && <div className="account-alert error">{error}</div>}

      <section className="account-grid">
        <form className="account-card account-form" onSubmit={save}>
          <h2>Thông tin cá nhân</h2>
          <label>Họ và tên<input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required /></label>
          <label>Email<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required /></label>
          <label>Số điện thoại<input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required /></label>
          <label>Ngày sinh<input type="date" value={form.dateOfBirth || ""} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value || null })} /></label>
          <label>Giới tính<select value={form.gender || ""} onChange={(e) => setForm({ ...form, gender: e.target.value || null })}><option value="">Chưa chọn</option><option value="MALE">Nam</option><option value="FEMALE">Nữ</option><option value="OTHER">Khác</option></select></label>
          <label>Ảnh đại diện<input value={form.avatar || ""} onChange={(e) => setForm({ ...form, avatar: e.target.value || null })} placeholder="URL ảnh" /></label>
          <button className="account-primary" disabled={saving}><Save size={17} /> {saving ? "Đang lưu..." : "Lưu thay đổi"}</button>
        </form>

        <aside className="account-card loyalty-card">
          <Award size={34} /><span>{profile.memberCode}</span><h2>{summary?.membershipLevel}</h2>
          <strong>{(summary?.pointBalance || 0).toLocaleString("vi-VN")} điểm</strong>
          <div className="loyalty-progress"><i style={{ width: `${progress}%` }} /></div>
          <p>{summary?.nextLevel ? `Còn ${summary.nextLevelPoints} điểm để lên ${summary.nextLevel}` : "Bạn đang ở hạng cao nhất"}</p>
          <small>Mỗi 10.000đ thực trả được 1 điểm. Điểm không hết hạn.</small>
        </aside>
      </section>

      <section className="account-card point-history">
        <h2>Lịch sử tích điểm</h2>
        {history.content.length === 0 ? <p className="empty">Bạn chưa có giao dịch tích điểm.</p> : (
          <div className="history-list">{history.content.map((item) => <article key={item.id}><div><strong>{item.description || "Giao dịch điểm"}</strong><span>{new Date(item.createdAt).toLocaleString("vi-VN")}{item.bookingCode ? ` · ${item.bookingCode}` : ""}</span></div><b>+{item.points}</b><small>{item.balanceBefore} → {item.balanceAfter} điểm</small></article>)}</div>
        )}
        {history.totalPages > 1 && <nav className="account-pagination"><button disabled={history.first} onClick={() => setPage(page - 1)}>Trước</button><span>{page + 1}/{history.totalPages}</span><button disabled={history.last} onClick={() => setPage(page + 1)}>Sau</button></nav>}
      </section>

      <section className="account-card danger-zone">
        <div><ShieldAlert size={24} /><div><h2>Xóa tài khoản</h2><p>Tài khoản sẽ tạm khóa 30 ngày trước khi được ẩn danh tự động.</p></div></div>
        {!showDelete ? <button onClick={() => setShowDelete(true)}>Yêu cầu xóa</button> : <form onSubmit={deleteAccount}><input type="password" placeholder="Mật khẩu hiện tại" value={password} onChange={(e) => setPassword(e.target.value)} required /><textarea placeholder="Lý do (không bắt buộc)" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} /><div><button type="button" onClick={() => setShowDelete(false)}>Hủy</button><button className="delete-confirm" disabled={saving}>Xác nhận xóa</button></div></form>}
      </section>
    </main>
  )
}

export default AccountPage
