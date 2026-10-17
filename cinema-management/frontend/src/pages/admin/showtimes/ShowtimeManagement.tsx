import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { CalendarClock, Plus, RefreshCw, Pencil, Ban } from "lucide-react"
import AppModal from "../../../component/common/AppModal"
import { cancelShowtime, getAdminShowtimes, getSchedulingOptions, saveShowtime } from "../../../service/showtime/adminShowtimeService"
import type { AdminMovie, CinemaRoom } from "../../../types/admin"
import type { ShowtimeData } from "../../../types/showtime/showtime"
import "../../../styles/showtime-admin.css"

const cinemaZone = "Asia/Ho_Chi_Minh"
function cinemaDate() {
  const parts = new Intl.DateTimeFormat("en", { timeZone: cinemaZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date())
  const part = (type: string) => parts.find((p) => p.type === type)?.value
  return `${part("year")}-${part("month")}-${part("day")}`
}
function displayTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", { timeZone: cinemaZone, hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }).format(new Date(`${value}+07:00`))
}
const blankForm = (date: string) => ({ movieId: "", roomId: "", startTime: `${date}T09:00`, format: "2D" })
type Values = ReturnType<typeof blankForm>
const statusLabels: Record<string, string> = { OPEN: "Đang mở", CANCELLED: "Đã hủy", CLOSED: "Đã đóng", FINISHED: "Đã kết thúc" }
function roomFormats(roomType?: string) { return roomType === "IMAX" ? ["2D", "3D", "IMAX"] : roomType === "3D" ? ["2D", "3D"] : roomType === "4DX" ? ["2D", "4DX"] : ["2D"] }

