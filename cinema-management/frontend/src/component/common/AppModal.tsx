import type { ReactNode } from "react"

interface AppModalAction {
  label: string
  onClick: () => void
  variant?: "primary" | "secondary"
}

interface AppModalProps {
  title: string
  message: ReactNode
  variant?: "success" | "warning"
  actions: AppModalAction[]
}

function AppModal({ title, message, variant = "success", actions }: AppModalProps) {
  return (
    <div className="modal-backdrop" role="presentation">
      <section
        className={`app-modal modal-${variant}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-modal-title"
      >
        <div className="modal-body">
          <h2 id="app-modal-title">{title}</h2>
          {typeof message === "string" ? <p>{message}</p> : message}
        </div>
        <div className="modal-actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={action.variant === "secondary" ? "secondary-button" : "primary-button"}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default AppModal
