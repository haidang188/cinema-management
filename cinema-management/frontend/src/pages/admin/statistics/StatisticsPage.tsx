import { useEffect, useState } from "react"
import type { FormEvent } from "react"
import { useSearchParams } from "react-router-dom"

import {
  getStatistics,
  StatisticsError,
} from "../../../service/statistics/statisticsService"

import type {
  Channel,
  ReportSort,
  ReportType,
  StatisticsFilters,
  StatisticsReport,
} from "../../../service/statistics/statisticsService"

import { formatVnd } from "../../../utils/format"
import "./statistics.css"
import { clearStoredUser } from "../../../hooks/useAuth"

const labels: Record<ReportType, string> = {
  movies: "Phim",
  members: "Thành viên",
  genres: "Thể loại",
}

const channels = {
  ALL: "Tất cả kênh",
  ONLINE: "Online",
  COUNTER: "Tại quầy",
}

const number = (value: number) =>
  new Intl.NumberFormat("vi-VN").format(value)

const money = (value: number) => formatVnd(value)

function todayInVietnam() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())

  const part = (type: string) =>
    parts.find(item => item.type === type)?.value || ""

  return `${part("year")}-${part("month")}-${part("day")}`
}

export default function StatisticsPage() {
  const [params, setParams] = useSearchParams()

  const rawType = params.get("report")
  const type: ReportType =
    rawType === "members" || rawType === "genres"
      ? rawType
      : "movies"

  const from = params.get("from") || ""
  const to = params.get("to") || ""

  const rawChannel = params.get("channel")
  const channel: Channel =
    rawChannel === "ONLINE" || rawChannel === "COUNTER"
      ? rawChannel
      : "ALL"

  const sort: ReportSort =
    params.get("sort") === "TICKETS"
      ? "TICKETS"
      : "REVENUE"

  const [draft, setDraft] = useState<StatisticsFilters>({
    from,
    to,
    channel,
    sort,
  })

  const [data, setData] =
    useState<StatisticsReport | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [errorStatus, setErrorStatus] = useState(0)
  const [validation, setValidation] = useState("")
  const [revision, setRevision] = useState(0)
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  useEffect(() => {
    setDraft({ from, to, channel, sort })
    setValidation("")
  }, [from, to, channel, sort])

  useEffect(() => {
    const controller = new AbortController()

    setLoading(true)
    setData(null)
    setError("")
    setErrorStatus(0)
    setPage(1)

    getStatistics(
      type,
      { from, to, channel, sort },
      controller.signal,
    )
      .then(result => {
        if (!controller.signal.aborted) {
          setData(result)
        }
      })
      .catch(cause => {
        if (controller.signal.aborted) {
          return
        }

        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải thống kê",
        )

        setErrorStatus(
          cause instanceof StatisticsError
            ? cause.status
            : 0,
        )
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [type, from, to, channel, sort, revision])

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (draft.from && draft.to && draft.from > draft.to) {
      setValidation(
        "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.",
      )
      return
    }

    setValidation("")

    const next = new URLSearchParams({
      report: type,
      channel: draft.channel,
      sort: draft.sort,
    })

    if (draft.from) {
      next.set("from", draft.from)
    }

    if (draft.to) {
      next.set("to", draft.to)
    }

    setParams(next)
    setRevision(value => value + 1)
  }

  function preset(value: "all" | "today" | "month") {
    const today = todayInVietnam()

    setDraft(current => ({
      ...current,
      from:
        value === "all"
          ? ""
          : value === "today"
            ? today
            : `${today.slice(0, 7)}-01`,
      to: value === "all" ? "" : today,
    }))

    setValidation("")
  }

  const rows = data?.rows || []
  const totalPages = Math.max(1, Math.ceil(rows.length / size))
  const visibleRows = rows.slice((page - 1) * size, page * size)

  const byTickets = data?.sort === "TICKETS"
  const chartRows = rows.slice(0, 10)
  const maxValue = Math.max(
    1,
    ...chartRows.map(row =>
      byTickets ? row.tickets : row.revenue,
    ),
  )

  const displayDate = (date: string) =>
    date.split("-").reverse().join("/")

  const period =
    !from && !to
      ? "Toàn bộ thời gian"
      : `${from ? displayDate(from) : "Từ đầu"} – ${to ? displayDate(to) : "hiện tại"
      }`

  return (
    <div className="statistics-page">
      <div className="statistics-heading">
        <div>
          <h1>Thống kê kinh doanh</h1>
          <p>
            Doanh thu và vé bán được hệ thống ghi nhận sau
            thanh toán.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setRevision(value => value + 1)}
          disabled={loading}
        >
          Làm mới
        </button>
      </div>

      <nav
        className="statistics-tabs"
        aria-label="Loại báo cáo"
      >
        {(Object.keys(labels) as ReportType[]).map(value => (
          <button
            key={value}
            type="button"
            aria-current={type === value ? "page" : undefined}
            onClick={() => {
              const next = new URLSearchParams(params)
              next.set("report", value)
              setParams(next)
            }}
          >
            {labels[value]}
          </button>
        ))}
      </nav>

      <form className="statistics-filters" onSubmit={apply}>
        <div className="statistics-presets">
          <span>Chọn nhanh:</span>

          <button
            type="button"
            onClick={() => preset("all")}
          >
            Toàn bộ
          </button>

          <button
            type="button"
            onClick={() => preset("today")}
          >
            Hôm nay
          </button>

          <button
            type="button"
            onClick={() => preset("month")}
          >
            Tháng này
          </button>
        </div>

        <div className="statistics-filter-fields">
          <label>
            Từ ngày
            <input
              type="date"
              min="1000-01-01"
              max="9998-12-31"
              value={draft.from}
              onChange={e =>
                setDraft({
                  ...draft,
                  from: e.target.value,
                })
              }
            />
          </label>

          <label>
            Đến ngày
            <input
              type="date"
              min="1000-01-01"
              max="9998-12-31"
              value={draft.to}
              onChange={e =>
                setDraft({
                  ...draft,
                  to: e.target.value,
                })
              }
            />
          </label>

          <label>
            Kênh bán
            <select
              value={draft.channel}
              onChange={e =>
                setDraft({
                  ...draft,
                  channel: e.target.value as Channel,
                })
              }
            >
              {Object.entries(channels).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ),
              )}
            </select>
          </label>

          <label>
            Xếp hạng theo
            <select
              value={
                type === "genres" ? "TICKETS" : draft.sort
              }
              disabled={type === "genres"}
              onChange={e =>
                setDraft({
                  ...draft,
                  sort: e.target.value as ReportSort,
                })
              }
            >
              <option value="REVENUE">Tổng tiền</option>
              <option value="TICKETS">Số vé bán</option>
            </select>
          </label>

          <button
            className="statistics-primary"
            type="submit"
          >
            Áp dụng
          </button>
        </div>

        {validation && (
          <p className="statistics-error" role="alert">
            {validation}
          </p>
        )}
      </form>

      <p className="statistics-period">
        Đang xem: <strong>{period}</strong>
        {" · "}
        {channels[channel]}
        {" · "}
        Theo ngày thanh toán, giờ Việt Nam
      </p>

      {type === "members" && (
        <p className="statistics-note">
          Chi tiêu chỉ gồm đơn có gắn thành viên. Điểm hiện
          có là số dư hiện tại, không thay đổi theo bộ lọc
          ngày.
        </p>
      )}

      {type === "genres" && (
        <p className="statistics-note">
          Một phim có thể thuộc nhiều thể loại. Mỗi vé được
          tính trong từng thể loại của phim; không cộng các
          dòng để suy ra tổng vé thực bán.
        </p>
      )}

      {loading && (
        <p className="statistics-state" role="status">
          Đang tải thống kê…
        </p>
      )}

      {!loading && error && (
        <div
          className="statistics-state statistics-error"
          role="alert"
        >
          <p>{error}</p>

          {errorStatus === 401 ? (
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
            <button
              type="button"
              onClick={() =>
                setRevision(value => value + 1)
              }
            >
              Thử lại
            </button>
          )}
        </div>
      )}

      {!loading && !error && data && (
        <>
          <div className="statistics-summary">
            {[
              [
                type === "members"
                  ? "Chi tiêu thành viên"
                  : "Doanh thu vé",
                money(data.summary.revenue),
              ],
              ["Vé đã bán", number(data.summary.tickets)],
              [
                "Đơn thanh toán",
                number(data.summary.bookings),
              ],
              [
                "Thành viên mua vé",
                number(data.summary.members),
              ],
            ].map(([label, value]) => (
              <div key={label} className="statistics-metric">
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <p className="statistics-note">
            Các số tổng tính trên toàn bộ giao dịch hợp lệ
            trong bộ lọc, không chỉ TOP 100.
          </p>

          {type === "members" &&
            data.summary.unlinkedBookings > 0 && (
              <p className="statistics-note">
                Có {number(data.summary.unlinkedBookings)}{" "}
                đơn trong kỳ chưa gắn thành viên, không được
                cộng vào bảng này.
              </p>
            )}

          {rows.length === 0 ? (
            <p className="statistics-state">
              Không có dữ liệu phù hợp với bộ lọc.
            </p>
          ) : (
            <>
              <section
                className="statistics-panel"
                aria-labelledby="statistics-chart-title"
              >
                <h2 id="statistics-chart-title">
                  TOP {chartRows.length}{" "}
                  {labels[type].toLowerCase()} theo{" "}
                  {byTickets ? "số vé" : "tổng tiền"}
                </h2>

                <ol className="statistics-chart">
                  {chartRows.map(row => {
                    const value = byTickets
                      ? row.tickets
                      : row.revenue

                    return (
                      <li key={row.id}>
                        <div className="statistics-bar-label">
                          <span>{row.name}</span>
                          <strong>
                            {byTickets
                              ? `${number(value)} vé`
                              : money(value)}
                          </strong>
                        </div>

                        <div
                          className="statistics-bar-track"
                          aria-hidden="true"
                        >
                          <div
                            style={{
                              width: `${(value / maxValue) * 100
                                }%`,
                            }}
                          />
                        </div>
                      </li>
                    )
                  })}
                </ol>
              </section>

              <section
                className="statistics-panel"
                aria-labelledby="statistics-table-title"
              >
                <h2 id="statistics-table-title">
                  Bảng xếp hạng · tối đa 100 kết quả
                </h2>

                <div
                  className="statistics-table-scroll"
                  tabIndex={0}
                  role="region"
                  aria-label="Bảng xếp hạng có thể cuộn ngang"
                >
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Hạng</th>

                        {type === "members" && (
                          <th scope="col">Mã thành viên</th>
                        )}

                        <th scope="col">{labels[type]}</th>

                        <th
                          scope="col"
                          className="statistics-numeric"
                        >
                          Số vé
                        </th>

                        {type !== "genres" && (
                          <th
                            scope="col"
                            className="statistics-numeric"
                          >
                            Tổng tiền
                          </th>
                        )}

                        {type === "members" && (
                          <th
                            scope="col"
                            className="statistics-numeric"
                          >
                            Điểm hiện có
                          </th>
                        )}

                        {type === "genres" && (
                          <th
                            scope="col"
                            className="statistics-numeric"
                          >
                            Số phim có vé bán
                          </th>
                        )}
                      </tr>
                    </thead>

                    <tbody>
                      {visibleRows.map((row, index) => (
                        <tr key={row.id}>
                          <td>
                            {(page - 1) * size + index + 1}
                          </td>

                          {type === "members" && (
                            <td>{row.code}</td>
                          )}

                          <td>{row.name}</td>

                          <td className="statistics-numeric">
                            {number(row.tickets)}
                          </td>

                          {type !== "genres" && (
                            <td className="statistics-numeric">
                              {money(row.revenue)}
                            </td>
                          )}

                          {type === "members" && (
                            <td className="statistics-numeric">
                              {number(row.pointBalance ?? 0)}
                            </td>
                          )}

                          {type === "genres" && (
                            <td className="statistics-numeric">
                              {number(row.movieCount ?? 0)}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="statistics-pagination">
                  <label>
                    Số dòng
                    <select
                      value={size}
                      onChange={e => {
                        setSize(Number(e.target.value))
                        setPage(1)
                      }}
                    >
                      {[10, 20, 50, 100].map(value => (
                        <option key={value} value={value}>
                          {value}
                        </option>
                      ))}
                    </select>
                  </label>

                  <span>
                    {number(rows.length)} kết quả · Trang{" "}
                    {page}/{totalPages}
                  </span>

                  <div>
                    <button
                      type="button"
                      disabled={page === 1}
                      onClick={() =>
                        setPage(value => value - 1)
                      }
                    >
                      Trước
                    </button>

                    <button
                      type="button"
                      disabled={page === totalPages}
                      onClick={() =>
                        setPage(value => value + 1)
                      }
                    >
                      Sau
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}