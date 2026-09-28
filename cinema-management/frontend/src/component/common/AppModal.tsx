import { useEffect, useId, type MouseEvent, type ReactNode } from "react"
import { createPortal } from "react-dom"

interface AppModalAction {
  label: string
  onClick: () => void
  variant?: "primary" | "secondary" | "danger"
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
}

let openModalCount = 0
let originalBodyOverflow = ""
let originalBodyPaddingRight = ""

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
}: AppModalProps) {
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
            <button key={action.label} type="button" className={className} onClick={action.onClick}>
              {action.label}
            </button>
          )
        })
      : null)

  useEffect(() => {
    if (!open) return undefined

    lockBodyScroll()
    return unlockBodyScroll
  }, [open])

  useEffect(() => {
    if (!open || !closeOnEsc || !onClose) return undefined

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose?.()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [closeOnEsc, onClose, open])

  function handleOverlayClick() {
    if (closeOnOverlay) onClose?.()
  }

  function stopModalClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation()
  }

  if (!open) return null

  return createPortal(
    <div className="modal-overlay modal-backdrop" role="presentation" onMouseDown={handleOverlayClick}>
      <section
        className={`modal app-modal modal--${modalSize} modal-${variant}`}
        role="dialog"
        aria-modal="true"
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
            <button type="button" className="modal__close" aria-label="Đóng modal" onClick={onClose}>
              ×
            </button>
          )}
        </header>

        {bodyContent && <div className="modal__body modal-body">{bodyContent}</div>}

        {footerContent && <footer className="modal__footer modal-actions">{footerContent}</footer>}
      </section>
    </div>,
    document.body,
  )
}

export default AppModal
