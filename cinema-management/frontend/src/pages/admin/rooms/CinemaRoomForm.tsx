import { Fragment, useMemo, useState, type FormEvent, type PointerEvent } from "react"
import AppModal from "../../../component/common/AppModal"
import type { CinemaRoom, CinemaRoomPayload, CinemaRoomSeatPayload, Seat } from "../../../types/admin"

type SeatTool = "NORMAL" | "VIP" | "INACTIVE" | "DELETE"

interface SeatCell {
  active: boolean
  seatType: "NORMAL" | "VIP"
  status: "ACTIVE" | "INACTIVE"
}

interface CinemaRoomFormProps {
  mode: "create" | "edit"
  initialRoom?: CinemaRoom
  saving: boolean
  onCancel: () => void
  onSubmit: (payload: CinemaRoomPayload) => Promise<void>
}

type ConfirmAction =
  | {
      type: "resize"
      rowCount: number
      columnCount: number
    }
  | {
      type: "clear"
    }

const ROOM_TYPES = ["2D", "3D", "IMAX", "VIP"]
const STATUSES = [
  { value: "ACTIVE", label: "Hoạt động" },
  { value: "MAINTENANCE", label: "Bảo trì" },
  { value: "INACTIVE", label: "Ngừng hoạt động" },
]
const TOOLS: Array<{ value: SeatTool; label: string }> = [
  { value: "NORMAL", label: "Ghế thường" },
  { value: "VIP", label: "Ghế VIP" },
  { value: "INACTIVE", label: "Ghế không hoạt động" },
  { value: "DELETE", label: "Khoảng trống" },
]
const MAX_ROWS = 20
const MAX_COLUMNS = 30
const DEFAULT_ROWS = 6
const DEFAULT_COLUMNS = 12

function getRowLabel(index: number) {
  return String.fromCharCode("A".charCodeAt(0) + index)
}

function createEmptyCell(): SeatCell {
  return { active: false, seatType: "NORMAL", status: "ACTIVE" }
}

function createEmptyGrid(rowCount: number, columnCount: number): SeatCell[][] {
  return Array.from({ length: rowCount }, () => Array.from({ length: columnCount }, createEmptyCell))
}

function resizeGrid(grid: SeatCell[][], rowCount: number, columnCount: number): SeatCell[][] {
  return Array.from({ length: rowCount }, (_, rowIndex) =>
    Array.from({ length: columnCount }, (_, columnIndex) => grid[rowIndex]?.[columnIndex] || createEmptyCell()),
  )
}

function hasGridPosition(seat: Seat) {
  return Number.isInteger(seat.gridRow) && Number.isInteger(seat.gridColumn) && Number(seat.gridRow) >= 0 && Number(seat.gridColumn) >= 0
}

function buildGridFromRoom(room?: CinemaRoom) {
  if (!room?.seats?.length) {
    return {
      rowCount: DEFAULT_ROWS,
      columnCount: DEFAULT_COLUMNS,
      grid: createEmptyGrid(DEFAULT_ROWS, DEFAULT_COLUMNS),
    }
  }

  const fallbackColumnByRow: Record<string, number> = {}
  const positionedSeats = [...room.seats]
    .sort((firstSeat, secondSeat) => {
      const rowCompare = (firstSeat.rowLabel || "").localeCompare(secondSeat.rowLabel || "")
      return rowCompare || firstSeat.seatNumber - secondSeat.seatNumber
    })
    .map((seat) => {
      if (hasGridPosition(seat)) {
        return { seat, gridRow: Number(seat.gridRow), gridColumn: Number(seat.gridColumn) }
      }
      const rowLabel = seat.rowLabel || "A"
      const gridRow = Math.max(0, rowLabel.charCodeAt(0) - "A".charCodeAt(0))
      const gridColumn = fallbackColumnByRow[rowLabel] || 0
      fallbackColumnByRow[rowLabel] = gridColumn + 1
      return { seat, gridRow, gridColumn }
    })
  const rowCount = Math.min(MAX_ROWS, Math.max(1, ...positionedSeats.map((item) => item.gridRow + 1)))
  const columnCount = Math.min(MAX_COLUMNS, Math.max(1, ...positionedSeats.map((item) => item.gridColumn + 1)))
  const grid = createEmptyGrid(rowCount, columnCount)

  positionedSeats.forEach(({ seat, gridRow, gridColumn }) => {
    if (gridRow >= rowCount || gridColumn >= columnCount) return
    grid[gridRow][gridColumn] = {
      active: true,
      seatType: seat.seatType === "VIP" ? "VIP" : "NORMAL",
      status: seat.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
    }
  })

  return { rowCount, columnCount, grid }
}

