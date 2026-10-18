import { useMemo } from "react"
import type { ReactNode } from "react"

// Dùng lại nguyên giao diện sơ đồ ghế của màn bán vé tại quầy (scope dưới .cs-seats-page).
import "../counter-sale/CounterSaleSeats.css"
import "./cinema-seat-map.css"

import { seatKind } from "./seatMapUtils"
import type { SeatMapKind, SeatMapState } from "./seatMapUtils"

export type { SeatMapKind, SeatMapState } from "./seatMapUtils"

export interface SeatMapSeat {
  id: number
  rowLabel: string
  seatNumber: number
  seatType?: string | null
  state: SeatMapState
}

export interface SeatMapLegend {
  selected?: string
  held?: string
  sold?: string
}

interface CinemaSeatMapProps {
  seats: SeatMapSeat[]
  selectedIds: number[]
  onSeatClick: (seat: SeatMapSeat) => void
  onRowClick?: (rowLabel: string) => void
  title?: ReactNode
  subtitle?: ReactNode
  legend?: SeatMapLegend
  disabled?: boolean
  /** true: chỉ render thẻ sơ đồ, khi trang đã tự bọc .cs-seats-page (vd. cùng khung tóm tắt đơn). */
  bare?: boolean
  children?: ReactNode
}

type RowCell =
  | { type: "seat"; seat: SeatMapSeat }
  | { type: "gap"; key: string }

const KIND_LABEL: Record<SeatMapKind, string> = {
  standard: "Thường",
  vip: "VIP",
  couple: "Ghế đôi",
}

const STATE_LABEL: Record<SeatMapState, string> = {
  available: "Còn trống",
  held: "Đang được giữ",
  sold: "Đã bán",
  blocked: "Không bán",
}

// Giống màn quầy: hàng ngắn trước (A..Z rồi AA..), trong hàng theo số ghế.
function compareRowLabel(a: string, b: string) {
  return a.length - b.length || a.localeCompare(b, "vi")
}

/**
 * Sơ đồ ghế dùng chung (khách đặt online...), cùng markup/CSS với màn bán vé tại quầy:
 * màn hình phía trên, nhãn hàng hai bên, ô trống khi số ghế bị nhảy (lối đi).
 */
function CinemaSeatMap({
  seats,
  selectedIds,
  onSeatClick,
  onRowClick,
  title = "Sơ đồ ghế",
  subtitle,
  legend,
  disabled = false,
  bare = false,
  children,
}: CinemaSeatMapProps) {
  const rows = useMemo(() => {
    const groups = new Map<string, SeatMapSeat[]>()
    seats.forEach((seat) => {
      if (!groups.has(seat.rowLabel)) groups.set(seat.rowLabel, [])
      groups.get(seat.rowLabel)!.push(seat)
    })

    return Array.from(groups.entries())
      .sort(([a], [b]) => compareRowLabel(a, b))
      .map(([label, rowSeats]) => {
        const sorted = [...rowSeats].sort((a, b) => a.seatNumber - b.seatNumber)
        const cells: RowCell[] = []
        sorted.forEach((seat, index) => {
          const prev = sorted[index - 1]
          if (prev && seat.seatNumber - prev.seatNumber > 1) {
            cells.push({ type: "gap", key: `${label}-gap-${seat.seatNumber}` })
          }
          cells.push({ type: "seat", seat })
        })
        return { label, cells }
      })
  }, [seats])

  const kinds = useMemo(() => new Set(seats.map((seat) => seatKind(seat.seatType))), [seats])

  const card = (
      <section className="cs-seatmap-card" aria-label="Sơ đồ ghế">
        <div className="cs-seatmap-toolbar">
          <div>
            <h2>{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>

          <ul className="cs-legend">
            <li><i className="cs-legend-seat is-available" />Trống</li>
            <li><i className="cs-legend-seat is-selected" />{legend?.selected ?? "Đang chọn"}</li>
            <li><i className="cs-legend-seat is-held" />{legend?.held ?? "Người khác giữ"}</li>
            <li><i className="cs-legend-seat is-sold" />{legend?.sold ?? "Đã bán"}</li>
            {kinds.has("vip") && <li><i className="cs-legend-seat is-available is-vip" />VIP</li>}
            {kinds.has("couple") && <li><i className="cs-legend-seat is-available is-couple" />Ghế đôi</li>}
          </ul>
        </div>

        <div className="cs-seatmap-scroll">
          <div className="cs-seatmap">
            <div className="cs-screen" aria-hidden="true">
              <span>Màn hình</span>
            </div>

            {rows.length === 0 ? (
              <div className="cs-seatmap-state">
                <strong>Suất này chưa có sơ đồ ghế</strong>
              </div>
            ) : (
              <div className="cs-rows">
                {rows.map((row) => (
                  <div className="cs-row" key={row.label}>
                    {onRowClick ? (
                      <button
                        type="button"
                        className="cs-row-label cs-row-toggle"
                        onClick={() => onRowClick(row.label)}
                        disabled={disabled}
                      >
                        {row.label}
                      </button>
                    ) : (
                      <span className="cs-row-label">{row.label}</span>
                    )}

                    <div className="cs-row-seats">
                      {row.cells.map((cell) => {
                        if (cell.type === "gap") {
                          return <span key={cell.key} className="cs-seat-gap" aria-hidden="true" />
                        }

                        const { seat } = cell
                        const selected = selectedIds.includes(seat.id)
                        const state: SeatMapState = selected ? "available" : seat.state
                        const kind = seatKind(seat.seatType)
                        const className = [
                          "cs-seat",
                          `is-${state}`,
                          kind !== "standard" && `is-${kind}`,
                          selected && "is-selected",
                        ]
                          .filter(Boolean)
                          .join(" ")
                        const label = `Ghế ${seat.rowLabel}${seat.seatNumber}, ${KIND_LABEL[kind]}, ${
                          selected ? "Đang chọn" : STATE_LABEL[state]
                        }`

                        return (
                          <button
                            key={seat.id}
                            type="button"
                            className={className}
                            disabled={disabled || (!selected && state !== "available")}
                            onClick={() => onSeatClick(seat)}
                            aria-pressed={selected}
                            aria-label={label}
                            title={label}
                          >
                            {seat.seatNumber}
                          </button>
                        )
                      })}
                    </div>

                    <span className="cs-row-label">{row.label}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {children}
      </section>
  )

  return bare ? card : <div className="cs-seats-page cinema-seat-map">{card}</div>
}

export default CinemaSeatMap