function ShowtimeManagement() {
  const [date, setDate] = useState(cinemaDate)
  const [currentTime, setCurrentTime] = useState(() => Date.now())
  const [showtimes, setShowtimes] = useState<ShowtimeData[]>([])
  const [movies, setMovies] = useState<AdminMovie[]>([])
  const [rooms, setRooms] = useState<CinemaRoom[]>([])
  const [roomFilter, setRoomFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [keyword, setKeyword] = useState("")
  const [loading, setLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(true)
  const [error, setError] = useState("")
  const [optionsError, setOptionsError] = useState("")
  const [success, setSuccess] = useState("")
  const [refresh, setRefresh] = useState(0)
  const [optionsRefresh, setOptionsRefresh] = useState(0)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<ShowtimeData | null>(null)
  const [values, setValues] = useState<Values>(() => blankForm(date))
  const [original, setOriginal] = useState<Values>(() => blankForm(date))
  const [errors, setErrors] = useState<Partial<Record<keyof Values, string>>>({})
  const [formError, setFormError] = useState("")
  const [saving, setSaving] = useState(false)
  const [cancelTarget, setCancelTarget] = useState<ShowtimeData | null>(null)
  const [cancelError, setCancelError] = useState("")
  const [cancelling, setCancelling] = useState(false)
  const saveRef = useRef(false)
  const cancelRef = useRef(false)

  useEffect(() => {
    const timer = window.setInterval(() => setCurrentTime(Date.now()), 30_000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    let ignore = false
    setOptionsLoading(true); setOptionsError("")
    getSchedulingOptions().then((data) => { if (!ignore) { setMovies(data.movies); setRooms(data.rooms) } })
      .catch((e: Error) => { if (!ignore) setOptionsError(e.message) })
      .finally(() => { if (!ignore) setOptionsLoading(false) })
    return () => { ignore = true }
  }, [optionsRefresh])

  useEffect(() => {
    if (!date) return
    let ignore = false
    setLoading(true); setError("")
    getAdminShowtimes(date).then((data) => { if (!ignore) setShowtimes(data) })
      .catch((e: Error) => { if (!ignore) setError(e.message) })
      .finally(() => { if (!ignore) setLoading(false) })
    return () => { ignore = true }
  }, [date, refresh])

  const filtered = useMemo(() => showtimes.filter((s) => (!roomFilter || s.roomId === Number(roomFilter))
    && (!statusFilter || s.status === statusFilter)
    && `${s.movieTitle} ${s.roomName}`.toLocaleLowerCase("vi").includes(keyword.trim().toLocaleLowerCase("vi")))
    .sort((a, b) => a.startTime.localeCompare(b.startTime)), [showtimes, roomFilter, statusFilter, keyword])
  const selectedMovie = movies.find((m) => m.id === Number(values.movieId))
  const formats = roomFormats(rooms.find((r) => r.id === Number(values.roomId))?.roomType)
  const endTime = selectedMovie && values.startTime && !Number.isNaN(Date.parse(`${values.startTime}+07:00`))
    ? new Date(Date.parse(`${values.startTime}+07:00`) + selectedMovie.durationMinutes * 60_000).toLocaleString("vi-VN", { timeZone: cinemaZone }) : "Chọn phim và giờ bắt đầu"
  const dirty = JSON.stringify(values) !== JSON.stringify(original)
  const canEdit = (s: ShowtimeData) => s.status === "OPEN" && Date.parse(`${s.startTime}+07:00`) > currentTime

  function openForm(showtime?: ShowtimeData) {
    const next = showtime ? { movieId: String(showtime.movieId), roomId: String(showtime.roomId), startTime: showtime.startTime.slice(0, 16), format: showtime.format || "2D" } : blankForm(date)
    setEditing(showtime || null); setValues(next); setOriginal(next); setErrors({}); setFormError(""); setFormOpen(true)
  }
  function field(name: keyof Values, value: string) { setValues((current) => ({ ...current, [name]: value, ...(name === "roomId" ? { format: "2D" } : {}) })); setErrors((current) => ({ ...current, [name]: undefined })) }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saveRef.current) return
    const nextErrors: typeof errors = {}
    if (!selectedMovie) nextErrors.movieId = "Vui lòng chọn phim đang chiếu hoặc sắp chiếu."
    if (!values.roomId) nextErrors.roomId = "Vui lòng chọn phòng chiếu."
    const start = Date.parse(`${values.startTime}+07:00`)
    if (!Number.isFinite(start) || start <= Date.now()) nextErrors.startTime = "Chọn giờ bắt đầu ở tương lai (giờ Việt Nam)."
    else if (selectedMovie?.releaseDate && values.startTime.slice(0, 10) < selectedMovie.releaseDate) nextErrors.startTime = "Không thể xếp lịch trước ngày phát hành phim."
    setErrors(nextErrors); setFormError("")
    if (Object.keys(nextErrors).length) return
    saveRef.current = true; setSaving(true)
    try {
      await saveShowtime({ movieId: Number(values.movieId), roomId: Number(values.roomId), startTime: `${values.startTime}:00`, format: values.format }, editing?.id)
      setFormOpen(false); setDate(values.startTime.slice(0, 10)); setRefresh((r) => r + 1)
      setSuccess(editing ? "Đã cập nhật suất chiếu." : "Đã xếp lịch chiếu mới.")
    } catch (e) { setFormError(e instanceof Error ? e.message : "Không thể lưu suất chiếu.") }
    finally { saveRef.current = false; setSaving(false) }
  }

  async function confirmCancel() {
    if (!cancelTarget || cancelRef.current) return
    cancelRef.current = true; setCancelling(true); setCancelError("")
    try {
      await cancelShowtime(cancelTarget.id)
      setCancelTarget(null); setSuccess("Đã hủy suất chiếu."); setRefresh((r) => r + 1)
    } catch (e) { setCancelError(e instanceof Error ? e.message : "Không thể hủy suất chiếu.") }
    finally { cancelRef.current = false; setCancelling(false) }
  }

  return <main className="movie-admin-page schedule-page">
    <header className="movie-page-header">
      <div><h1>Quản lý lịch chiếu</h1><p>Xếp suất chiếu theo phim, phòng và thời gian.</p></div>
      <button className="primary-button" type="button" disabled={optionsLoading || Boolean(optionsError)} onClick={() => openForm()}><Plus size={18} aria-hidden="true" /> Xếp lịch mới</button>
    </header>
    <div className="schedule-info"><CalendarClock size={20} aria-hidden="true" /><span>Giờ Việt Nam · Giờ kết thúc tính theo thời lượng phim · Cách nhau ít nhất 15 phút để dọn phòng.</span></div>
    {optionsError && <div className="movie-alert movie-alert-error" role="alert">{optionsError} <button type="button" className="secondary-button" onClick={() => setOptionsRefresh((r) => r + 1)}>Tải lại phim/phòng</button></div>}
    {success && <div className="schedule-success" role="status">{success}<button type="button" aria-label="Đóng thông báo" onClick={() => setSuccess("")}>×</button></div>}
    <section className="schedule-filters" aria-label="Lọc lịch chiếu">
      <label>Ngày chiếu<input type="date" value={date} onChange={(e) => { if (e.target.value) setDate(e.target.value) }} /></label>
      <label>Phòng chiếu<select value={roomFilter} onChange={(e) => setRoomFilter(e.target.value)}><option value="">Tất cả phòng</option>{Array.from(new Map([...rooms.map((r) => [r.id, r.name] as const), ...showtimes.map((s) => [s.roomId, s.roomName] as const)]).entries()).map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select></label>
      <label>Trạng thái<select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}><option value="">Tất cả trạng thái</option>{Array.from(new Set([...Object.keys(statusLabels), ...showtimes.map((s) => s.status || "")])).filter(Boolean).map((s) => <option key={s} value={s}>{statusLabels[s] || s}</option>)}</select></label>
      <label>Tìm phim/phòng<input type="search" value={keyword} placeholder="Nhập tên phim hoặc phòng…" onChange={(e) => setKeyword(e.target.value)} /></label>
      <button type="button" className="secondary-button" disabled={loading} onClick={() => setRefresh((r) => r + 1)}><RefreshCw size={16} aria-hidden="true" /> Làm mới</button>
    </section>
    {error && <div className="movie-alert movie-alert-error" role="alert">{error}<button className="secondary-button" type="button" onClick={() => setRefresh((r) => r + 1)}>Thử lại</button></div>}
    {loading && <div className="movie-alert" role="status">Đang tải lịch chiếu…</div>}
    {!loading && !error && <>
      <p className="schedule-summary">{filtered.length} suất chiếu · {new Set(filtered.map((s) => s.roomId)).size} phòng</p>
      {filtered.length === 0 ? <section className="movie-empty-state"><CalendarClock size={32} aria-hidden="true" /><h2>Chưa có suất chiếu phù hợp</h2><p>Đổi bộ lọc hoặc chọn “Xếp lịch mới” để tạo suất chiếu.</p></section> : <div className="movie-table-card"><table className="movie-admin-table schedule-table"><thead><tr><th>Phim</th><th>Phòng / Định dạng</th><th>Bắt đầu</th><th>Kết thúc</th><th>Ghế trống / Tổng</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>{filtered.map((s) => <tr key={s.id}>
        <td><strong>{s.movieTitle}</strong><small>{s.durationMinutes} phút</small></td><td>{s.roomName}<small>{s.format || s.roomType}</small></td>
        <td>{displayTime(s.startTime)}</td><td>{s.endTime ? displayTime(s.endTime) : "—"}</td><td>{s.availableSeats} / {s.totalSeats}</td>
        <td><span className={`status-badge ${s.status === "OPEN" ? "status-showing" : "status-inactive"}`}>{statusLabels[s.status || ""] || s.status || "—"}</span></td>
        <td><div className="admin-row-actions"><button type="button" className="admin-action-button" disabled={!canEdit(s)} aria-label={`Sửa suất ${s.movieTitle} lúc ${s.startTime}`} onClick={() => openForm(s)}><Pencil size={16} aria-hidden="true" /></button><button type="button" className="admin-action-button admin-action-danger" disabled={!canEdit(s)} aria-label={`Hủy suất ${s.movieTitle} lúc ${s.startTime}`} onClick={() => { setCancelTarget(s); setCancelError("") }}><Ban size={16} aria-hidden="true" /></button></div></td>
      </tr>)}</tbody></table></div>}
    </>}
    {formOpen && <AppModal title={editing ? "Chỉnh sửa suất chiếu" : "Xếp lịch chiếu mới"} size="md" busy={saving} confirmClose={dirty} onClose={() => setFormOpen(false)} footer={<button type="submit" className="primary-button modal__button" form="schedule-form" disabled={saving}>{saving ? "Đang lưu…" : "Lưu suất chiếu"}</button>}>
      <form id="schedule-form" className="schedule-form" noValidate onSubmit={submit}>
        {formError && <div role="alert" className="movie-alert movie-alert-error">{formError}</div>}
        <label>Phim *<select value={values.movieId} aria-invalid={Boolean(errors.movieId)} aria-describedby={errors.movieId ? "schedule-movie-error" : undefined} onChange={(e) => field("movieId", e.target.value)}><option value="">Chọn phim</option>{movies.map((m) => <option value={m.id} key={m.id}>{m.title} · {m.durationMinutes} phút</option>)}</select>{errors.movieId && <small id="schedule-movie-error" role="alert">{errors.movieId}</small>}</label>
        <label>Phòng chiếu *<select disabled={Boolean(editing)} value={values.roomId} aria-invalid={Boolean(errors.roomId)} onChange={(e) => field("roomId", e.target.value)}><option value="">Chọn phòng đang hoạt động</option>{rooms.map((r) => <option key={r.id} value={r.id}>{r.name} · {r.roomType}</option>)}{editing && !rooms.some((r) => r.id === editing.roomId) && <option value={editing.roomId}>{editing.roomName}</option>}</select>{errors.roomId && <small role="alert">{errors.roomId}</small>}</label>
        {editing && <p>Để đổi phòng, hãy hủy suất hiện tại và xếp suất mới. Suất đã có đặt vé hoặc ghế đang giữ sẽ không thể sửa/hủy.</p>}
        <label>Bắt đầu (giờ Việt Nam) *<input type="datetime-local" value={values.startTime} aria-invalid={Boolean(errors.startTime)} aria-describedby={errors.startTime ? "schedule-time-error" : undefined} onChange={(e) => field("startTime", e.target.value)} />{errors.startTime && <small id="schedule-time-error" role="alert">{errors.startTime}</small>}</label>
        <label>Định dạng<select value={values.format} onChange={(e) => field("format", e.target.value)}>{Array.from(new Set([...formats, ...(editing ? [values.format] : [])])).map((f) => <option key={f}>{f}</option>)}</select></label>
        <div className="schedule-end"><span>Kết thúc dự kiến</span><strong>{endTime}</strong><small>Cần thêm 15 phút dọn phòng trước suất tiếp theo.</small></div>
      </form>
    </AppModal>}
    {cancelTarget && <AppModal title="Hủy suất chiếu?" variant="warning" busy={cancelling} onClose={() => setCancelTarget(null)} actions={[
      { label: "Giữ suất chiếu", variant: "secondary", disabled: cancelling, onClick: () => setCancelTarget(null) },
      { label: cancelling ? "Đang hủy…" : "Hủy suất chiếu", variant: "danger", disabled: cancelling, onClick: confirmCancel },
    ]}><p>{cancelTarget.movieTitle} · {cancelTarget.roomName} · {displayTime(cancelTarget.startTime)}. Suất bị hủy sẽ ngừng mở bán; dữ liệu vẫn được giữ lại.</p>{cancelError && <p role="alert">{cancelError}</p>}</AppModal>}
  </main>
}

export default ShowtimeManagement
