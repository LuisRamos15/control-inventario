import { useEffect, useMemo, useState } from "react"
import { Bell, AlertTriangle } from "lucide-react"
import { getAlertasDashboard } from "../api/dashboard"

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

  if (!puedeVerAlertas) {
    return (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Bell size={18} className="text-[#e9a11b]" />
          <h1 className="text-[28px] font-bold text-[#20224a] leading-none">
            Centro de Alertas
          </h1>
        </div>

        <p className="text-[#8f95b2] text-sm mb-6">
          Monitorea notificaciones automáticas del sistema
        </p>

        <div className="bg-white rounded-[24px] border border-[#ece7fb] p-8 text-center text-[#9ea3bf]">
          No tienes permisos para ver las alertas del sistema.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-1">
        <Bell size={18} className="text-[#e9a11b]" />
        <h1 className="text-[28px] font-bold text-[#20224a] leading-none">
          Centro de Alertas
        </h1>
      </div>

      <p className="text-[#8f95b2] text-sm mb-6">
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
        <div className="bg-white rounded-[24px] border border-[#ece7fb] p-8 text-center text-[#9ea3bf]">
          Cargando alertas...
        </div>
      ) : (
        <div className="space-y-3">
          {listaMostrar.length === 0 ? (
            <div className="bg-transparent p-8 text-center text-[#9ea3bf]">
              {filtro === "resueltas"
                ? "No hay alertas resueltas aún. Las alertas marcadas como resueltas aparecerán aquí."
                : "No hay alertas para mostrar."}
            </div>
          ) : (
            listaMostrar.map((alerta) => {
              const resuelta = alertasResueltasIds.includes(alerta.id)

              return (
                <div
                  key={alerta.id}
                  className={`bg-white rounded-[18px] border border-[#ece7fb] px-5 py-4 flex items-start justify-between ${
                    alerta.severidad === "critica" && !resuelta
                      ? "border-l-4 border-l-[#ef4e4e]"
                      : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                        alerta.severidad === "critica"
                          ? "bg-[#fff3eb]"
                          : "bg-[#f5f2ff]"
                      }`}
                    >
                      {alerta.severidad === "critica" ? (
                        <AlertTriangle size={18} className="text-[#e58a57]" />
                      ) : (
                        <Bell size={18} className="text-[#7f78ff]" />
                      )}
                    </div>

                    <div>
                      <div className="font-semibold text-[#20224a]">
                        {alerta.titulo}
                      </div>
                      <div className="text-[#9ea3bf] text-sm mt-1">
                        {alerta.descripcion}
                      </div>

                      {!resuelta && (
                        <button
                          onClick={() => marcarComoResuelta(alerta.id)}
                          className="mt-3 inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[#eefbf3] text-[#20a464] hover:bg-[#e4f8eb] transition"
                        >
                          ✓ Marcar como resuelta
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0 pl-4">
                    <div className="text-xs text-[#9ea3bf]">
                      {alerta.fechaTexto}
                    </div>
                    <div
                      className={`text-xs font-semibold mt-1 ${
                        alerta.severidad === "critica"
                          ? "text-[#e35d5d]"
                          : "text-[#20a464]"
                      }`}
                    >
                      {resuelta ? "Resuelta" : alerta.severidad === "critica" ? "Crítica" : "Activa"}
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {mensaje && (
        <div className="fixed right-6 bottom-6 z-[60] rounded-2xl bg-[#20224a] text-white px-5 py-3 shadow-lg">
          {mensaje}
        </div>
      )}
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
    item?.categoriaNombre ||
    "Sin categoría"

  const stockActual =
    item?.stockActual ??
    item?.stock ??
    item?.actual ??
    item?.stockDespues ??
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
      className={`px-4 h-10 rounded-2xl text-sm font-semibold transition ${
        active
          ? "bg-[#8f7cf8] text-white"
          : "text-[#8f95b2] bg-transparent"
      }`}
      type="button"
    >
      {label}
    </button>
  )
}

export default Alertas