import { useEffect, useMemo, useState } from "react"
import { BarChart3, Printer } from "lucide-react"
import {
  descargarMovimientosPdf,
  getMovimientosReporte,
  getProductosReporte,
} from "../api/reportes"
import { useAppTheme } from "../theme/AppThemeContext"

type PuntoGrafica = {
  fecha: string
  entradas: number
  salidas: number
}

function Reportes() {
  const [productos, setProductos] = useState<any[]>([])
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
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

  const puedeVerReportes =
    roles.includes("SUPER_ADMIN") ||
    roles.includes("ADMIN") ||
    roles.includes("SUPERVISOR") ||
    roles.includes("ROLE_SUPER_ADMIN") ||
    roles.includes("ROLE_ADMIN") ||
    roles.includes("ROLE_SUPERVISOR")

  useEffect(() => {
    const cargar = async () => {
      if (!puedeVerReportes) {
        setCargando(false)
        return
      }

      try {
        setCargando(true)
        const [productosData, movimientosData] = await Promise.all([
          getProductosReporte(),
          getMovimientosReporte(),
        ])

        setProductos(Array.isArray(productosData) ? productosData : [])
        setMovimientos(Array.isArray(movimientosData) ? movimientosData : [])
      } catch (error) {
        console.log(error)
        setProductos([])
        setMovimientos([])
        setMensaje("No se pudieron cargar los reportes")
      } finally {
        setCargando(false)
      }
    }

    cargar()
  }, [puedeVerReportes])

  useEffect(() => {
    if (!mensaje) return
    const timer = setTimeout(() => setMensaje(""), 2500)
    return () => clearTimeout(timer)
  }, [mensaje])

  const totalProductos = productos.length

  const valorTotal = productos.reduce((acc, p) => {
    const stock = Number(p?.stock ?? 0)
    const precio = Number(p?.precioUnitario ?? 0)
    return acc + stock * precio
  }, 0)

  const productosBajos = productos.filter((p) => {
    const stock = Number(p?.stock ?? 0)
    const minimo = Number(p?.minimo ?? p?.stockMinimo ?? 0)
    return stock <= minimo
  }).length

  const categoriasActivas = new Set(
    productos
      .map((p) => String(p?.categoria || "").trim())
      .filter(Boolean)
  ).size

  const puntosGrafica: PuntoGrafica[] = useMemo(() => {
    const mapa = new Map<string, PuntoGrafica>()

    movimientos.forEach((m) => {
      const fechaBase = m?.fecha ? new Date(m.fecha) : null
      if (!fechaBase || isNaN(fechaBase.getTime())) return

      const fecha = fechaBase.toLocaleDateString("es-CO", {
        month: "short",
        day: "2-digit",
      })

      const tipo = String(m?.tipo || "").toUpperCase()
      const cantidad = Number(m?.cantidad ?? 0)

      if (!mapa.has(fecha)) {
        mapa.set(fecha, {
          fecha,
          entradas: 0,
          salidas: 0,
        })
      }

      const actual = mapa.get(fecha)!

      if (tipo.includes("ENTRADA")) {
        actual.entradas += cantidad
      }

      if (tipo.includes("SALIDA")) {
        actual.salidas += cantidad
      }
    })

    const data = Array.from(mapa.values())
    return data.slice(-7)
  }, [movimientos])

  const maxValorGrafica = useMemo(() => {
    const maximo = puntosGrafica.reduce((acc, item) => {
      return Math.max(acc, item.entradas, item.salidas)
    }, 0)

    return maximo > 0 ? maximo : 10
  }, [puntosGrafica])

  const handleImprimir = async () => {
    try {
      const blob = await descargarMovimientosPdf()
      const url = window.URL.createObjectURL(blob)
      const win = window.open(url, "_blank")

      if (win) {
        win.onload = () => {
          win.print()
        }
      } else {
        setMensaje("No se pudo abrir la vista de impresión")
      }
    } catch (error) {
      console.log(error)
      setMensaje("No se pudo preparar la impresión")
    }
  }

  const variables = {
    "--rep-page": theme.page,
    "--rep-card": theme.card,
    "--rep-panel": theme.panel,
    "--rep-input": theme.input,
    "--rep-text": theme.text,
    "--rep-muted": theme.muted,
    "--rep-border": theme.border,
    "--rep-selected": theme.selected,
    "--rep-primary": theme.primary,
    "--rep-primary-hover": theme.primaryHover,
    "--rep-button-dark": theme.buttonDark,
  } as React.CSSProperties

  if (!puedeVerReportes) {
    return (
      <div className="reportes-page p-6 min-h-screen flex items-center justify-center" style={variables}>
        <div className="reportes-card rounded-2xl border px-8 py-10 text-center">
          <h2 className="text-2xl font-bold reportes-title mb-2">Acceso restringido</h2>
          <p className="reportes-muted">
            No tienes permisos para acceder al módulo de reportes.
          </p>
        </div>

        <style>{reportesStyles}</style>
      </div>
    )
  }

  return (
    <div className="reportes-page p-6 min-h-screen" style={variables}>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 size={18} className="reportes-primary-icon" />
            <h1 className="text-[28px] font-bold reportes-title leading-none">
              Reportes y Estadísticas
            </h1>
          </div>
          <p className="reportes-muted text-sm">
            Resumen general del inventario
          </p>
        </div>

        <button
          onClick={handleImprimir}
          className="h-10 px-4 rounded-xl reportes-primary-button text-white text-sm font-semibold flex items-center gap-2 transition"
          type="button"
        >
          <Printer size={16} />
          Imprimir
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-5">
        <ResumenCard
          titulo="Total Productos"
          valor={String(totalProductos)}
          descripcion="Activos en stock"
          variante="normal"
        />
        <ResumenCard
          titulo="Valor Total"
          valor={formatearMoneda(valorTotal)}
          descripcion="Estimado"
          variante="primary"
        />
        <ResumenCard
          titulo="Productos Bajos"
          valor={String(productosBajos)}
          descripcion="Necesitan reposición"
          variante="danger"
        />
        <ResumenCard
          titulo="Categorías"
          valor={String(categoriasActivas)}
          descripcion="Activas"
          variante="normal"
        />
      </div>

      <section className="reportes-panel rounded-[28px] border p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 size={16} className="reportes-primary-icon" />
          <h2 className="text-[15px] font-bold reportes-title">
            Gráfico de Tendencias — Movimientos
          </h2>
        </div>

        {cargando ? (
          <div className="reportes-card rounded-[22px] border px-6 py-16 text-center reportes-muted">
            Cargando reportes...
          </div>
        ) : puntosGrafica.length === 0 ? (
          <div className="reportes-card rounded-[22px] border px-6 py-16 text-center reportes-muted">
            No hay movimientos suficientes para mostrar la gráfica.
          </div>
        ) : (
          <div className="reportes-card rounded-[22px] border p-5">
            <div className="h-[280px] flex items-end gap-4">
              {puntosGrafica.map((item) => {
                const alturaEntradas = Math.max((item.entradas / maxValorGrafica) * 180, item.entradas > 0 ? 10 : 0)
                const alturaSalidas = Math.max((item.salidas / maxValorGrafica) * 180, item.salidas > 0 ? 10 : 0)

                return (
                  <div
                    key={item.fecha}
                    className="flex-1 h-full flex flex-col justify-end items-center"
                  >
                    <div className="w-full flex items-end justify-center gap-2 h-[210px]">
                      <div className="flex flex-col items-center justify-end">
                        <div
                          className="w-5 rounded-t-md reportes-bar-primary"
                          style={{ height: `${alturaEntradas}px` }}
                          title={`Entradas: ${item.entradas}`}
                        />
                      </div>

                      <div className="flex flex-col items-center justify-end">
                        <div
                          className="w-5 rounded-t-md bg-[#f2a15e]"
                          style={{ height: `${alturaSalidas}px` }}
                          title={`Salidas: ${item.salidas}`}
                        />
                      </div>
                    </div>

                    <div className="text-[11px] reportes-muted mt-4">{item.fecha}</div>
                  </div>
                )
              })}
            </div>

            <div className="flex items-center gap-5 mt-4">
              <div className="flex items-center gap-2 text-xs reportes-muted">
                <span className="w-2 h-2 rounded-full reportes-dot-primary"></span>
                Entradas
              </div>
              <div className="flex items-center gap-2 text-xs reportes-muted">
                <span className="w-2 h-2 rounded-full bg-[#f2a15e]"></span>
                Salidas
              </div>
            </div>
          </div>
        )}
      </section>

      {mensaje && (
        <div className="fixed right-6 bottom-6 z-[60] rounded-2xl reportes-toast px-5 py-3 shadow-lg">
          {mensaje}
        </div>
      )}

      <style>{reportesStyles}</style>
    </div>
  )
}

