import { useEffect, useRef, type ReactNode } from "react"
import { X } from "lucide-react"

interface BookingModalProps {
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
  showFooter?: boolean
}

export default function BookingModal({ title, onClose, children, className = "", showFooter = true }: BookingModalProps) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  return <dialog ref={dialog} className={`premiere-modal ${className}`.trim()} onCancel={onClose} onClick={event => { if (event.target === event.currentTarget) onClose() }}>
    <header><h2>{title}</h2><button type="button" aria-label="Đóng" onClick={onClose}><X size={20} /></button></header>
    <div className="premiere-modal-body">{children}</div>
    {showFooter && <footer><button type="button" onClick={onClose}>Đóng</button></footer>}
  </dialog>
}
