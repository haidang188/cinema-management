import { useEffect, useId, useRef, useState, type MouseEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"

interface AppModalAction {
  label: string
  onClick: () => void
  variant?: "primary" | "secondary" | "danger"
  disabled?: boolean
}

interface AppModalProps {
  open?: boolean
  title: string
  subtitle?: string
  message?: ReactNode
  children?: ReactNode
  footer?: ReactNode
  variant?: "success" | "warning"
  actions?: AppModalAction[]
  size?: "sm" | "md" | "lg" | "xl"
  closeOnOverlay?: boolean
  closeOnEsc?: boolean
  onClose?: () => void
  busy?: boolean
  confirmClose?: boolean
}

let openModalCount = 0
let originalBodyOverflow = ""
let originalBodyPaddingRight = ""
const modalStack: HTMLElement[] = []

function lockBodyScroll() {
  if (openModalCount === 0) {
    originalBodyOverflow = document.body.style.overflow
    originalBodyPaddingRight = document.body.style.paddingRight

    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
    document.body.style.overflow = "hidden"
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`
    }
  }

  openModalCount += 1
}

function unlockBodyScroll() {
  openModalCount = Math.max(0, openModalCount - 1)
  if (openModalCount === 0) {
    document.body.style.overflow = originalBodyOverflow
    document.body.style.paddingRight = originalBodyPaddingRight
  }
}

function AppModal({
  open = true,
  title,
  subtitle,
  message,
  children,
  footer,
  variant = "success",
  actions = [],
  size,
  closeOnOverlay = false,
  closeOnEsc = true,
  onClose,
  busy = false,
  confirmClose = false,
}: AppModalProps) {
  const dialogRef = useRef<HTMLElement>(null)
  const [showDiscard, setShowDiscard] = useState(false)
  const closeRef = useRef<() => void>(() => {})
  useEffect(() => {
    closeRef.current = () => {
      if (busy || !onClose) return
      if (confirmClose) setShowDiscard(true)
      else onClose()
    }
  }, [busy, confirmClose, onClose])
  const titleId = useId()
  const subtitleId = useId()
  const modalSize = size || (variant === "warning" ? "sm" : "md")
  const bodyContent = children || (typeof message === "string" ? <p>{message}</p> : message)
  const footerContent =
    footer ||
    (actions.length > 0
      ? actions.map((action, index) => {
          const actionVariant =
            action.variant || (variant === "warning" && index === actions.length - 1 ? "danger" : "primary")
          const className = [
            actionVariant === "secondary" ? "secondary-button" : "primary-button",
            "modal__button",
            `modal__button--${actionVariant}`,
          ].join(" ")

          return (
            <button
              key={action.label}
              type="button"
              className={className}
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          )
        })
      : null)

  useEffect(() => {
    if (!open) return undefined

    lockBodyScroll()
    const dialog = dialogRef.current!
    const previousFocus = document.activeElement as HTMLElement | null
    modalStack.push(dialog)
    const focusable = () => Array.from(dialog.querySelectorAll<HTMLElement>(
      'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]',
    )).filter((element) => !element.closest('[hidden], [inert]') && element.getAttribute('aria-hidden') !== 'true')
    const focusFirst = () => (focusable()[0] || dialog).focus()
    focusFirst()
    function trapFocus(event: FocusEvent) {
      if (modalStack.at(-1) === dialog && !dialog.contains(event.target as Node)) focusFirst()
    }
    function handleTab(event: KeyboardEvent) {
      if (modalStack.at(-1) !== dialog || event.key !== 'Tab') return
      const items = focusable()
      const first = items[0]
      const last = items.at(-1)
      if (!items.length || (event.shiftKey && (document.activeElement === first || document.activeElement === dialog))) {
        event.preventDefault()
        ;(last || dialog).focus()
      } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
        event.preventDefault()
        ;(first || dialog).focus()
      }
    }
    document.addEventListener('focusin', trapFocus)
    document.addEventListener('keydown', handleTab)
    return () => {
      modalStack.splice(modalStack.indexOf(dialog), 1)
      document.removeEventListener('focusin', trapFocus)
      document.removeEventListener('keydown', handleTab)
      unlockBodyScroll()
      if (previousFocus?.isConnected) previousFocus.focus()
    }
  }, [open])

  useEffect(() => {
    if (!open || !closeOnEsc || !onClose) return undefined

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && modalStack.at(-1) === dialogRef.current) {
        event.preventDefault()
        closeRef.current()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeOnEsc, onClose, open])

  function handleOverlayClick() {
    if (closeOnOverlay && modalStack.at(-1) === dialogRef.current) closeRef.current()
  }

  function stopModalClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation()
  }

  if (!open) return null

  return createPortal(
    <div className="modal-overlay" role="presentation" onMouseDown={handleOverlayClick}>
      <section
        ref={dialogRef}
        tabIndex={-1}
        className={`modal app-modal modal--${modalSize} modal-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        onMouseDown={stopModalClick}
      >
        <header className="modal__header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p id={subtitleId}>{subtitle}</p>}
          </div>
          {onClose && (
            <button type="button" className="modal__close" aria-label="Đóng hộp thoại" disabled={busy} onClick={() => closeRef.current()}>
              ×
            </button>
          )}
        </header>

        {bodyContent && <div className="modal__body modal-body">{bodyContent}</div>}

        {footerContent && <footer className="modal__footer modal-actions">{footerContent}</footer>}
      </section>
      {showDiscard && (
        <AppModal title="Bỏ các thay đổi chưa lưu?" message="Thông tin bạn vừa nhập chưa được lưu." variant="warning"
          onClose={() => setShowDiscard(false)} actions={[
            { label: "Tiếp tục chỉnh sửa", variant: "secondary", onClick: () => setShowDiscard(false) },
            { label: "Bỏ thay đổi", variant: "danger", onClick: () => { setShowDiscard(false); onClose?.() } },
          ]} />
      )}
    </div>,
    document.body,
  )
}

export default AppModal
