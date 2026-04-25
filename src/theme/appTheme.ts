export type AppThemeName = "claro" | "oscuro" | "morado" | "azul"

export type AppTheme = {
  nombre: string
  page: string
  sidebar: string
  card: string
  panel: string
  input: string
  text: string
  muted: string
  border: string
  selected: string
  selectedBorder: string
  primary: string
  primaryHover: string
  buttonDark: string
  mine: string
  other: string
  otherBorder: string
  otherText: string
}

export const appThemes: Record<AppThemeName, AppTheme> = {
  claro: {
    nombre: "Claro",
    page: "#f5f2ff",
    sidebar: "#ffffff",
    card: "#ffffff",
    panel: "#fcfbff",
    input: "#f8f6ff",
    text: "#20224a",
    muted: "#8f95b2",
    border: "#ece7fb",
    selected: "#f3efff",
    selectedBorder: "#dcd2ff",
    primary: "#8f7cf8",
    primaryHover: "#7e69f6",
    buttonDark: "#20224a",
    mine: "#8f7cf8",
    other: "#ffffff",
    otherBorder: "#ece7fb",
    otherText: "#20224a",
  },

  oscuro: {
    nombre: "Oscuro",
    page: "#0f172a",
    sidebar: "#111827",
    card: "#111827",
    panel: "#0b1220",
    input: "#1e293b",
    text: "#f8fafc",
    muted: "#94a3b8",
    border: "#334155",
    selected: "#1e1b4b",
    selectedBorder: "#6366f1",
    primary: "#8b5cf6",
    primaryHover: "#7c3aed",
    buttonDark: "#4f46e5",
    mine: "#7c3aed",
    other: "#1e293b",
    otherBorder: "#334155",
    otherText: "#f8fafc",
  },

  morado: {
    nombre: "Morado",
    page: "#f3e8ff",
    sidebar: "#ffffff",
    card: "#ffffff",
    panel: "#faf5ff",
    input: "#f5efff",
    text: "#2e1065",
    muted: "#8b5bb8",
    border: "#e9d5ff",
    selected: "#ede9fe",
    selectedBorder: "#c4b5fd",
    primary: "#7c3aed",
    primaryHover: "#6d28d9",
    buttonDark: "#4c1d95",
    mine: "#7c3aed",
    other: "#ffffff",
    otherBorder: "#e9d5ff",
    otherText: "#2e1065",
  },

  azul: {
    nombre: "Azul",
    page: "#eaf3ff",
    sidebar: "#ffffff",
    card: "#ffffff",
    panel: "#f8fbff",
    input: "#eff6ff",
    text: "#0f2a4d",
    muted: "#64748b",
    border: "#cfe3ff",
    selected: "#dbeafe",
    selectedBorder: "#93c5fd",
    primary: "#2563eb",
    primaryHover: "#1d4ed8",
    buttonDark: "#1e3a8a",
    mine: "#2563eb",
    other: "#ffffff",
    otherBorder: "#cfe3ff",
    otherText: "#0f2a4d",
  },
}