function applyTool(cell: SeatCell, tool: SeatTool): SeatCell {
  if (tool === "DELETE") return createEmptyCell()
  if (tool === "VIP") return { active: true, seatType: "VIP", status: "ACTIVE" }
  if (tool === "INACTIVE") return { active: true, seatType: "NORMAL", status: "INACTIVE" }
  return { active: true, seatType: "NORMAL", status: "ACTIVE" }
}

function normalizeSeats(grid: SeatCell[][]): CinemaRoomSeatPayload[] {
  return grid.flatMap((row, rowIndex) => {
    let seatNumber = 0
    return row.flatMap((cell, columnIndex) => {
      if (!cell.active) return []
      seatNumber += 1
      return [
        {
          rowLabel: getRowLabel(rowIndex),
          seatNumber,
          seatType: cell.seatType,
          status: cell.status,
          gridRow: rowIndex,
          gridColumn: columnIndex,
        },
      ]
    })
  })
}

function hasActiveSeatsOutside(grid: SeatCell[][], rowCount: number, columnCount: number) {
  return grid.some((row, rowIndex) =>
    row.some((cell, columnIndex) => cell.active && (rowIndex >= rowCount || columnIndex >= columnCount)),
  )
}

function CinemaRoomForm({ mode, initialRoom, saving, onCancel, onSubmit }: CinemaRoomFormProps) {
  const initialLayout = useMemo(() => buildGridFromRoom(initialRoom), [initialRoom])
  const [formValues, setFormValues] = useState({
    name: initialRoom?.name || "",
    roomType: initialRoom?.roomType || "2D",
    status: initialRoom?.status || "ACTIVE",
  })
  const [rowCount, setRowCount] = useState(initialLayout.rowCount)
  const [columnCount, setColumnCount] = useState(initialLayout.columnCount)
  const [grid, setGrid] = useState<SeatCell[][]>(initialLayout.grid)
  const [selectedTool, setSelectedTool] = useState<SeatTool>("NORMAL")
  const [isPainting, setIsPainting] = useState(false)
  const [paintingTool, setPaintingTool] = useState<SeatTool>("NORMAL")
  const [error, setError] = useState("")
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null)

  const stats = useMemo(() => {
    const seats = grid.flat().filter((cell) => cell.active)
    return {
      total: seats.length,
      normal: seats.filter((cell) => cell.status === "ACTIVE" && cell.seatType === "NORMAL").length,
      vip: seats.filter((cell) => cell.status === "ACTIVE" && cell.seatType === "VIP").length,
      inactive: seats.filter((cell) => cell.status === "INACTIVE").length,
    }
  }, [grid])

  function updateField(name: keyof typeof formValues, value: string) {
    setFormValues((current) => ({ ...current, [name]: value }))
  }

  function updateGridSize(nextRows: number, nextColumns: number) {
    const safeRows = Math.min(MAX_ROWS, Math.max(1, nextRows))
    const safeColumns = Math.min(MAX_COLUMNS, Math.max(1, nextColumns))
    if (
      (safeRows < rowCount || safeColumns < columnCount) &&
      hasActiveSeatsOutside(grid, safeRows, safeColumns)
    ) {
      setConfirmAction({ type: "resize", rowCount: safeRows, columnCount: safeColumns })
      return
    }
    setRowCount(safeRows)
    setColumnCount(safeColumns)
    setGrid((current) => resizeGrid(current, safeRows, safeColumns))
  }

  function paintCell(rowIndex: number, columnIndex: number, tool: SeatTool) {
    setGrid((current) =>
      current.map((row, currentRowIndex) =>
        currentRowIndex === rowIndex
          ? row.map((cell, currentColumnIndex) => (currentColumnIndex === columnIndex ? applyTool(cell, tool) : cell))
          : row,
      ),
    )
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>, rowIndex: number, columnIndex: number) {
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsPainting(true)
    setPaintingTool(selectedTool)
    paintCell(rowIndex, columnIndex, selectedTool)
  }

  function handlePointerEnter(rowIndex: number, columnIndex: number) {
    if (!isPainting) return
    paintCell(rowIndex, columnIndex, paintingTool)
  }

  function stopPainting() {
    setIsPainting(false)
  }

  function fillAllSeats() {
    setGrid((current) => current.map((row) => row.map(() => ({ active: true, seatType: "NORMAL", status: "ACTIVE" }))))
  }

  function clearAllSeats() {
    if (stats.total > 0) {
      setConfirmAction({ type: "clear" })
      return
    }
    setGrid((current) => current.map((row) => row.map(createEmptyCell)))
  }

  function confirmPendingAction() {
    if (!confirmAction) return

    if (confirmAction.type === "resize") {
      setRowCount(confirmAction.rowCount)
      setColumnCount(confirmAction.columnCount)
      setGrid((current) => resizeGrid(current, confirmAction.rowCount, confirmAction.columnCount))
    } else {
      setGrid((current) => current.map((row) => row.map(createEmptyCell)))
    }

    setConfirmAction(null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = formValues.name.trim()
    if (!name) {
      setError("Vui lòng nhập tên phòng chiếu.")
      return
    }

    const seats = normalizeSeats(grid)
    if (seats.length === 0) {
      setError("Vui lòng tạo ít nhất 1 ghế.")
      return
    }

    setError("")
    try {
      await onSubmit({
        name,
        roomType: formValues.roomType,
        status: formValues.status,
        seats,
      })
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Không thể lưu phòng chiếu. Vui lòng thử lại.")
    }
  }

  return (
    <form className="room-designer-shell" onSubmit={handleSubmit}>
      {error && <div className="room-alert room-alert-error">{error}</div>}

      <section className="room-designer-layout">
        <aside className="room-designer-sidebar">
          <section className="room-designer-panel">
            <h2>Thông tin phòng</h2>
            <label className="room-form-field">
              <span>Tên phòng *</span>
              <input value={formValues.name} onChange={(event) => updateField("name", event.target.value)} />
            </label>
            <div className="room-form-grid compact">
              <label className="room-form-field">
                <span>Loại phòng *</span>
                <select value={formValues.roomType} onChange={(event) => updateField("roomType", event.target.value)}>
                  {ROOM_TYPES.map((roomType) => (
                    <option key={roomType} value={roomType}>
                      {roomType}
                    </option>
                  ))}
                </select>
              </label>
              <label className="room-form-field">
                <span>Trạng thái</span>
                <select value={formValues.status} onChange={(event) => updateField("status", event.target.value)}>
                  {STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="room-total-pill">
              <span>Tổng số ghế</span>
              <strong>{stats.total}</strong>
            </div>
          </section>

          <section className="room-designer-panel">
            <h2>Thiết kế sơ đồ ghế</h2>
            <div className="room-form-grid compact">
              <label className="room-form-field">
                <span>Số hàng</span>
                <input
                  min="1"
                  max={MAX_ROWS}
                  type="number"
                  value={rowCount}
                  onChange={(event) => updateGridSize(Number(event.target.value || 1), columnCount)}
                />
              </label>
              <label className="room-form-field">
                <span>Số cột</span>
                <input
                  min="1"
                  max={MAX_COLUMNS}
                  type="number"
                  value={columnCount}
                  onChange={(event) => updateGridSize(rowCount, Number(event.target.value || 1))}
                />
              </label>
            </div>
          </section>

          <section className="room-designer-panel">
            <h2>Công cụ</h2>
            <div className="seat-tool-bar designer-tools" role="toolbar" aria-label="Công cụ ghế">
              {TOOLS.map((tool) => (
                <button
                  key={tool.value}
                  type="button"
                  className={`seat-tool-button${selectedTool === tool.value ? " is-active" : ""}`}
                  aria-pressed={selectedTool === tool.value}
                  onClick={() => setSelectedTool(tool.value)}
                >
                  {tool.label}
                </button>
              ))}
            </div>
          </section>

          <section className="room-designer-panel">
            <h2>Thao tác nhanh</h2>
            <div className="seat-quick-actions">
              <button type="button" className="secondary-button" onClick={fillAllSeats}>
                Tạo tất cả ghế
              </button>
              <button type="button" className="secondary-button" onClick={clearAllSeats}>
                Xóa toàn bộ
              </button>
            </div>
          </section>

          <section className="room-designer-panel room-designer-note">
            <h2>Lưu ý</h2>
            <ul>
              <li>Chỉ các ghế được chọn mới được lưu vào hệ thống.</li>
              <li>Ô trống là lối đi hoặc khoảng trống, không tạo ghế.</li>
              <li>Có thể kéo chuột để vẽ hoặc xoá nhiều ghế cùng lúc.</li>
            </ul>
          </section>
        </aside>

        <section className="seat-designer-stage">
          <div className="seat-stage-header">
            <div>
              <h2>Sơ đồ ghế</h2>
              <p>Nhấn và kéo chuột để thêm hoặc xóa ghế.</p>
            </div>
            <strong>Tổng số ghế: {stats.total}</strong>
          </div>

          <div className="seat-grid-legend" aria-label="Chú thích">
            <span>
              <i className="legend-normal" aria-hidden="true" />
              Ghế thường
            </span>
            <span>
              <i className="legend-vip" aria-hidden="true" />
              Ghế VIP
            </span>
            <span>
              <i className="legend-inactive" aria-hidden="true" />
              Ghế không hoạt động
            </span>
            <span>
              <i className="legend-empty" aria-hidden="true" />
              Khoảng trống
            </span>
          </div>

          <div className="screen-line" aria-label="Màn hình">
            <span>MÀN HÌNH</span>
          </div>

          <div className="seat-grid-scroll">
            <div
              className="seat-grid-table designer-grid-table"
              style={{ gridTemplateColumns: `40px repeat(${columnCount}, 54px)` }}
              onPointerLeave={stopPainting}
              onPointerUp={stopPainting}
            >
              <div className="seat-grid-corner" aria-hidden="true" />
              {Array.from({ length: columnCount }, (_, columnIndex) => (
                <div key={`column-${columnIndex}`} className="seat-grid-column-label">
                  {columnIndex + 1}
                </div>
              ))}
              {grid.map((row, rowIndex) => (
                <Fragment key={`row-${rowIndex}`}>
                  <div className="seat-grid-row-label">{getRowLabel(rowIndex)}</div>
                  {row.map((cell, columnIndex) => (
                    <button
                      key={`${rowIndex}-${columnIndex}`}
                      type="button"
                      className={[
                        "seat-grid-cell",
                        "designer-seat-cell",
                        cell.active ? "is-seat" : "is-empty",
                        cell.seatType === "VIP" ? "is-vip" : "",
                        cell.status === "INACTIVE" ? "is-inactive" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      aria-label={`${getRowLabel(rowIndex)} cột ${columnIndex + 1}${cell.active ? ", có ghế" : ", khoảng trống"}`}
                      onPointerDown={(event) => handlePointerDown(event, rowIndex, columnIndex)}
                      onPointerEnter={() => handlePointerEnter(rowIndex, columnIndex)}
                      onPointerUp={stopPainting}
                    >
                      {cell.active && <span className="seat-cell-icon" aria-hidden="true" />}
                    </button>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>

          <section className="seat-stat-grid" aria-label="Thống kê ghế">
            <div>
              <strong>{stats.total}</strong>
              <span>Tổng số ghế</span>
            </div>
            <div>
              <strong>{stats.normal}</strong>
              <span>Ghế thường</span>
            </div>
            <div>
              <strong>{stats.vip}</strong>
              <span>Ghế VIP</span>
            </div>
            <div>
              <strong>{stats.inactive}</strong>
              <span>Ghế không hoạt động</span>
            </div>
          </section>
        </section>
      </section>

      <div className="room-action-bar designer-actions">
        <button type="button" className="secondary-button" disabled={saving} onClick={onCancel}>
          Hủy
        </button>
        <button type="submit" className="primary-button" disabled={saving}>
          {saving ? "Đang lưu..." : mode === "create" ? "Tạo phòng" : "Lưu thay đổi"}
        </button>
      </div>

      {confirmAction && (
        <AppModal
          title={confirmAction.type === "resize" ? "Giảm kích thước sơ đồ" : "Xóa toàn bộ ghế"}
          message={
            confirmAction.type === "resize"
              ? "Việc giảm kích thước sơ đồ sẽ xóa một số ghế nằm ngoài vùng mới. Bạn có muốn tiếp tục?"
              : "Bạn có chắc muốn xóa toàn bộ ghế khỏi sơ đồ?"
          }
          variant="warning"
          size="sm"
          closeOnOverlay
          onClose={() => setConfirmAction(null)}
          actions={[
            {
              label: "Hủy",
              variant: "secondary",
              onClick: () => setConfirmAction(null),
            },
            {
              label: "Xác nhận",
              onClick: confirmPendingAction,
            },
          ]}
        />
      )}
    </form>
  )
}

export default CinemaRoomForm
