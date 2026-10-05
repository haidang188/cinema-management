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

  return (
    <section className="seat-map-panel">
      <div className="seat-screen">
        <span>MÀN HÌNH</span>
      </div>

      <div className="seat-legend" aria-label="Chú thích ghế">
        <span className="legend-item">
          <i className="legend-normal" aria-hidden="true" />
          Ghế thường
        </span>
        <span className="legend-item">
          <i className="legend-vip" aria-hidden="true" />
          Ghế VIP
        </span>
        <span className="legend-item">
          <i className="legend-inactive" aria-hidden="true" />
          Ghế ngừng hoạt động
        </span>
        <span className="legend-item">
          <i className="legend-changed" aria-hidden="true" />
          Chưa lưu
        </span>
      </div>

      <div className="seat-map-scroll">
        <div className="seat-position-grid" style={{ gridTemplateColumns: `40px repeat(${maxColumn + 1}, 54px)` }}>
          <div className="seat-grid-corner" aria-hidden="true" />
          {Array.from({ length: maxColumn + 1 }, (_, columnIndex) => (
            <div key={`column-${columnIndex}`} className="seat-grid-column-label">
              {columnIndex + 1}
            </div>
          ))}
          {Array.from({ length: maxRow + 1 }, (_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="seat-grid-row-label"
              style={{ gridRow: rowIndex + 2, gridColumn: 1 }}
            >
              {String.fromCharCode("A".charCodeAt(0) + rowIndex)}
            </div>
          ))}
          {positionedSeats.map(({ seat, gridRow, gridColumn }) => {
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
                  "seat-button",
                  "seat-positioned-button",
                  seatType === "VIP" ? "seat-vip" : "seat-normal",
                  isInactive ? "seat-inactive" : "",
                  changed ? "seat-changed" : "",
                  selected ? "seat-selected" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                style={{ gridRow: gridRow + 2, gridColumn: gridColumn + 2 }}
                onClick={() => onSelectSeat(seat)}
                title={`${seat.seatName} - ${typeLabel} - ${statusLabel}`}
                aria-pressed={selected}
                aria-label={`${seat.seatName}, ${typeLabel}, ${statusLabel}${selected ? ", đang chọn" : ""}${changed ? ", chưa lưu" : ""}`}
              >
                <span className="seat-cell-icon" aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export default SeatMap
