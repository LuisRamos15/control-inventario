import { useEffect, useMemo, useState } from "react"
import {
  Bell,
  Box,
  Zap,
  ChartColumnIncreasing,
  Siren,
  Package,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import {
  getAlertasDashboard,
  getMovimientosPorDiaDashboard,
  getResumenDashboard,
  getTopProductosDashboard,
} from "../api/dashboard"
import { getProductos } from "../api/productos"
import { connectSocket, disconnectSocket } from "../services/socket"
import { useAppTheme } from "../theme/AppThemeContext"

type MovimientoDia = {
  label: string
  entradas: number
  salidas: number
}

type CategoriaItem = {
  nombre: string
  total: number
}

function Dashboard() {
  const [resumen, setResumen] = useState<any>(null)
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [topProductos, setTopProductos] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [alertas, setAlertas] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  const navigate = useNavigate()
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
      return rawRoles.map((r) => String(r).replace(/^ROLE_/, "").toUpperCase())
    }

    if (typeof rawRoles === "string") {
      return rawRoles
        .split(/[,\s]+/)
        .filter(Boolean)
        .map((r) => r.replace(/^ROLE_/, "").toUpperCase())
    }

    return []
  }, [payload])

  const esSuperAdmin = roles.includes("SUPER_ADMIN")
  const esAdmin = roles.includes("ADMIN")
  const esSupervisor = roles.includes("SUPERVISOR")
  const puedeVerAlertas = esSuperAdmin || esAdmin || esSupervisor

  const cargarDashboard = async () => {
    try {
      setError("")

      const [r, m, top, p, a] = await Promise.allSettled([
        getResumenDashboard(),
        getMovimientosPorDiaDashboard(),
        getTopProductosDashboard(),
        getProductos(),
        getAlertasDashboard(),
      ])

      setResumen(r.status === "fulfilled" ? r.value || null : null)
      setMovimientos(m.status === "fulfilled" && Array.isArray(m.value) ? m.value : [])
      setTopProductos(top.status === "fulfilled" && Array.isArray(top.value) ? top.value : [])
      setProductos(p.status === "fulfilled" && Array.isArray(p.value) ? p.value : [])
      setAlertas(a.status === "fulfilled" && Array.isArray(a.value) ? a.value : [])
    } catch (e) {
      console.error(e)
      setError("No se pudo cargar el dashboard")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarDashboard()

    connectSocket(() => {
      cargarDashboard()
    })

    return () => {
      disconnectSocket()
    }
  }, [])

  const getNumber = (obj: any, keys: string[]) => {
    if (!obj) return 0

    for (const key of keys) {
      const value = obj?.[key]

      if (typeof value === "number") return value

      if (typeof value === "string" && value.trim() !== "") {
        const parsed = Number(value)
        if (!isNaN(parsed)) return parsed
      }
    }

    return 0
  }

  const formatearFecha = (valor: any) => {
    if (!valor) return ""

    const fecha = new Date(valor)
    if (isNaN(fecha.getTime())) return String(valor)

    return fecha.toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
    })
  }

  const movimientosNormalizados: MovimientoDia[] = useMemo(() => {
    return movimientos.slice(-7).map((item: any) => ({
      label:
        formatearFecha(
          item.fecha ?? item.dia ?? item.date ?? item.label ?? item.nombre
        ) || "Día",
      entradas: getNumber(item, ["entradas", "totalEntradas", "entrada"]),
      salidas: getNumber(item, ["salidas", "totalSalidas", "salida"]),
    }))
  }, [movimientos])

  const categoriasTop: CategoriaItem[] = useMemo(() => {
    const mapa = new Map<string, number>()

    productos.forEach((producto: any) => {
      const categoria = producto?.categoria?.trim() || "Sin categoría"
      mapa.set(categoria, (mapa.get(categoria) || 0) + 1)
    })

    const desdeProductos = Array.from(mapa.entries())
      .map(([nombre, total]) => ({ nombre, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)

    if (desdeProductos.length > 0) return desdeProductos

    return topProductos
      .map((item: any) => ({
        nombre:
          item?.categoria ??
          item?.nombre ??
          item?.productoNombre ??
          item?.sku ??
          "Sin nombre",
        total: getNumber(item, ["total", "cantidad", "veces", "conteo"]),
      }))
      .filter((item) => item.total > 0)
      .slice(0, 4)
  }, [productos, topProductos])

  const productosCriticos = useMemo(() => {
    return productos
      .filter((p: any) => Number(p.stock ?? 0) <= Number(p.minimo ?? 0))
      .sort((a: any, b: any) => Number(a.stock ?? 0) - Number(b.stock ?? 0))
      .slice(0, 5)
  }, [productos])

  const totalProductos =
    productos.length > 0
      ? productos.length
      : getNumber(resumen, ["totalProductos", "productos", "cantidadProductos"])

  const stockCritico =
    productosCriticos.length > 0
      ? productosCriticos.length
      : getNumber(resumen, ["stockCritico", "productosStockCritico", "criticos"])

  const movimientosHoy = useMemo(() => {
    const desdeResumen = getNumber(resumen, [
      "movimientosHoy",
      "totalMovimientosHoy",
      "movimientos_hoy",
    ])

    if (desdeResumen > 0) return desdeResumen

    if (movimientosNormalizados.length === 0) return 0

    const ultimo = movimientosNormalizados[movimientosNormalizados.length - 1]
    return Number(ultimo.entradas || 0) + Number(ultimo.salidas || 0)
  }, [resumen, movimientosNormalizados])

  const alertasActivas =
    getNumber(resumen, ["alertasActivas", "totalAlertas", "alertas"]) ||
    alertas.length

  if (cargando) {
    return (
      <div className="dashboard-page min-h-screen flex items-center justify-center">
        Cargando dashboard...
      </div>
    )
  }

  if (error) {
    return (
      <div className="dashboard-page min-h-screen flex items-center justify-center text-red-500">
        {error}
      </div>
    )
  }

  return (
    <div
      className="dashboard-page p-6 min-h-screen"
      style={
        {
          "--dash-page": theme.page,
          "--dash-card": theme.card,
          "--dash-panel": theme.panel,
          "--dash-input": theme.input,
          "--dash-text": theme.text,
          "--dash-muted": theme.muted,
          "--dash-border": theme.border,
          "--dash-selected": theme.selected,
          "--dash-primary": theme.primary,
          "--dash-primary-hover": theme.primaryHover,
        } as React.CSSProperties
      }
    >
      <div className="flex justify-between mb-6">
        <h1 className="text-3xl font-bold dashboard-title">
          Panel de Control
        </h1>

        {puedeVerAlertas && (
          <button
            onClick={() => navigate("/alertas")}
            className="w-10 h-10 rounded-2xl dashboard-alert-button flex items-center justify-center"
            type="button"
          >
            <Bell size={16} />
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card icon={<Box />} title="Total de Productos" value={totalProductos} />
        <Card icon={<Zap />} title="Stock Crítico" value={stockCritico} />
        <Card icon={<ChartColumnIncreasing />} title="Movimientos Hoy" value={movimientosHoy} />
        <Card icon={<Siren />} title="Alertas Activas" value={alertasActivas} />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="dashboard-card rounded-2xl p-6 border">
          <h2 className="font-bold mb-4 dashboard-title">Movimientos por Tipo</h2>
          <div className="h-56">
            <MovimientosChart data={movimientosNormalizados} />
          </div>
        </div>

        <div className="dashboard-card rounded-2xl p-6 border">
          <h2 className="font-bold mb-4 dashboard-title">Top Categorías</h2>
          <div className="h-56">
            <CategoriasChart data={categoriasTop} />
          </div>
        </div>
      </div>

      <div className="dashboard-card rounded-2xl p-6 border">
        <div className="flex justify-between mb-4">
          <h2 className="font-bold dashboard-title">Productos con Stock Crítico</h2>

          <button
            onClick={() => navigate("/inventario")}
            className="dashboard-link"
            type="button"
          >
            Ver inventario →
          </button>
        </div>

        {productosCriticos.length === 0 ? (
          <p className="dashboard-muted">No hay productos críticos</p>
        ) : (
          <div className="space-y-3">
            {productosCriticos.map((producto: any, index: number) => (
              <div
                key={producto.id || index}
                className="dashboard-list-item flex items-center justify-between rounded-xl border px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl dashboard-icon-box flex items-center justify-center">
                    <Package size={16} />
                  </div>

                  <div>
                    <p className="font-medium dashboard-title">
                      {producto.nombre}
                    </p>
                    <p className="text-sm dashboard-muted">
                      {producto.sku || "Sin SKU"}
                    </p>
                  </div>
                </div>

                <div className="text-sm dashboard-title">
                  Stock: <span className="font-semibold">{producto.stock}</span> /{" "}
                  <span className="dashboard-muted">{producto.stockMaximo}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        .dashboard-page {
          background: var(--dash-page);
          color: var(--dash-text);
        }

        .dashboard-title {
          color: var(--dash-text);
        }

        .dashboard-muted {
          color: var(--dash-muted);
        }

        .dashboard-card {
          background: var(--dash-card);
          border-color: var(--dash-border);
          color: var(--dash-text);
        }

        .dashboard-list-item {
          border-color: var(--dash-border);
          background: var(--dash-card);
        }

        .dashboard-icon-box {
          background: var(--dash-selected);
          color: var(--dash-primary);
        }

        .dashboard-link {
          color: var(--dash-primary);
          font-weight: 500;
        }

        .dashboard-link:hover {
          color: var(--dash-primary-hover);
        }

        .dashboard-alert-button {
          background: #fff8e6;
          color: #20224a;
        }
      `}</style>
    </div>
  )
}

function Card({ icon, title, value }: any) {
  return (
    <div className="dashboard-card p-4 rounded-2xl border">
      <div className="mb-2 dashboard-title">{icon}</div>
      <h3 className="text-xl font-bold dashboard-title">{value}</h3>
      <p className="dashboard-muted">{title}</p>
    </div>
  )
}

function MovimientosChart({ data }: { data: MovimientoDia[] }) {
  const width = 520
  const height = 210
  const padding = 26

  const datos =
    data.length > 0
      ? data
      : [
          { label: "Día 1", entradas: 0, salidas: 0 },
          { label: "Día 2", entradas: 0, salidas: 0 },
          { label: "Día 3", entradas: 0, salidas: 0 },
          { label: "Día 4", entradas: 0, salidas: 0 },
          { label: "Día 5", entradas: 0, salidas: 0 },
          { label: "Día 6", entradas: 0, salidas: 0 },
          { label: "Día 7", entradas: 0, salidas: 0 },
        ]

  const maxValue = Math.max(
    1,
    ...datos.flatMap((item) => [item.entradas, item.salidas])
  )

  const getX = (index: number) => {
    if (datos.length === 1) return width / 2
    return padding + (index * (width - padding * 2)) / (datos.length - 1)
  }

  const getY = (value: number) => {
    return height - padding - (value / maxValue) * (height - padding * 2)
  }

  const entradasPoints = datos
    .map((item, index) => `${getX(index)},${getY(item.entradas)}`)
    .join(" ")

  const salidasPoints = datos
    .map((item, index) => `${getX(index)},${getY(item.salidas)}`)
    .join(" ")

  return (
    <div className="w-full h-full flex flex-col justify-between">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-[170px]">
        {[0, 1, 2, 3].map((line) => {
          const y = padding + ((height - padding * 2) / 3) * line
          return (
            <line
              key={line}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="var(--dash-border)"
              strokeWidth="1"
            />
          )
        })}

        <polyline
          fill="none"
          stroke="var(--dash-primary)"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={entradasPoints}
        />

        <polyline
          fill="none"
          stroke="#f4a261"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={salidasPoints}
        />

        {datos.map((item, index) => (
          <g key={index}>
            <circle cx={getX(index)} cy={getY(item.entradas)} r="4" fill="var(--dash-primary)" />
            <circle cx={getX(index)} cy={getY(item.salidas)} r="4" fill="#f4a261" />
          </g>
        ))}
      </svg>

      <div className="flex items-center gap-6 mt-2 text-sm dashboard-muted">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full dashboard-dot-primary"></span>
          Entradas
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#f4a261]"></span>
          Salidas
        </div>
      </div>

      <div
        className="grid text-xs dashboard-muted mt-2"
        style={{ gridTemplateColumns: `repeat(${datos.length}, minmax(0, 1fr))` }}
      >
        {datos.map((item, index) => (
          <div key={index} className="text-center">
            {item.label}
          </div>
        ))}
      </div>

      <style>{`
        .dashboard-dot-primary {
          background: var(--dash-primary);
        }
      `}</style>
    </div>
  )
}

function CategoriasChart({ data }: { data: CategoriaItem[] }) {
  const colores = ["var(--dash-primary)", "#ff9b5e", "#40d3c2", "#f87171"]

  const items =
    data.length > 0
      ? data
      : [{ nombre: "Sin datos", total: 1 }]

  const total = items.reduce((acc, item) => acc + item.total, 0) || 1
  const radius = 48
  const circumference = 2 * Math.PI * radius
  let acumulado = 0

  return (
    <div className="flex items-center justify-between gap-5 h-full">
      <div className="relative w-[150px] h-[150px] flex items-center justify-center">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="var(--dash-border)"
            strokeWidth="18"
          />

          {items.map((item, index) => {
            const segmento = (item.total / total) * circumference
            const offset = circumference * 0.25 - acumulado
            acumulado += segmento

            return (
              <circle
                key={index}
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke={colores[index % colores.length]}
                strokeWidth="18"
                strokeDasharray={`${segmento} ${circumference - segmento}`}
                strokeDashoffset={offset}
                strokeLinecap="round"
                transform="rotate(-90 75 75)"
              />
            )
          })}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[28px] font-bold dashboard-title">
            {total}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-4">
        {items.map((item, index) => (
          <div key={index} className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: colores[index % colores.length] }}
              ></span>
              <span className="dashboard-muted font-medium">
                {item.nombre}
              </span>
            </div>

            <span className="dashboard-title font-semibold">
              {item.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Dashboard