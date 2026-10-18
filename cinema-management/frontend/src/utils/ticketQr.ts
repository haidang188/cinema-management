export interface TicketQrInfo {
  bookingCode: string
  movieTitle: string
  showtime: string
  seats: string
  room?: string | null
}

function loadSvgImage(svg: SVGSVGElement): Promise<HTMLImageElement> {
  const clone = svg.cloneNode(true) as SVGSVGElement
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg")
  const markup = new XMLSerializer().serializeToString(clone)
  const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }))

  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      URL.revokeObjectURL(url)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error("Không thể tạo ảnh mã QR"))
    }
    image.src = url
  })
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (context.measureText(text).width <= maxWidth) return text
  let value = text
  while (value.length > 1 && context.measureText(`${value}…`).width > maxWidth) {
    value = value.slice(0, -1)
  }
  return `${value}…`
}

/**
 * Tải về ảnh PNG "thẻ vé" gồm mã QR (vẽ từ SVG của qrcode.react) và thông tin đặt vé,
 * để khách lưu vào máy và xuất trình tại cửa soát vé.
 */
export async function downloadTicketQr(svg: SVGSVGElement, info: TicketQrInfo) {
  const qr = await loadSvgImage(svg)
  const width = 640
  const height = 900
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (!context) throw new Error("Trình duyệt không hỗ trợ tạo ảnh")

  const font = 'Inter, "Segoe UI", Arial, sans-serif'

  context.fillStyle = "#ffffff"
  context.fillRect(0, 0, width, height)

  context.fillStyle = "#e50914"
  context.fillRect(0, 0, width, 96)
  context.fillStyle = "#ffffff"
  context.font = `800 30px ${font}`
  context.textAlign = "center"
  context.fillText("PREMIERE CINEMAS", width / 2, 60)

  const qrSize = 440
  context.imageSmoothingEnabled = false
  context.drawImage(qr, (width - qrSize) / 2, 130, qrSize, qrSize)

  context.fillStyle = "#111111"
  context.font = `800 26px ${font}`
  context.fillText(info.bookingCode, width / 2, 618)

  context.fillStyle = "#6c757e"
  context.font = `500 17px ${font}`
  context.fillText("Xuất trình mã QR này tại cửa soát vé", width / 2, 648)

  context.strokeStyle = "#e3e6ea"
  context.setLineDash([8, 6])
  context.beginPath()
  context.moveTo(40, 680)
  context.lineTo(width - 40, 680)
  context.stroke()
  context.setLineDash([])

  context.textAlign = "left"
  context.fillStyle = "#111111"
  context.font = `800 24px ${font}`
  context.fillText(fitText(context, info.movieTitle, width - 80), 40, 724)

  const rows: [string, string][] = [
    ["Suất chiếu", info.showtime],
    ...(info.room ? ([["Phòng", info.room]] as [string, string][]) : []),
    ["Ghế", info.seats],
  ]

  rows.forEach(([label, value], index) => {
    const y = 766 + index * 36
    context.fillStyle = "#6c757e"
    context.font = `500 18px ${font}`
    context.fillText(label, 40, y)
    context.fillStyle = "#111111"
    context.font = `700 18px ${font}`
    context.fillText(fitText(context, value, width - 220), 180, y)
  })

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"))
  if (!blob) throw new Error("Không thể tạo ảnh mã QR")

  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `ve-${info.bookingCode}.png`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
