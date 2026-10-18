import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom"

import {
  createShowtimeBatch,
  displayTime,
  getAdminShowtimes,
  getRoomAvailability,
  getShowtimeOptions,
  previewShowtimeBatch,
  ShowtimeError,
  vietnamNow,
} from "../../../service/showtime/adminShowtimeService"

import type {
  BatchPreviewItem,
  CreateShowtimeBatch,
  RoomAvailability,
  ShowtimeFilters,
  ShowtimeOptions,
  ShowtimePageData,
} from "../../../service/showtime/adminShowtimeService"

import "../statistics/statistics.css"
import "./admin-showtimes.css"
import { clearStoredUser } from "../../../hooks/useAuth"

const statusLabels: Record<string, string> = {
  OPEN: "Mở bán",
  CLOSED: "Đóng bán",
  PAUSED: "Ngừng bán",
  CANCELLED: "Đã hủy",
  DRAFT: "Nháp",
}

const statusLabel = (value: string | null) =>
  value ? statusLabels[value] || value : "Chưa xác định"

// Màu nhãn trạng thái theo các lớp status-* dùng chung trong styles/admin-ui.css.
const statusTone = (value: string | null) => {
  switch (value) {
    case "OPEN":
      return "status-active"
    case "DRAFT":
    case "PAUSED":
      return "status-pending"
    case "CANCELLED":
      return "status-inactive"
    default:
      return "status-ended"
  }
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Không thể xử lý lịch chiếu"

function ErrorNotice({
  error,
  retry,
}: {
  error: unknown
  retry?: () => void
}) {
  return (
    <div className="statistics-state statistics-error" role="alert">
      <p>{message(error)}</p>

      {error instanceof ShowtimeError && error.status === 401 ? (
        <button
          type="button"
          onClick={() => {
            clearStoredUser()
            window.location.assign("/login")
          }}
        >
          Đăng nhập lại
        </button>
      ) : (
        retry && (
          <button type="button" onClick={retry}>
            Thử lại
          </button>
        )
      )}
    </div>
  )
}

export function AdminShowtimePage({
  create = false,
}: {
  create?: boolean
}) {
  const navigate = useNavigate()
  const location = useLocation()

  const [options, setOptions] = useState<ShowtimeOptions | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    const controller = new AbortController()

    setOptions(null)
    setError(null)

    getShowtimeOptions(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setOptions(data)
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setError(cause)
        }
      })

    return () => controller.abort()
  }, [revision])

  return (
    <div className="statistics-page ast-page">
      <header className="statistics-heading">
        <div>
          <h1>{create ? "Thêm suất chiếu" : "Quản lý lịch chiếu"}</h1>

          <p>
            {create
              ? "Chọn phim, phòng và ngày để xem giờ trống, rồi thêm nhanh nhiều suất cùng lúc."
              : "Tra cứu suất chiếu theo ngày, phim và phòng. Giờ hiển thị theo Việt Nam."}
          </p>
        </div>

        <button
          type="button"
          className={create ? "" : "statistics-primary"}
          onClick={() =>
            navigate(
              `/admin/showtimes${create ? "" : "/create"}${location.search}`,
            )
          }
        >
          {create ? "Về danh sách" : "Thêm suất chiếu"}
        </button>
      </header>

      {error ? (
        <ErrorNotice
          error={error}
          retry={() => setRevision(value => value + 1)}
        />
      ) : !options ? (
        <p className="statistics-state" role="status">
          Đang tải thông tin phim và phòng…
        </p>
      ) : create ? (
        <ShowtimeCreate options={options} />
      ) : (
        <ShowtimeList options={options} />
      )}
    </div>
  )
}

