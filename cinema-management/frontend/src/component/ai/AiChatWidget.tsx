import { useEffect, useRef, useState } from "react"
import { chatWithAi } from "../../service/ai/aiService"
import "./ai-chat.css"

interface Message {
  role: "user" | "assistant"
  text: string
}

export default function AiChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const busy = useRef(false)
  const input = useRef<HTMLInputElement>(null)
  const history = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])

  useEffect(() => {
    if (open && history.current) history.current.scrollTop = history.current.scrollHeight
  }, [messages, loading, error, open])

  async function send(event: React.FormEvent) {
    event.preventDefault()
    const message = draft.trim()
    if (!message || message.length > 1000 || busy.current) return
    busy.current = true
    setMessages((current) => [...current, { role: "user", text: message }])
    setDraft("")
    setLoading(true)
    setError("")
    try {
      const reply = await chatWithAi(message)
      setMessages((current) => [...current, { role: "assistant", text: reply }])
    } catch {
      setError("Trợ lý AI hiện không thể phản hồi. Vui lòng thử lại sau.")
      setDraft(message)
    } finally {
      busy.current = false
      setLoading(false)
      input.current?.focus()
    }
  }

  return (
    <aside className="cinema-ai" aria-label="Trợ lý phim AI">
      {open && (
        <section id="cinema-ai-panel" className="cinema-ai-panel" aria-labelledby="cinema-ai-title"
          onKeyDown={(event) => { if (event.key === "Escape") setOpen(false) }}>
          <header>
            <strong id="cinema-ai-title">Cinema AI · Tư vấn phim</strong>
            <button type="button" aria-label="Đóng trợ lý AI" onClick={() => setOpen(false)}>×</button>
          </header>
          <div ref={history} className="cinema-ai-history" role="log" aria-live="polite" aria-busy={loading}>
            {messages.length === 0 && <p>Bạn muốn xem phim gì? Hãy hỏi tôi về các phim của rạp.</p>}
            {messages.map((message, index) => (
              <p key={index} className={`cinema-ai-message cinema-ai-${message.role}`}>
                <strong>{message.role === "user" ? "Bạn" : "Cinema AI"}: </strong>{message.text}
              </p>
            ))}
            {loading && <p role="status">Đang tìm phim phù hợp...</p>}
            {error && <p role="alert">{error}</p>}
          </div>
          <form onSubmit={send}>
            <label className="cinema-ai-label" htmlFor="cinema-ai-input">Câu hỏi về phim</label>
            <div className="cinema-ai-compose">
              <input ref={input} id="cinema-ai-input" value={draft} maxLength={1000} placeholder="Nhập câu hỏi về phim..."
                onChange={(event) => setDraft(event.target.value)} />
              <button type="submit" disabled={loading || !draft.trim()}>Gửi</button>
            </div>
          </form>
        </section>
      )}
      <button type="button" className="cinema-ai-toggle" aria-expanded={open} aria-controls="cinema-ai-panel"
        onClick={() => setOpen((current) => !current)}>{open ? "Đóng AI" : "Hỏi AI"}</button>
    </aside>
  )
}
