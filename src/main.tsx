;(window as any).global = window

import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { AppThemeProvider } from "./theme/AppThemeContext"

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppThemeProvider>
      <App />
    </AppThemeProvider>
  </React.StrictMode>
)