function ResumenCard({
  titulo,
  valor,
  descripcion,
  variante,
}: {
  titulo: string
  valor: string
  descripcion: string
  variante: "normal" | "primary" | "danger"
}) {
  return (
    <div className="reportes-card rounded-[18px] border px-5 py-4">
      <div className="text-[12px] reportes-muted mb-2">{titulo}</div>
      <div
        className={`text-[34px] font-bold leading-none mb-2 ${
          variante === "primary"
            ? "reportes-value-primary"
            : variante === "danger"
            ? "reportes-value-danger"
            : "reportes-title"
        }`}
      >
        {valor}
      </div>
      <div className="text-[12px] reportes-muted">{descripcion}</div>
    </div>
  )
}

function formatearMoneda(valor: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor || 0)
}

const reportesStyles = `
  .reportes-page {
    background: var(--rep-page);
    color: var(--rep-text);
  }

  .reportes-title {
    color: var(--rep-text);
  }

  .reportes-muted {
    color: var(--rep-muted);
  }

  .reportes-primary-icon,
  .reportes-value-primary {
    color: var(--rep-primary);
  }

  .reportes-value-danger {
    color: #e35d5d;
  }

  .reportes-card {
    background: var(--rep-card);
    border-color: var(--rep-border);
    color: var(--rep-text);
  }

  .reportes-panel {
    background: var(--rep-panel);
    border-color: var(--rep-border);
  }

  .reportes-primary-button {
    background: var(--rep-primary);
  }

  .reportes-primary-button:hover {
    background: var(--rep-primary-hover);
  }

  .reportes-bar-primary,
  .reportes-dot-primary {
    background: var(--rep-primary);
  }

  .reportes-toast {
    background: var(--rep-button-dark);
    color: white;
  }
`

export default Reportes