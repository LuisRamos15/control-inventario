import { createContext, useContext, useEffect, useMemo, useState } from "react"
import { appThemes } from "./appTheme"
import type { AppThemeName } from "./appTheme"

type AppThemeContextValue = {
  themeName: AppThemeName
  theme: typeof appThemes[AppThemeName]
  setThemeName: (theme: AppThemeName) => void
}

const AppThemeContext = createContext<AppThemeContextValue | null>(null)

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeName, setThemeNameState] = useState<AppThemeName>(() => {
    const saved = localStorage.getItem("appTheme")
    if (saved === "claro" || saved === "oscuro" || saved === "morado" || saved === "azul") {
      return saved
    }

    const oldChatTheme = localStorage.getItem("temaChat")
    if (oldChatTheme === "claro" || oldChatTheme === "oscuro" || oldChatTheme === "morado" || oldChatTheme === "azul") {
      return oldChatTheme
    }

    return "claro"
  })

  const theme = appThemes[themeName]

  const setThemeName = (value: AppThemeName) => {
    setThemeNameState(value)
  }

  useEffect(() => {
    localStorage.setItem("appTheme", themeName)
    localStorage.setItem("temaChat", themeName)
  }, [themeName])

  useEffect(() => {
    const root = document.documentElement

    root.style.setProperty("--app-page", theme.page)
    root.style.setProperty("--app-sidebar", theme.sidebar)
    root.style.setProperty("--app-card", theme.card)
    root.style.setProperty("--app-panel", theme.panel)
    root.style.setProperty("--app-input", theme.input)
    root.style.setProperty("--app-text", theme.text)
    root.style.setProperty("--app-muted", theme.muted)
    root.style.setProperty("--app-border", theme.border)
    root.style.setProperty("--app-selected", theme.selected)
    root.style.setProperty("--app-selected-border", theme.selectedBorder)
    root.style.setProperty("--app-primary", theme.primary)
    root.style.setProperty("--app-primary-hover", theme.primaryHover)
    root.style.setProperty("--app-button-dark", theme.buttonDark)
    root.style.setProperty("--app-mine", theme.mine)
    root.style.setProperty("--app-other", theme.other)
    root.style.setProperty("--app-other-border", theme.otherBorder)
    root.style.setProperty("--app-other-text", theme.otherText)
  }, [theme])

  const value = useMemo(() => {
    return {
      themeName,
      theme,
      setThemeName,
    }
  }, [themeName, theme])

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  )
}

export function useAppTheme() {
  const context = useContext(AppThemeContext)

  if (!context) {
    throw new Error("useAppTheme debe usarse dentro de AppThemeProvider")
  }

  return context
}