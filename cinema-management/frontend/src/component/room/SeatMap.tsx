import type { Seat } from "../../types/admin"

interface SeatMapProps {
  seats: Seat[]
  pendingSeatTypes: Record<number, string>
  onToggleSeat: (seat: Seat) => void
}

function groupSeatsByRow(seats: Seat[]): Record<string, Seat[]> {
  return seats.reduce<Record<string, Seat[]>>((rows, seat) => {
    const row = seat.rowLabel || '?'
    if (!rows[row]) {
      rows[row] = []
    }
    rows[row].push(seat)
    return rows
  }, {})
}

function SeatMap({ seats, pendingSeatTypes, onToggleSeat }: SeatMapProps) {
  const rows = groupSeatsByRow(seats)
  const sortedRowLabels = Object.keys(rows).sort((a, b) => a.localeCompare(b))

  return (
    <section className="seat-map-panel">
      <div className="screen-line">
        <span>Màn hình</span>
      </div>

      <div className="seat-legend">
        <span className="legend-item"><i className="legend-normal"></i>Ghế thường</span>
        <span className="legend-item"><i className="legend-vip"></i>Ghế VIP</span>
        <span className="legend-item"><i className="legend-inactive"></i>Không hoạt động</span>
      </div>

      <div className="seat-rows">
        {sortedRowLabels.map((rowLabel) => (
          <div key={rowLabel} className="seat-row">
            <span className="row-label">{rowLabel}</span>
            <div className="seat-grid">
              {rows[rowLabel]
                .sort((a, b) => a.seatNumber - b.seatNumber)
                .map((seat) => {
                  const seatType = pendingSeatTypes[seat.id] || seat.seatType
                  const isInactive = seat.status !== 'ACTIVE'
                  const changed = Boolean(pendingSeatTypes[seat.id])

                  return (
                    <button
                      key={seat.id}
                      type="button"
                      className={[
                        'seat-button',
                        seatType === 'VIP' ? 'seat-vip' : 'seat-normal',
                        isInactive ? 'seat-inactive' : '',
                        changed ? 'seat-changed' : '',
                      ].join(' ')}
                      disabled={isInactive}
                      onClick={() => onToggleSeat(seat)}
                      title={`${seat.seatName} - ${seatType}`}
                    >
                      {seat.seatName}
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
