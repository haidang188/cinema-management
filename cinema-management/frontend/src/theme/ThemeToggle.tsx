import { Moon, Sun } from "lucide-react"

import { useTheme } from "./theme-context"

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()
  const nextThemeLabel = theme === "dark" ? "sáng" : "tối"

  return (
    <button
      type="button"
      className="theme-toggle"
      aria-label={`Chuyển sang giao diện ${nextThemeLabel}`}
      title={`Chuyển sang giao diện ${nextThemeLabel}`}
      onClick={toggleTheme}
    >
      <span className={theme === "light" ? "is-active" : undefined} aria-hidden="true">
        <Sun size={16} />
      </span>
      <span className={theme === "dark" ? "is-active" : undefined} aria-hidden="true">
        <Moon size={16} />
      </span>
    </button>
  )
}

export default ThemeToggle