function ShowtimeList({ options }: { options: ShowtimeOptions }) {
  const [params, setParams] = useSearchParams()
  const location = useLocation()

  const today = vietnamNow().slice(0, 10)
  const from = params.get("from") || today
  const to = params.get("to") || from
  const movieId = params.get("movieId") || ""
  const roomId = params.get("roomId") || ""
  const status = params.get("status") || ""

  const rawPage = Number(params.get("page") || "0")
  const page =
    Number.isInteger(rawPage) && rawPage >= 0 ? rawPage : 0

  const rawSize = Number(params.get("size") || "10")
  const size = [10, 20, 50, 100].includes(rawSize) ? rawSize : 10

  const [draft, setDraft] = useState<ShowtimeFilters>({
    from,
    to,
    movieId,
    roomId,
    status,
  })

  const [data, setData] = useState<ShowtimePageData | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [loading, setLoading] = useState(true)
  const [validation, setValidation] = useState("")
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    setDraft({ from, to, movieId, roomId, status })
  }, [from, to, movieId, roomId, status])

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setError(null)
    setData(null)

    getAdminShowtimes(
      { from, to, movieId, roomId, status },
      page,
      size,
      controller.signal,
    )
      .then(result => {
        if (!controller.signal.aborted) {
          setData(result)
        }
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setError(cause)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [from, to, movieId, roomId, status, page, size, revision])

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const days =
      (Date.parse(`${draft.to}T00:00:00Z`) -
        Date.parse(`${draft.from}T00:00:00Z`)) /
      86400000

    if (days < 0 || days > 365) {
      setValidation(
        "Ngày kết thúc phải từ ngày bắt đầu đến tối đa 365 ngày sau.",
      )
      return
    }

    setValidation("")

    setParams(
      new URLSearchParams({
        ...draft,
        page: "0",
        size: String(size),
      }),
    )

    setRevision(value => value + 1)
  }

  function changePage(next: number, nextSize = size) {
    setParams(
      new URLSearchParams({
        from,
        to,
        movieId,
        roomId,
        status,
        page: String(next),
        size: String(nextSize),
      }),
    )
  }

  const statuses = [...new Set(["OPEN", ...options.statuses])]

  return (
    <>
      {typeof location.state?.notice === "string" && (
        <p className="ast-success" role="status">
          {location.state.notice}
        </p>
      )}

      <form className="statistics-filters" onSubmit={apply}>
        <div className="statistics-filter-fields ast-filter-grid">
          <label>
            Từ ngày
            <input
              required
              type="date"
              min="1000-01-01"
              max="9998-12-31"
              value={draft.from}
              onChange={event =>
                setDraft({ ...draft, from: event.target.value })
              }
            />
          </label>

          <label>
            Đến ngày
            <input
              required
              type="date"
              min="1000-01-01"
              max="9998-12-31"
              value={draft.to}
              onChange={event =>
                setDraft({ ...draft, to: event.target.value })
              }
            />
          </label>

          <label>
            Phim
            <select
              value={draft.movieId}
              onChange={event =>
                setDraft({ ...draft, movieId: event.target.value })
              }
            >
              <option value="">Tất cả phim</option>

              {options.movies.map(movie => (
                <option key={movie.id} value={movie.id}>
                  {movie.title}
                </option>
              ))}
            </select>
          </label>

          <label>
            Phòng chiếu
            <select
              value={draft.roomId}
              onChange={event =>
                setDraft({ ...draft, roomId: event.target.value })
              }
            >
              <option value="">Tất cả phòng</option>

              {options.rooms.map(room => (
                <option key={room.id} value={room.id}>
                  {room.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Trạng thái
            <select
              value={draft.status}
              onChange={event =>
                setDraft({ ...draft, status: event.target.value })
              }
            >
              <option value="">Tất cả trạng thái</option>

              {statuses.map(value => (
                <option key={value} value={value}>
                  {statusLabel(value)}
                </option>
              ))}
            </select>
          </label>

          <div className="ast-actions">
            <button className="statistics-primary" type="submit">
              Áp dụng
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => setRevision(value => value + 1)}
            >
              Làm mới
            </button>
          </div>
        </div>

        {validation && (
          <p className="statistics-error" role="alert">
            {validation}
          </p>
        )}
      </form>

      <p className="statistics-note">
        Lọc theo ngày bắt đầu suất chiếu; tối đa 366 ngày mỗi lần.
      </p>

      {loading && (
        <p className="statistics-state" role="status">
          Đang tải lịch chiếu…
        </p>
      )}

      {!loading && error != null && (
        <ErrorNotice
          error={error}
          retry={() => setRevision(value => value + 1)}
        />
      )}

      {!loading && !error && data && (
        <section className="statistics-panel">
          <h2>
            {data.totalElements.toLocaleString("vi-VN")} suất chiếu trong
            bộ lọc
          </h2>

          {data.rows.length === 0 ? (
            <p className="statistics-note">
              Không có suất chiếu phù hợp.
            </p>
          ) : (
            <div
              className="statistics-table-scroll"
              tabIndex={0}
              role="region"
              aria-label="Danh sách lịch chiếu có thể cuộn ngang"
            >
              <table className="ast-table">
                <thead>
                  <tr>
                    <th scope="col">Mã</th>
                    <th scope="col">Phim</th>
                    <th scope="col">Phòng</th>
                    <th scope="col">Bắt đầu</th>
                    <th scope="col">Kết thúc</th>
                    <th scope="col">Trạng thái</th>
                    <th scope="col" className="statistics-numeric">
                      Ghế
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {data.rows.map(show => (
                    <tr key={show.id}>
                      <td>#{show.id}</td>

                      <td className="ast-movie-title">
                        {show.movieTitle}
                      </td>

                      <td>
                        {show.roomName}
                        <small>
                          {show.roomType}
                          {show.format ? ` · ${show.format}` : ""}
                        </small>
                      </td>

                      <td className="ast-time">
                        {displayTime(show.startTime)}
                      </td>

                      <td className="ast-time">
                        {displayTime(show.endTime)}
                      </td>

                      <td>
                        <span className={`status-badge ${statusTone(show.status)}`}>
                          {statusLabel(show.status)}
                        </span>
                      </td>

                      <td className="statistics-numeric">
                        {show.totalSeats}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div className="statistics-pagination">
            <label>
              Số dòng
              <select
                value={size}
                onChange={event =>
                  changePage(0, Number(event.target.value))
                }
              >
                {[10, 20, 50, 100].map(value => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <span>
              Trang {data.totalPages ? data.page + 1 : 0}/
              {data.totalPages}
            </span>

            <div>
              <button
                type="button"
                disabled={data.page <= 0}
                onClick={() => changePage(data.page - 1)}
              >
                Trước
              </button>

              <button
                type="button"
                disabled={data.page + 1 >= data.totalPages}
                onClick={() => changePage(data.page + 1)}
              >
                Sau
              </button>
            </div>
          </div>
        </section>
      )}
    </>
  )
}

// Giờ dạng "YYYY-MM-DDTHH:mm" (giờ Việt Nam, không múi giờ) <-> số phút, để so sánh và cộng thời lượng.
const toMinutes = (value: string) =>
  Math.round(Date.parse(`${value.slice(0, 16)}:00Z`) / 60000)

const fromMinutes = (minutes: number) =>
  new Date(minutes * 60000).toISOString().slice(0, 16)

const hourOf = (value: string) => value.slice(11, 16)

function ShowtimeCreate({ options }: { options: ShowtimeOptions }) {
  const navigate = useNavigate()
  const today = vietnamNow().slice(0, 10)

  const [form, setForm] = useState({
    movieId: "",
    roomId: "",
    date: today,
    format: "",
  })

  const [availability, setAvailability] = useState<RoomAvailability | null>(null)
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState<unknown>(null)
  const [reload, setReload] = useState(0)

  const [selected, setSelected] = useState<string[]>([])
  const [customTime, setCustomTime] = useState("")
  const [customError, setCustomError] = useState("")

  const [busy, setBusy] = useState<"preview" | "save" | null>(null)
  const [error, setError] = useState<unknown>(null)
  const [previewItems, setPreviewItems] = useState<BatchPreviewItem[] | null>(null)

  const movies = options.movies.filter(
    movie =>
      ["SHOWING", "UPCOMING"].includes(movie.status || "") &&
      (movie.durationMinutes || 0) > 0,
  )

  const rooms = options.rooms.filter(room => room.status === "ACTIVE")
  const movie = movies.find(item => String(item.id) === form.movieId)
  const room = rooms.find(item => String(item.id) === form.roomId)
  const ready = Boolean(movie && room && form.date)

  // Chọn đủ phim + phòng + ngày thì tải lịch của phòng; đổi lựa chọn thì bỏ các giờ đã chọn.
  useEffect(() => {
    setSelected([])
    setPreviewItems(null)
    setError(null)
    setCustomError("")

    if (!ready) {
      setAvailability(null)
      return
    }

    const controller = new AbortController()
    setLoadingSlots(true)
    setSlotError(null)

    getRoomAvailability(
      Number(form.movieId),
      Number(form.roomId),
      form.date,
      controller.signal,
    )
      .then(result => {
        if (!controller.signal.aborted) setAvailability(result)
      })
      .catch(cause => {
        if (!controller.signal.aborted) {
          setAvailability(null)
          setSlotError(cause)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingSlots(false)
      })

    return () => controller.abort()
  }, [ready, form.movieId, form.roomId, form.date, reload])

  const duration = availability?.durationMinutes || movie?.durationMinutes || 0
  const gap = availability?.turnaroundMinutes ?? options.turnaroundMinutes

  /** Giờ bắt đầu này có đè lên giờ khác đã chọn không (tính cả thời gian dọn phòng). */
  function clashesWithSelected(start: string, ignore?: string) {
    const begin = toMinutes(start)
    const end = begin + duration

    return selected.some(other => {
      if (other === ignore) return false
      const otherBegin = toMinutes(other)
      const otherEnd = otherBegin + duration
      return otherBegin < end + gap && otherEnd > begin - gap
    })
  }

  function fitsFreeSlot(start: string) {
    const value = toMinutes(start)
    return (availability?.freeSlots || []).some(
      slot =>
        value >= toMinutes(slot.earliestStart) &&
        value <= toMinutes(slot.latestStart),
    )
  }

  function toggle(start: string) {
    setPreviewItems(null)
    setError(null)
    setSelected(current =>
      current.includes(start)
        ? current.filter(item => item !== start)
        : [...current, start].sort(),
    )
  }

  function fillDay() {
    setPreviewItems(null)
    setError(null)
    // Các giờ gợi ý đã được xếp liền nhau, không đè nhau.
    setSelected([...(availability?.suggestedStarts || [])].map(item => item.slice(0, 16)).sort())
  }

  function addCustomTime() {
    if (!customTime) return

    const start = `${form.date}T${customTime}`

    if (selected.includes(start)) {
      setCustomError(`Giờ ${customTime} đã có trong danh sách.`)
      return
    }

    if (!fitsFreeSlot(start)) {
      setCustomError(
        `Giờ ${customTime} không nằm trong khoảng trống của phòng (phim ${duration} phút, ` +
          `cần dọn phòng ${gap} phút).`,
      )
      return
    }

    if (clashesWithSelected(start)) {
      setCustomError(`Giờ ${customTime} trùng với một suất đã chọn.`)
      return
    }

    setCustomError("")
    setCustomTime("")
    toggle(start)
  }

  const payload: CreateShowtimeBatch = {
    movieId: Number(form.movieId),
    roomId: Number(form.roomId),
    startTimes: selected,
    format: form.format.trim(),
  }

  async function check() {
    if (busy || !selected.length) return
    setBusy("preview")
    setError(null)

    try {
      setPreviewItems(await previewShowtimeBatch(payload))
    } catch (cause) {
      setError(cause)
    } finally {
      setBusy(null)
    }
  }

  async function save() {
    if (busy || !selected.length) return
    setBusy("save")
    setError(null)

    try {
      const { created } = await createShowtimeBatch(payload)
      const query = new URLSearchParams({
        from: form.date,
        to: form.date,
        roomId: form.roomId,
      })

      navigate(`/admin/showtimes?${query}`, {
        replace: true,
        state: {
          notice:
            `Đã thêm ${created.length} suất chiếu "${movie?.title}" tại ${room?.name} ` +
            `(${created.map(show => hourOf(show.startTime)).join(", ")}). Các suất đang mở bán.`,
        },
      })
    } catch (cause) {
      setError(cause)
      setReload(value => value + 1)
    } finally {
      setBusy(null)
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [field]: value }))
  }

  const suggestions = (availability?.suggestedStarts || []).map(item => item.slice(0, 16))
  const extraSelected = selected.filter(item => !suggestions.includes(item))
  const invalidCount = previewItems?.filter(item => !item.ok).length || 0

  return (
    <section className="statistics-panel ast-create ast-quick">
      <h2>Thông tin suất chiếu</h2>

      {(!movies.length || !rooms.length) && (
        <p className="statistics-error">
          Cần có phim đang/sắp chiếu và phòng đang hoạt động để tạo lịch.
        </p>
      )}

      <fieldset disabled={busy !== null} className="ast-fieldset">
        <div className="statistics-filter-fields ast-quick-grid">
          <label>
            Phim
            <select
              required
              value={form.movieId}
              onChange={event => update("movieId", event.target.value)}
            >
              <option value="">Chọn phim</option>
              {movies.map(item => (
                <option key={item.id} value={item.id}>
                  {item.title} · {item.durationMinutes} phút
                </option>
              ))}
            </select>
          </label>

          <label>
            Phòng chiếu
            <select
              required
              value={form.roomId}
              onChange={event => update("roomId", event.target.value)}
            >
              <option value="">Chọn phòng</option>
              {rooms.map(item => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.roomType}
                </option>
              ))}
            </select>
          </label>

          <label>
            Ngày chiếu
            <input
              required
              type="date"
              min={today}
              max="9998-12-30"
              value={form.date}
              onChange={event => update("date", event.target.value)}
            />
          </label>

          <label>
            Định dạng hiển thị (tùy chọn)
            <input
              maxLength={50}
              value={form.format}
              placeholder="Ví dụ: 2D phụ đề"
              onChange={event => update("format", event.target.value)}
            />
          </label>
        </div>
      </fieldset>

      {movie?.releaseDate && (
        <p className="statistics-note">
          Ngày khởi chiếu của phim: {movie.releaseDate.split("-").reverse().join("/")}
        </p>
      )}

      {!ready && (
        <p className="ast-hint">
          Chọn phim, phòng và ngày để xem lịch của phòng và các giờ còn trống.
        </p>
      )}

      {ready && loadingSlots && (
        <p className="statistics-state" role="status">
          Đang kiểm tra lịch của phòng…
        </p>
      )}

      {ready && !loadingSlots && slotError != null && (
        <ErrorNotice error={slotError} retry={() => setReload(value => value + 1)} />
      )}

      {ready && !loadingSlots && availability && (
        <>
          <p
            className={availability.available ? "ast-banner is-ok" : "ast-banner is-full"}
            role="status"
          >
            {availability.message}
          </p>

          <RoomTimeline
            availability={availability}
            selected={selected}
            duration={duration}
          />

          {availability.freeSlots.length > 0 && (
            <div className="ast-block">
              <h3>Khoảng trống của phòng</h3>
              <ul className="ast-free-list">
                {availability.freeSlots.map(slot => (
                  <li key={slot.earliestStart}>
                    <b>
                      {hourOf(slot.from)} – {hourOf(slot.to)}
                    </b>
                    <span>
                      Bắt đầu được từ {hourOf(slot.earliestStart)} đến{" "}
                      {hourOf(slot.latestStart)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {suggestions.length > 0 && (
            <div className="ast-block">
              <div className="ast-block-head">
                <h3>Giờ chiếu gợi ý</h3>
                <div className="ast-actions">
                  <button type="button" onClick={fillDay} disabled={busy !== null}>
                    Xếp kín ngày ({suggestions.length} suất)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected([])
                      setPreviewItems(null)
                    }}
                    disabled={busy !== null || !selected.length}
                  >
                    Bỏ chọn
                  </button>
                </div>
              </div>

              <p className="statistics-note">
                Các giờ được xếp liền nhau: phim {duration} phút + {gap} phút dọn phòng. Bấm để
                chọn hoặc bỏ chọn.
              </p>

              <div className="ast-chips">
                {suggestions.map(start => {
                  const isSelected = selected.includes(start)
                  const blocked = !isSelected && clashesWithSelected(start)
                  const end = fromMinutes(toMinutes(start) + duration)

                  return (
                    <button
                      key={start}
                      type="button"
                      className={isSelected ? "ast-chip is-selected" : "ast-chip"}
                      aria-pressed={isSelected}
                      disabled={blocked || busy !== null}
                      title={blocked ? "Trùng với giờ đã chọn" : `Kết thúc ${hourOf(end)}`}
                      onClick={() => toggle(start)}
                    >
                      <b>{hourOf(start)}</b>
                      <small>→ {hourOf(end)}</small>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {availability.freeSlots.length > 0 && (
            <div className="ast-block">
              <h3>Thêm giờ khác</h3>
              <div className="ast-custom">
                <input
                  type="time"
                  step="300"
                  value={customTime}
                  onChange={event => {
                    setCustomTime(event.target.value)
                    setCustomError("")
                  }}
                />
                <button type="button" onClick={addCustomTime} disabled={!customTime || busy !== null}>
                  Thêm giờ
                </button>
              </div>
              {customError && (
                <p className="statistics-error" role="alert">
                  {customError}
                </p>
              )}
              {extraSelected.length > 0 && (
                <div className="ast-chips">
                  {extraSelected.map(start => (
                    <button
                      key={start}
                      type="button"
                      className="ast-chip is-selected"
                      onClick={() => toggle(start)}
                      title="Bỏ giờ này"
                    >
                      <b>{hourOf(start)}</b>
                      <small>→ {hourOf(fromMinutes(toMinutes(start) + duration))} ×</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {previewItems && (
        <div className="ast-block">
          <h3>
            Kết quả kiểm tra:{" "}
            {invalidCount ? `${invalidCount} suất chưa hợp lệ` : "tất cả hợp lệ"}
          </h3>
          <ul className="ast-check-list">
            {previewItems.map(item => (
              <li key={item.startTime} className={item.ok ? "is-ok" : "is-error"}>
                <b>
                  {hourOf(item.startTime)}
                  {item.endTime ? ` – ${hourOf(item.endTime)}` : ""}
                </b>
                <span>{item.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error != null && <ErrorNotice error={error} />}

      <div className="ast-actions ast-create-actions">
        <span className="ast-selected-count">
          {selected.length
            ? `Đã chọn ${selected.length} suất: ${selected.map(hourOf).join(", ")}`
            : "Chưa chọn giờ chiếu"}
        </span>

        <button
          type="button"
          disabled={busy !== null || !selected.length}
          onClick={() => void check()}
        >
          {busy === "preview" ? "Đang kiểm tra…" : "Kiểm tra lịch"}
        </button>

        <button
          className="statistics-primary"
          type="button"
          disabled={busy !== null || !selected.length || invalidCount > 0}
          onClick={() => void save()}
        >
          {busy === "save"
            ? "Đang lưu…"
            : `Thêm ${selected.length || ""} suất và mở bán`}
        </button>
      </div>
    </section>
  )
}

/** Dải thời gian trong ngày của phòng: suất đã có (xám), thời gian dọn phòng, suất mới đang chọn (đỏ). */
function RoomTimeline({
  availability,
  selected,
  duration,
}: {
  availability: RoomAvailability
  selected: string[]
  duration: number
}) {
  const gap = availability.turnaroundMinutes
  const begin = Math.min(
    toMinutes(availability.dayStart),
    ...availability.busy.map(show => toMinutes(show.startTime)),
  )
  const finish = Math.max(
    toMinutes(availability.lastStart) + duration,
    ...availability.busy.map(show => toMinutes(show.readyAt)),
  )
  const span = Math.max(finish - begin, 60)

  const left = (value: number) => `${((Math.max(value, begin) - begin) / span) * 100}%`
  const width = (from: number, to: number) =>
    `${((Math.min(to, finish) - Math.max(from, begin)) / span) * 100}%`

  const ticks: number[] = []
  for (let hour = Math.ceil(begin / 60) * 60; hour <= finish; hour += 120) {
    ticks.push(hour)
  }

  return (
    <div className="ast-block">
      <h3>Lịch trong ngày của {availability.roomName}</h3>

      <div className="ast-timeline" role="img" aria-label="Lịch sử dụng phòng trong ngày">
        {availability.busy.map(show => {
          const start = toMinutes(show.startTime)
          const end = toMinutes(show.endTime)
          return (
            <span key={`busy-${show.id}`}>
              <span
                className="ast-tl-busy"
                style={{ left: left(start), width: width(start, end) }}
                title={`#${show.id} ${show.movieTitle}: ${hourOf(show.startTime)}–${hourOf(show.endTime)}`}
              >
                {show.movieTitle}
              </span>
              <span
                className="ast-tl-gap"
                style={{ left: left(end), width: width(end, end + gap) }}
                title={`Dọn phòng đến ${hourOf(show.readyAt)}`}
              />
            </span>
          )
        })}

        {selected.map(start => {
          const from = toMinutes(start)
          const to = from + duration
          return (
            <span
              key={`new-${start}`}
              className="ast-tl-new"
              style={{ left: left(from), width: width(from, to) }}
              title={`Suất mới ${hourOf(start)}–${hourOf(fromMinutes(to))}`}
            >
              {hourOf(start)}
            </span>
          )
        })}
      </div>

      <div className="ast-timeline-scale" aria-hidden="true">
        {ticks.map(tick => (
          <span key={tick} style={{ left: left(tick) }}>
            {fromMinutes(tick).slice(11, 16)}
          </span>
        ))}
      </div>

      <div className="ast-legend">
        <span><i className="ast-tl-busy" /> Suất đã có</span>
        <span><i className="ast-tl-gap" /> Dọn phòng {gap} phút</span>
        <span><i className="ast-tl-new" /> Suất mới đang chọn</span>
      </div>
    </div>
  )
}

export default AdminShowtimePage