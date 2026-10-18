import "../counter-sale/CounterSaleSeats.css"
import "./RoomSeatDesigner.css"
import type { Seat } from "../../types/admin"

const SEAT_TYPE_LABELS: Record<string, string> = {
  NORMAL: "Ghế thường",
  VIP: "Ghế VIP",
}

const SEAT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Không hoạt động",
}

interface SeatDraft {
  seatType: string
  status: string
}

interface SeatMapProps {
  seats: Seat[]
  pendingSeats: Record<number, SeatDraft>
  selectedSeatIds: number[]
  onSelectSeat: (seat: Seat) => void
}

interface PositionedSeat {
  seat: Seat
  gridRow: number
  gridColumn: number
}

function getSeatTypeLabel(seatType?: string) {
  return SEAT_TYPE_LABELS[seatType || ""] || seatType || "Chưa phân loại"
}

function getSeatStatusLabel(status?: string) {
  return SEAT_STATUS_LABELS[status || ""] || status || "Chưa rõ trạng thái"
}

function hasGridPosition(seat: Seat) {
  return Number.isInteger(seat.gridRow) && Number.isInteger(seat.gridColumn) && Number(seat.gridRow) >= 0 && Number(seat.gridColumn) >= 0
}

function groupSeatsByRow(seats: Seat[]): Record<string, Seat[]> {
  return seats.reduce<Record<string, Seat[]>>((rows, seat) => {
    const row = seat.rowLabel || "?"
    if (!rows[row]) rows[row] = []
    rows[row].push(seat)
    return rows
  }, {})
}

function buildPositionedSeats(seats: Seat[]) {
  const positionedSeats: PositionedSeat[] = []
  const seatsWithPosition = seats.filter(hasGridPosition)
  const seatsWithoutPosition = seats.filter((seat) => !hasGridPosition(seat))

  seatsWithPosition.forEach((seat) => {
    positionedSeats.push({
      seat,
      gridRow: Number(seat.gridRow),
      gridColumn: Number(seat.gridColumn),
    })
  })

  const fallbackRows = groupSeatsByRow(seatsWithoutPosition)
  const usedRows = positionedSeats.map((item) => item.gridRow)
  const nextFallbackStartRow = usedRows.length > 0 ? Math.max(...usedRows) + 1 : 0
  Object.keys(fallbackRows)
    .sort((firstRow, secondRow) => firstRow.localeCompare(secondRow))
    .forEach((rowLabel, fallbackRowIndex) => {
      fallbackRows[rowLabel]
        .sort((firstSeat, secondSeat) => firstSeat.seatNumber - secondSeat.seatNumber)
        .forEach((seat, seatIndex) => {
          positionedSeats.push({
            seat,
            gridRow: nextFallbackStartRow + fallbackRowIndex,
            gridColumn: seatIndex,
          })
        })
    })

  const maxRow = positionedSeats.reduce((max, item) => Math.max(max, item.gridRow), 0)
  const maxColumn = positionedSeats.reduce((max, item) => Math.max(max, item.gridColumn), 0)
  return { positionedSeats, maxRow, maxColumn }
}

function SeatMap({ seats, pendingSeats, selectedSeatIds, onSelectSeat }: SeatMapProps) {
  const { positionedSeats, maxRow, maxColumn } = buildPositionedSeats(seats)
  const selectedSeatIdSet = new Set(selectedSeatIds)
  const seatByPosition = new Map(positionedSeats.map((item) => [`${item.gridRow}:${item.gridColumn}`, item.seat]))

  function renderSeat(seat: Seat) {
    const draft = pendingSeats[seat.id]
    const seatType = draft?.seatType || seat.seatType
    const status = draft?.status || seat.status
    const isInactive = status !== "ACTIVE"
    const changed = Boolean(draft)
    const selected = selectedSeatIdSet.has(seat.id)
    const typeLabel = getSeatTypeLabel(seatType)
    const statusLabel = getSeatStatusLabel(status)

    return (
      <button
        key={seat.id}
        type="button"
        className={[
          "cs-seat",
          "is-available",
          seatType === "VIP" ? "is-vip" : "",
          isInactive ? "rsd-inactive" : "",
          changed ? "rsd-changed" : "",
          selected ? "is-selected" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={() => onSelectSeat(seat)}
        title={`${seat.seatName} - ${typeLabel} - ${statusLabel}${changed ? " - Chưa lưu" : ""}`}
        aria-pressed={selected}
        aria-label={`${seat.seatName}, ${typeLabel}, ${statusLabel}${selected ? ", đang chọn" : ""}${changed ? ", chưa lưu" : ""}`}
      >
        {seat.seatNumber}
      </button>
    )
  }

  return (
    <section className="cs-seats-page room-seat-designer is-viewer" aria-label="Sơ đồ ghế">
      <div className="cs-seatmap-card">
        <div className="cs-seatmap-toolbar">
          <div>
            <p>
              {seats.length} ghế · Bấm ghế để chọn, bấm lại để bỏ chọn
              {selectedSeatIds.length > 0 && <span className="rsd-selected-count">Đang chọn {selectedSeatIds.length}</span>}
            </p>
          </div>

          <ul className="cs-legend" aria-label="Chú thích ghế">
            <li>
              <i className="cs-legend-seat is-available" />
              Thường
            </li>
            <li>
              <i className="cs-legend-seat is-vip" />
              VIP
            </li>
            <li>
              <i className="cs-legend-seat rsd-legend-inactive" />
              Ngừng hoạt động
            </li>
            <li>
              <i className="cs-legend-seat is-selected" />
              Đang chọn
            </li>
            <li>
              <i className="cs-legend-seat is-available rsd-legend-changed" />
              Chưa lưu
            </li>
          </ul>
        </div>

        <div className="cs-seatmap-scroll">
          <div className="cs-seatmap">
            <div className="cs-screen" aria-hidden="true">
              <span>Màn hình</span>
            </div>

            {seats.length === 0 ? (
              <div className="cs-seatmap-state">
                <strong>Phòng chưa có ghế</strong>
                <span>Vào trang chỉnh sửa để thiết kế sơ đồ ghế.</span>
              </div>
            ) : (
              <div className="cs-rows">
                {Array.from({ length: maxRow + 1 }, (_, rowIndex) => {
                  const rowLabel = String.fromCharCode("A".charCodeAt(0) + rowIndex)
                  return (
                    <div className="cs-row" key={`row-${rowIndex}`}>
                      <span className="cs-row-label">{rowLabel}</span>
                      <div className="cs-row-seats">
                        {Array.from({ length: maxColumn + 1 }, (_, columnIndex) => {
                          const seat = seatByPosition.get(`${rowIndex}:${columnIndex}`)
                          return seat ? (
                            renderSeat(seat)
                          ) : (
                            <span key={`gap-${rowIndex}-${columnIndex}`} className="rsd-slot-gap" aria-hidden="true" />
                          )
                        })}
                      </div>
                      <span className="cs-row-label">{rowLabel}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export default SeatMap
