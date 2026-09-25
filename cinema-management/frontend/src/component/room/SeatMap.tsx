import type { Seat } from "../../types/admin"

const SEAT_TYPE_LABELS: Record<string, string> = {
  NORMAL: "Ghế thường",
  VIP: "Ghế VIP",
}

const SEAT_STATUS_LABELS: Record<string, string> = {
  ACTIVE: "Đang hoạt động",
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

function groupSeatsByRow(seats: Seat[]): Record<string, Seat[]> {
  return seats.reduce<Record<string, Seat[]>>((rows, seat) => {
    const row = seat.rowLabel || "?"
    if (!rows[row]) {
      rows[row] = []
    }
    rows[row].push(seat)
    return rows
  }, {})
}

function getSeatTypeLabel(seatType?: string) {
  return SEAT_TYPE_LABELS[seatType || ""] || seatType || "Chưa phân loại"
}

function getSeatStatusLabel(status?: string) {
  return SEAT_STATUS_LABELS[status || ""] || status || "Chưa rõ trạng thái"
}

function SeatMap({ seats, pendingSeats, selectedSeatIds, onSelectSeat }: SeatMapProps) {
  const rows = groupSeatsByRow(seats)
  const sortedRowLabels = Object.keys(rows).sort((firstRow, secondRow) => firstRow.localeCompare(secondRow))
  const selectedSeatIdSet = new Set(selectedSeatIds)

  return (
    <section className="seat-map-panel">
      <div className="screen-line" aria-label="Màn hình">
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
          Ghế không hoạt động
        </span>
        <span className="legend-item">
          <i className="legend-changed" aria-hidden="true" />
          Chưa lưu
        </span>
      </div>

      <div className="seat-rows">
        {sortedRowLabels.map((rowLabel) => (
          <div key={rowLabel} className="seat-row">
            <span className="row-label" aria-label={`Hàng ${rowLabel}`}>
              {rowLabel}
            </span>
            <div className="seat-grid">
              {[...rows[rowLabel]]
                .sort((firstSeat, secondSeat) => firstSeat.seatNumber - secondSeat.seatNumber)
                .map((seat) => {
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
                        seatType === "VIP" ? "seat-vip" : "seat-normal",
                        isInactive ? "seat-inactive" : "",
                        changed ? "seat-changed" : "",
                        selected ? "seat-selected" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      onClick={() => onSelectSeat(seat)}
                      title={`${seat.seatName} - ${typeLabel} - ${statusLabel}`}
                      aria-pressed={selected}
                      aria-label={`${seat.seatName}, ${typeLabel}, ${statusLabel}${selected ? ", đang chọn" : ""}${changed ? ", chưa lưu" : ""}`}
                    >
                      <span>{seat.seatName}</span>
                      <small>{isInactive ? "INACTIVE" : seatType}</small>
                    </button>
                  )
                })}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default SeatMap
