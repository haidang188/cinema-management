import { useEffect, type ReactNode } from "react"

interface AppModalAction {
  label: string
  onClick: () => void
  variant?: "primary" | "secondary"
  disabled?: boolean
}

interface AppModalProps {
  title: string
  message?: ReactNode
  children?: ReactNode
  variant?: "success" | "warning"
  actions?: AppModalAction[]
  className?: string
  size?: "sm" | "md" | "lg"
  onClose?: () => void
  closeOnOverlay?: boolean
  confirmOnCloseMessage?: string
}

function AppModal({
  title,
  message,
  children,
  variant = "success",
  actions = [],
  className = "",
  size = "md",
  onClose,
  closeOnOverlay = true,
  confirmOnCloseMessage,
}: AppModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  })

  function requestClose() {
    if (!onClose) return
    if (confirmOnCloseMessage && !window.confirm(confirmOnCloseMessage)) return
    onClose()
  }

  function handleBackdropClick() {
    if (closeOnOverlay) {
      requestClose()
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={handleBackdropClick}>
      <section
        className={["app-modal", `modal-${variant}`, `modal-${size}`, className].filter(Boolean).join(" ")}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {onClose && (
          <button type="button" className="modal-close-button" aria-label="Đóng modal" onClick={requestClose}>
            ×
          </button>
        )}
        <div className="modal-body">
          <h2 id="app-modal-title">{title}</h2>
          {typeof message === "string" ? <p>{message}</p> : message}
          {children}
        </div>
        {actions.length > 0 && (
          <div className="modal-actions">
            {actions.map((action) => (
              <button
                key={action.label}
                type="button"
                className={action.variant === "secondary" ? "secondary-button" : "primary-button"}
                disabled={action.disabled}
                onClick={action.onClick}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default AppModal
