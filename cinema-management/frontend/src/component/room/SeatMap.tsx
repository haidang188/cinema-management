import type { Seat } from "../../types/admin"

const SEAT_TYPE_LABELS: Record<string, string> = {
  NORMAL: "Ghế thường",
  VIP: "Ghế VIP",
}

interface SeatMapProps {
  seats: Seat[]
  pendingSeatTypes: Record<number, string>
  onToggleSeat: (seat: Seat) => void
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

function SeatMap({ seats, pendingSeatTypes, onToggleSeat }: SeatMapProps) {
  const rows = groupSeatsByRow(seats)
  const sortedRowLabels = Object.keys(rows).sort((firstRow, secondRow) => firstRow.localeCompare(secondRow))

  return (
    <section className="seat-map-panel">
      <div className="screen-line" aria-label="Màn hình">
        <span>MÀN HÌNH</span>
      </div>

      <div className="seat-legend" aria-label="Chú thích loại ghế">
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
      </div>

      <div className="seat-rows">
        {sortedRowLabels.map((rowLabel) => (
          <div key={rowLabel} className="seat-row">
            <span className="row-label" aria-label={`Hàng ${rowLabel}`}>
              {rowLabel}
            </span>
            <div className="seat-grid">
              {rows[rowLabel]
                .sort((firstSeat, secondSeat) => firstSeat.seatNumber - secondSeat.seatNumber)
                .map((seat) => {
                  const seatType = pendingSeatTypes[seat.id] || seat.seatType
                  const isInactive = seat.status !== "ACTIVE"
                  const changed = Boolean(pendingSeatTypes[seat.id])
                  const typeLabel = getSeatTypeLabel(seatType)
                  const statusLabel = isInactive ? "không hoạt động" : "đang hoạt động"

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      className={[
                        "seat-button",
                        seatType === "VIP" ? "seat-vip" : "seat-normal",
                        isInactive ? "seat-inactive" : "",
                        changed ? "seat-changed" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      disabled={isInactive}
                      onClick={() => onToggleSeat(seat)}
                      title={`${seat.seatName} - ${typeLabel} - ${statusLabel}`}
                      aria-label={`${seat.seatName}, ${typeLabel}, ${statusLabel}${changed ? ", chưa lưu" : ""}`}
                    >
                      <span>{seat.seatName}</span>
                      <small>{seatType === "VIP" ? "VIP" : "NOR"}</small>
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
