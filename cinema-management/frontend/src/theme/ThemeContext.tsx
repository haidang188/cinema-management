import { useLayoutEffect, useMemo } from "react"
import type { ReactNode } from "react"

import { ThemeContext } from "./theme-context"
import type { Theme, ThemeContextValue } from "./theme-context"

const STORAGE_KEY = "premiere.theme"
// Giao diện chỉ dùng nền tối; mọi lựa chọn "light" cũ trong localStorage bị bỏ qua.
const FIXED_THEME: Theme = "dark"

export function ThemeProvider({ children }: { children: ReactNode }) {
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = FIXED_THEME
    document.documentElement.style.colorScheme = FIXED_THEME
    try {
      window.localStorage.setItem(STORAGE_KEY, FIXED_THEME)
    } catch {
      // localStorage có thể bị chặn (chế độ riêng tư) — không ảnh hưởng giao diện.
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme: FIXED_THEME,
      setTheme: () => undefined,
      toggleTheme: () => undefined,
    }),
    [],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
