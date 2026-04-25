import { useEffect, useMemo, useState } from "react"
import { Bell, AlertTriangle, Check } from "lucide-react"
import { getAlertasDashboard } from "../api/dashboard"
import { useAppTheme } from "../theme/AppThemeContext"

type AlertaNormalizada = {
  id: string
  titulo: string
  descripcion: string
  categoria: string
  severidad: "critica" | "activa"
  fechaTexto: string
}

function Alertas() {
  const [alertas, setAlertas] = useState<AlertaNormalizada[]>([])
  const [cargando, setCargando] = useState(true)
  const [filtro, setFiltro] = useState("todas")
  const [mensaje, setMensaje] = useState("")

  const token = localStorage.getItem("token") || ""
  const { theme } = useAppTheme()

  const decodeJwt = (jwt: string) => {
    try {
      const base64 = jwt.split(".")[1]
      const normalized = base64.replace(/-/g, "+").replace(/_/g, "/")
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
      const decoded = atob(padded)
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }

  const payload = decodeJwt(token)

  const roles: string[] = useMemo(() => {
    if (!payload) return []

    const rawRoles =
      payload.roles ||
      payload.authorities ||
      payload.auth ||
      payload.scope ||
      []

    if (Array.isArray(rawRoles)) {
      return rawRoles.map((r) => String(r).toUpperCase())
    }

    if (typeof rawRoles === "string") {
      return rawRoles
        .split(/[,\s]+/)
        .filter(Boolean)
        .map((r) => r.toUpperCase())
    }

    return []
  }, [payload])

  const esSuperAdmin =
    roles.includes("SUPER_ADMIN") || roles.includes("ROLE_SUPER_ADMIN")

  const esAdmin =
    roles.includes("ADMIN") || roles.includes("ROLE_ADMIN")

  const esSupervisor =
    roles.includes("SUPERVISOR") || roles.includes("ROLE_SUPERVISOR")

  const puedeVerAlertas = esSuperAdmin || esAdmin || esSupervisor

  const resolvedStorageKey = "alertas_resueltas_local"

  const [alertasResueltasIds, setAlertasResueltasIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(resolvedStorageKey)
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    localStorage.setItem(resolvedStorageKey, JSON.stringify(alertasResueltasIds))
  }, [alertasResueltasIds])

  useEffect(() => {
    const cargar = async () => {
      if (!puedeVerAlertas) {
        setAlertas([])
        setCargando(false)
        return
      }

      try {
        setCargando(true)
        const data = await getAlertasDashboard()

        const normalizadas = (Array.isArray(data) ? data : []).map((item: any, index: number) =>
          normalizarAlerta(item, index)
        )

        setAlertas(normalizadas)
      } catch (error) {
        console.log(error)
        setAlertas([])
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [puedeVerAlertas])

  useEffect(() => {
    if (!mensaje) return
    const timer = setTimeout(() => setMensaje(""), 2500)
    return () => clearTimeout(timer)
  }, [mensaje])

  const marcarComoResuelta = (id: string) => {
    if (alertasResueltasIds.includes(id)) return
    setAlertasResueltasIds((prev) => [...prev, id])
    setMensaje("Alerta marcada como resuelta")
  }

  const alertasActivas = alertas.filter((a) => !alertasResueltasIds.includes(a.id))
  const alertasResueltas = alertas.filter((a) => alertasResueltasIds.includes(a.id))
  const alertasCriticas = alertasActivas.filter((a) => a.severidad === "critica")

  const listaMostrar = useMemo(() => {
    if (filtro === "activas") return alertasActivas
    if (filtro === "resueltas") return alertasResueltas
    if (filtro === "criticas") return alertasCriticas
    return alertas
  }, [filtro, alertas, alertasActivas, alertasResueltas, alertasCriticas])

  const variables = {
    "--alert-page": theme.page,
    "--alert-card": theme.card,
    "--alert-panel": theme.panel,
    "--alert-input": theme.input,
    "--alert-text": theme.text,
    "--alert-muted": theme.muted,
    "--alert-border": theme.border,
    "--alert-selected": theme.selected,
    "--alert-primary": theme.primary,
    "--alert-primary-hover": theme.primaryHover,
    "--alert-button-dark": theme.buttonDark,
  } as React.CSSProperties

  if (!puedeVerAlertas) {
    return (
      <div className="alertas-page" style={variables}>
        <div className="flex items-center gap-2 mb-1">
          <Bell size={18} className="text-[#e9a11b]" />
          <h1 className="text-[28px] font-bold alertas-title leading-none">
            Centro de Alertas
          </h1>
        </div>

        <p className="alertas-muted text-sm mb-6">
          Monitorea notificaciones automáticas del sistema
        </p>

        <div className="alertas-card rounded-[24px] border p-8 text-center alertas-muted">
          No tienes permisos para ver las alertas del sistema.
        </div>

        <style>{alertasStyles}</style>
      </div>
    )
  }

  return (
    <div className="alertas-page" style={variables}>
      <div className="flex items-center gap-2 mb-1">
        <Bell size={18} className="text-[#e9a11b]" />
        <h1 className="text-[28px] font-bold alertas-title leading-none">
          Centro de Alertas
        </h1>
      </div>

      <p className="alertas-muted text-sm mb-6">
        Monitorea notificaciones automáticas del sistema
      </p>

      <div className="flex items-center gap-3 mb-6">
        <TabButton
          active={filtro === "todas"}
          onClick={() => setFiltro("todas")}
          label={`Todas (${alertas.length})`}
        />
        <TabButton
          active={filtro === "activas"}
          onClick={() => setFiltro("activas")}
          label={`Activas (${alertasActivas.length})`}
        />
        <TabButton
          active={filtro === "resueltas"}
          onClick={() => setFiltro("resueltas")}
          label={`Resueltas (${alertasResueltas.length})`}
        />
        <TabButton
          active={filtro === "criticas"}
          onClick={() => setFiltro("criticas")}
          label={`Críticas (${alertasCriticas.length})`}
        />
      </div>

      {cargando ? (
        <div className="alertas-card rounded-[24px] border p-8 text-center alertas-muted">
          Cargando alertas...
        </div>
      ) : (
        <div className="space-y-3">
          {listaMostrar.length === 0 ? (
            <div className="bg-transparent p-8 text-center alertas-muted">
              {filtro === "resueltas"
                ? "No hay alertas resueltas aún. Las alertas marcadas como resueltas aparecerán aquí."
                : "No hay alertas para mostrar."}
            </div>
          ) : (
            listaMostrar.map((alerta) => {
              const resuelta = alertasResueltasIds.includes(alerta.id)
              const critica = alerta.severidad === "critica"

              return (
                <div
                  key={alerta.id}
                  className={`alertas-card rounded-[18px] border px-5 py-4 flex items-center justify-between gap-4 ${
                    resuelta ? "opacity-70" : ""
                  }`}
                >
                  <div className="flex items-start gap-4 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                        critica ? "alertas-icon-critical" : "alertas-icon-active"
                      }`}
                    >
                      {resuelta ? (
                        <Check size={19} />
                      ) : (
                        <AlertTriangle size={19} />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold alertas-title truncate">
                          {alerta.titulo}
                        </h3>

                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                            critica
                              ? "bg-[#fff1f2] text-[#e11d48]"
                              : "bg-[#fff7ed] text-[#ea580c]"
                          }`}
                        >
                          {critica ? "Crítica" : "Activa"}
                        </span>

                        {resuelta && (
                          <span className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold bg-[#eefbf3] text-[#20a464]">
                            Resuelta
                          </span>
                        )}
                      </div>

                      <p className="text-sm alertas-muted leading-5">
                        {alerta.descripcion}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-xs alertas-muted">
                        <span>{alerta.categoria}</span>
                        <span>•</span>
                        <span>{alerta.fechaTexto}</span>
                      </div>
                    </div>
                  </div>

                  {!resuelta && (
                    <button
                      onClick={() => marcarComoResuelta(alerta.id)}
                      className="h-9 px-4 rounded-xl alertas-resolve-button text-sm font-semibold transition shrink-0"
                      type="button"
                    >
                      Marcar resuelta
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      )}

      {mensaje && (
        <div className="fixed right-6 bottom-6 z-[60] rounded-2xl alertas-toast px-5 py-3 shadow-lg">
          {mensaje}
        </div>
      )}

      <style>{alertasStyles}</style>
    </div>
  )
}

function normalizarAlerta(item: any, index: number): AlertaNormalizada {
  const producto =
    item?.productoNombre ||
    item?.nombreProducto ||
    item?.nombre ||
    item?.producto ||
    "Producto"

  const categoria =
    item?.categoria ||
    item?.categoriaProducto ||
    "Sin categoría"

  const stockActual =
    item?.stockActual ??
    item?.stock ??
    item?.cantidad ??
    0

  const minimo =
    item?.minimo ??
    item?.stockMinimo ??
    item?.umbral ??
    0

  const severidadRaw =
    String(item?.severidad || item?.nivel || item?.tipo || "").toLowerCase()

  const severidad: "critica" | "activa" =
    severidadRaw.includes("critic") || Number(stockActual) <= Number(minimo)
      ? "critica"
      : "activa"

  const fechaBase =
    item?.timestamp ||
    item?.fecha ||
    item?.createdAt ||
    item?.momento ||
    null

  const fechaTexto = formatearTiempoRelativo(fechaBase)

  const titulo =
    item?.titulo ||
    item?.mensaje ||
    `Stock crítico: ${producto}`

  const descripcion =
    item?.descripcion ||
    `Stock actual (${stockActual}) por debajo del umbral mínimo · Categoría: ${categoria}`

  const id =
    item?.id ||
    `${producto}-${categoria}-${stockActual}-${minimo}-${fechaBase || index}`

  return {
    id: String(id),
    titulo,
    descripcion,
    categoria,
    severidad,
    fechaTexto,
  }
}

function formatearTiempoRelativo(fecha: any) {
  if (!fecha) return "Hace poco"

  const d = new Date(fecha)
  if (isNaN(d.getTime())) return "Hace poco"

  const ahora = new Date().getTime()
  const diffMs = ahora - d.getTime()
  const diffHoras = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDias = Math.floor(diffHoras / 24)

  if (diffDias > 0) {
    return `Hace ${diffDias} día${diffDias > 1 ? "s" : ""}`
  }

  if (diffHoras > 0) {
    return `Hace ${diffHoras} hora${diffHoras > 1 ? "s" : ""}`
  }

  return "Hace poco"
}

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`alertas-tab-button px-4 h-10 rounded-2xl text-sm font-semibold transition ${
        active ? "active" : ""
      }`}
      type="button"
    >
      {label}
    </button>
  )
}

const alertasStyles = `
  .alertas-page {
    background: var(--alert-page);
    color: var(--alert-text);
    min-height: 100%;
  }

  .alertas-title {
    color: var(--alert-text);
  }

  .alertas-muted {
    color: var(--alert-muted);
  }

  .alertas-card {
    background: var(--alert-card);
    border-color: var(--alert-border);
    color: var(--alert-text);
  }

  .alertas-tab-button {
    color: var(--alert-muted);
    background: transparent;
  }

  .alertas-tab-button.active {
    background: var(--alert-primary);
    color: white;
  }

  .alertas-tab-button:hover {
    background: var(--alert-selected);
    color: var(--alert-primary);
  }

  .alertas-tab-button.active:hover {
    background: var(--alert-primary-hover);
    color: white;
  }

  .alertas-icon-critical {
    background: #fff1f2;
    color: #e11d48;
  }

  .alertas-icon-active {
    background: #fff7ed;
    color: #ea580c;
  }

  .alertas-resolve-button {
    background: var(--alert-selected);
    color: var(--alert-primary);
  }

  .alertas-resolve-button:hover {
    background: var(--alert-input);
  }

  .alertas-toast {
    background: var(--alert-button-dark);
    color: white;
  }
`

export default Alertas