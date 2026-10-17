import { useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import {
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom"

import {
  calculateEnd,
  createShowtime,
  displayTime,
  getAdminShowtimes,
  getShowtimeOptions,
  previewShowtime,
  ShowtimeError,
  vietnamNow,
} from "../../../service/showtime/adminShowtimeService"

import type {
  CreateShowtime,
  ShowtimeFilters,
  ShowtimeOptions,
  ShowtimePageData,
  ShowtimePreview,
} from "../../../service/showtime/adminShowtimeService"

import "../statistics/statistics.css"
import "./admin-showtimes.css"

const statusLabels: Record<string, string> = {
  OPEN: "Mở bán",
  CLOSED: "Đóng bán",
  PAUSED: "Ngừng bán",
  CANCELLED: "Đã hủy",
  DRAFT: "Nháp",
}

const statusLabel = (value: string | null) =>
  value ? statusLabels[value] || value : "Chưa xác định"

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
            localStorage.removeItem("cinema.currentUser")
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
              ? "Kiểm tra phòng và thời gian trước khi mở bán."
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

                      <td>{statusLabel(show.status)}</td>

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

function ShowtimeCreate({ options }: { options: ShowtimeOptions }) {
  const navigate = useNavigate()
  const formRef = useRef<HTMLFormElement>(null)
  const submitting = useRef(false)

  const [form, setForm] = useState({
    movieId: "",
    roomId: "",
    startTime: "",
    format: "",
  })

  const [busy, setBusy] = useState<"preview" | "save" | null>(null)
  const [error, setError] = useState<unknown>(null)

  const [checked, setChecked] = useState<{
    key: string
    result: ShowtimePreview
  } | null>(null)

  const movies = options.movies.filter(
    movie =>
      ["SHOWING", "UPCOMING"].includes(movie.status || "") &&
      (movie.durationMinutes || 0) > 0,
  )

  const rooms = options.rooms.filter(room => room.status === "ACTIVE")

  const movie = movies.find(
    item => String(item.id) === form.movieId,
  )

  const room = rooms.find(
    item => String(item.id) === form.roomId,
  )

  const payload: CreateShowtime = {
    movieId: Number(form.movieId),
    roomId: Number(form.roomId),
    startTime: form.startTime,
    format: form.format.trim(),
  }

  const key = JSON.stringify(payload)
  const validPreview = checked?.key === key ? checked.result : null

  const end =
    validPreview?.endTime ||
    (movie
      ? calculateEnd(form.startTime, movie.durationMinutes || 0)
      : "")

  const readyAt =
    validPreview?.roomReadyAt ||
    (end
      ? calculateEnd(end.slice(0, 16), options.turnaroundMinutes)
      : "")

  async function submit(save: boolean) {
    if (
      submitting.current ||
      !formRef.current?.reportValidity()
    ) {
      return
    }

    submitting.current = true
    setBusy(save ? "save" : "preview")
    setError(null)
    setChecked(null)

    try {
      if (save) {
        const created = await createShowtime(payload)
        const date = created.startTime.slice(0, 10)

        const query = new URLSearchParams({
          from: date,
          to: date,
          roomId: String(created.roomId),
        })

        navigate(`/admin/showtimes?${query}`, {
          replace: true,
          state: {
            notice:
              `Đã thêm suất #${created.id} và tạo ` +
              `${created.totalSeats} ghế. Suất đang mở bán.`,
          },
        })
      } else {
        const result = await previewShowtime(payload)
        setChecked({ key, result })
      }
    } catch (cause) {
      setError(cause)
    } finally {
      submitting.current = false
      setBusy(null)
    }
  }

  function update(field: keyof typeof form, value: string) {
    setForm(current => ({ ...current, [field]: value }))
    setError(null)
  }

  return (
    <form
      ref={formRef}
      className="statistics-panel ast-create"
      onSubmit={event => {
        event.preventDefault()
        void submit(true)
      }}
    >
      <h2>Thông tin suất chiếu</h2>

      {(!movies.length || !rooms.length) && (
        <p className="statistics-error">
          Cần có phim đang/sắp chiếu và phòng đang hoạt động để tạo lịch.
        </p>
      )}

      <fieldset
        disabled={busy !== null}
        className="ast-fieldset"
      >
        <div className="statistics-filter-fields ast-create-grid">
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
            Bắt đầu (giờ Việt Nam)
            <input
              required
              type="datetime-local"
              step="60"
              min={calculateEnd(vietnamNow(), 6)}
              max="9998-12-30T23:59"
              value={form.startTime}
              onChange={event =>
                update("startTime", event.target.value)
              }
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

      <p className="statistics-note">
        Giờ kết thúc được tính theo thời lượng phim. Cần cách suất
        liền kề ít nhất {options.turnaroundMinutes} phút để chuẩn bị
        phòng. Suất mới phải bắt đầu sau hiện tại ít nhất 5 phút.
      </p>

      {movie?.releaseDate && (
        <p className="statistics-note">
          Ngày khởi chiếu của phim:{" "}
          {movie.releaseDate.split("-").reverse().join("/")}
        </p>
      )}

      <dl className="ast-preview">
        <div>
          <dt>Phim / phòng</dt>
          <dd>
            {movie?.title || "Chưa chọn phim"} ·{" "}
            {room?.name || "Chưa chọn phòng"}
          </dd>
        </div>

        <div>
          <dt>Kết thúc dự kiến</dt>
          <dd>
            {end ? displayTime(end) : "Chọn phim và giờ bắt đầu"}
          </dd>
        </div>

        <div>
          <dt>Phòng sẵn sàng sau suất này</dt>
          <dd>
            {readyAt ? displayTime(readyAt) : "Chưa xác định"}
          </dd>
        </div>
      </dl>

      {validPreview && (
        <p className="ast-success" role="status">
          Lịch hợp lệ tại thời điểm kiểm tra; có{" "}
          {validPreview.totalSeats} ghế. Hệ thống sẽ kiểm tra lại khi lưu.
        </p>
      )}

      {error != null && <ErrorNotice error={error} />}

      <div className="ast-actions ast-create-actions">
        <button
          type="button"
          disabled={busy !== null || !movies.length || !rooms.length}
          onClick={() => void submit(false)}
        >
          {busy === "preview" ? "Đang kiểm tra…" : "Kiểm tra lịch"}
        </button>

        <button
          className="statistics-primary"
          type="submit"
          disabled={busy !== null || !movies.length || !rooms.length}
        >
          {busy === "save" ? "Đang lưu…" : "Thêm và mở bán"}
        </button>
      </div>
    </form>
  )
}

export default AdminShowtimePage