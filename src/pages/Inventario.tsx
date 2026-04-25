import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import {
  Bell,
  Search,
  Plus,
  X,
  ArrowDownLeft,
  ArrowUpRight,
  Check,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAppTheme } from "../theme/AppThemeContext"

function Movimientos() {
  const [movimientos, setMovimientos] = useState<any[]>([])
  const [productos, setProductos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [cargandoMas, setCargandoMas] = useState(false)
  const [modal, setModal] = useState(false)
  const [modalExito, setModalExito] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [errorMovimiento, setErrorMovimiento] = useState("")
  const [filtro, setFiltro] = useState("todos")
  const [page, setPage] = useState(0)
  const [hayMas, setHayMas] = useState(true)

  const token = localStorage.getItem("token") || ""
  const API_MOVIMIENTOS = "http://localhost:8080/api/movimientos"
  const API_PRODUCTOS = "http://localhost:8080/api/productos"
  const navigate = useNavigate()
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

  const esSuperAdmin = roles.includes("SUPER_ADMIN") || roles.includes("ROLE_SUPER_ADMIN")
  const esAdmin = roles.includes("ADMIN") || roles.includes("ROLE_ADMIN")
  const esSupervisor = roles.includes("SUPERVISOR") || roles.includes("ROLE_SUPERVISOR")
  const esOperador = roles.includes("OPERADOR") || roles.includes("ROLE_OPERADOR")

  const puedeRegistrarMovimiento =
    roles.length === 0 || esSuperAdmin || esAdmin || esSupervisor || esOperador

  const puedeVerAlertas = esSuperAdmin || esAdmin || esSupervisor

  const [form, setForm] = useState({
    productoId: "",
    tipo: esOperador ? "SALIDA" : "ENTRADA",
    cantidad: "",
    motivo: "",
  })

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
  })

  const cargarProductos = async () => {
    try {
      const res = await axios.get(API_PRODUCTOS, {
        headers: getHeaders(),
      })
      setProductos(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.log(error)
    }
  }

  const cargarMovimientos = async (
    pageValue: number,
    reset: boolean,
    filtroActual: string
  ) => {
    try {
      if (pageValue === 0) {
        setCargando(true)
      } else {
        setCargandoMas(true)
      }

      const params: any = {
        page: pageValue,
        size: 8,
        sort: "fecha,desc",
      }

      if (filtroActual === "entradas") params.tipo = "ENTRADA"
      if (filtroActual === "salidas") params.tipo = "SALIDA"

      const res = await axios.get(API_MOVIMIENTOS, {
        headers: getHeaders(),
        params,
      })

      const content = Array.isArray(res.data?.content) ? res.data.content : []
      const last = Boolean(res.data?.last)

      if (reset) {
        setMovimientos(content)
      } else {
        setMovimientos((prev) => [...prev, ...content])
      }

      setHayMas(!last)
    } catch (error) {
      console.log(error)
      if (reset) setMovimientos([])
      setHayMas(false)
    } finally {
      setCargando(false)
      setCargandoMas(false)
    }
  }

  useEffect(() => {
    cargarProductos()
  }, [])

  useEffect(() => {
    setPage(0)
    cargarMovimientos(0, true, filtro)
  }, [filtro])

  useEffect(() => {
    if (!mensaje) return
    const timer = setTimeout(() => setMensaje(""), 2500)
    return () => clearTimeout(timer)
  }, [mensaje])

  const cargarMas = async () => {
    const nextPage = page + 1
    setPage(nextPage)
    await cargarMovimientos(nextPage, false, filtro)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setErrorMovimiento("")

    if (name === "cantidad") {
      const soloNumeros = value.replace(/[^\d]/g, "")
      setForm((prev) => ({
        ...prev,
        [name]: soloNumeros,
      }))
      return
    }

    if (name === "tipo" && esOperador) {
      setForm((prev) => ({
        ...prev,
        tipo: "SALIDA",
      }))
      return
    }

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const limpiarFormulario = () => {
    setForm({
      productoId: "",
      tipo: esOperador ? "SALIDA" : "ENTRADA",
      cantidad: "",
      motivo: "",
    })
    setErrorMovimiento("")
  }

  const cerrarModal = () => {
    setModal(false)
    limpiarFormulario()
  }

  const abrirModal = () => {
    limpiarFormulario()
    setModal(true)
  }

  const obtenerProductoSeleccionado = () => {
    return productos.find((p) => String(p.id) === String(form.productoId))
  }

  const obtenerMensajeBackend = (error: any) => {
    const data = error?.response?.data

    if (typeof data === "string") return data

    if (data && typeof data === "object") {
      return String(
        data.error ||
          data.message ||
          data.mensaje ||
          data.detail ||
          "La operación no pudo completarse. Revise la cantidad ingresada y los límites de stock del producto."
      )
    }

    return "La operación no pudo completarse. Revise la cantidad ingresada y los límites de stock del producto."
  }

  const validarMovimientoEnFrontend = () => {
    const productoSeleccionado = obtenerProductoSeleccionado()
    const tipoFinal = esOperador ? "SALIDA" : form.tipo
    const cantidad = form.cantidad === "" ? 0 : Number(form.cantidad)

    if (!productoSeleccionado) {
      setErrorMovimiento("Seleccione un producto antes de registrar el movimiento.")
      return false
    }

    if (!cantidad || cantidad <= 0) {
      setErrorMovimiento("Ingrese una cantidad válida mayor que cero.")
      return false
    }

    const stockActual = Number(productoSeleccionado.stock ?? 0)
    const stockMaximo = Number(productoSeleccionado.stockMaximo ?? 0)

    if (tipoFinal === "SALIDA" && cantidad > stockActual) {
      setErrorMovimiento(
        `No se puede registrar la salida. Está intentando retirar ${cantidad} unidad(es), pero el stock disponible es de ${stockActual} unidad(es).`
      )
      return false
    }

    if (tipoFinal === "ENTRADA" && stockMaximo > 0 && stockActual + cantidad > stockMaximo) {
      const disponible = Math.max(stockMaximo - stockActual, 0)
      setErrorMovimiento(
        `No se puede registrar la entrada. El stock actual es ${stockActual}, el stock máximo permitido es ${stockMaximo} y solo puede ingresar ${disponible} unidad(es).`
      )
      return false
    }

    return true
  }

  const registrarMovimiento = async () => {
    setErrorMovimiento("")

    if (!validarMovimientoEnFrontend()) return

    try {
      const productoSeleccionado = obtenerProductoSeleccionado()
      const tipoFinal = esOperador ? "SALIDA" : form.tipo

      const payloadMovimiento = {
        productoId: form.productoId,
        sku: productoSeleccionado?.sku || "",
        productoNombre: productoSeleccionado?.nombre || "",
        tipo: tipoFinal,
        cantidad: form.cantidad === "" ? 0 : Number(form.cantidad),
        motivo: form.motivo,
      }

      await axios.post(API_MOVIMIENTOS, payloadMovimiento, {
        headers: getHeaders(),
      })

      cerrarModal()
      setPage(0)
      await cargarMovimientos(0, true, filtro)
      await cargarProductos()
      setModalExito(true)
    } catch (error) {
      console.log(error)
      setErrorMovimiento(obtenerMensajeBackend(error))
    }
  }

  const formatearFecha = (fecha: any) => {
    if (!fecha) return "-"
    const f = new Date(fecha)
    if (isNaN(f.getTime())) return String(fecha)

    return f.toLocaleString("es-CO", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  const normalizarTipo = (tipo: any) => {
    const t = String(tipo || "").toUpperCase()
    if (t.includes("ENTRADA")) return "ENTRADA"
    if (t.includes("SALIDA")) return "SALIDA"
    return "MOVIMIENTO"
  }

  return (
    <div
      className="mov-page"
      style={
        {
          "--mov-page": theme.page,
          "--mov-card": theme.card,
          "--mov-panel": theme.panel,
          "--mov-input": theme.input,
          "--mov-text": theme.text,
          "--mov-muted": theme.muted,
          "--mov-border": theme.border,
          "--mov-selected": theme.selected,
          "--mov-primary": theme.primary,
          "--mov-primary-hover": theme.primaryHover,
          "--mov-button-dark": theme.buttonDark,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ArrowUpRight size={18} className="mov-primary-icon" />
            <h1 className="text-[32px] font-bold mov-title leading-none">
              Registro de Movimientos
            </h1>
          </div>
          <p className="mov-muted text-sm">
            Historial de entradas y salidas de productos
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 mov-muted-icon"
            />
            <input
              type="text"
              placeholder="Buscar..."
              className="mov-input w-[220px] h-11 rounded-2xl border pl-10 pr-4 text-sm outline-none"
            />
          </div>

          {puedeVerAlertas && (
            <button
              onClick={() => navigate("/alertas")}
              className="w-11 h-11 rounded-2xl mov-alert-button flex items-center justify-center relative"
              type="button"
            >
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500"></span>
            </button>
          )}

          {puedeRegistrarMovimiento && (
            <button
              onClick={abrirModal}
              className="h-11 rounded-2xl mov-primary-button text-white font-semibold px-5 flex items-center justify-center gap-2 transition"
              type="button"
            >
              <Plus size={16} />
              Nuevo Movimiento
            </button>
          )}
        </div>
      </div>

      <section className="mov-panel rounded-[28px] border p-6">
        <div className="flex items-center gap-3 mb-6">
          <TabButton active={filtro === "todos"} onClick={() => setFiltro("todos")} label="Todos" />
          <TabButton active={filtro === "entradas"} onClick={() => setFiltro("entradas")} label="Entradas" />
          <TabButton active={filtro === "salidas"} onClick={() => setFiltro("salidas")} label="Salidas" />
        </div>

        <div className="space-y-3">
          {cargando ? (
            <div className="px-6 py-12 text-center mov-muted">
              Cargando movimientos...
            </div>
          ) : movimientos.length === 0 ? (
            <div className="px-6 py-12 text-center mov-muted">
              No hay movimientos para mostrar
            </div>
          ) : (
            movimientos.map((movimiento, index) => {
              const tipo = normalizarTipo(movimiento.tipo)
              const esEntrada = tipo === "ENTRADA"

              return (
                <div
                  key={movimiento.id || index}
                  className="mov-card rounded-[18px] border px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 rounded-xl mov-icon-box flex items-center justify-center">
                      {esEntrada ? (
                        <ArrowDownLeft size={18} className="text-[#20a464]" />
                      ) : (
                        <ArrowUpRight size={18} className="text-[#e58a57]" />
                      )}
                    </div>

                    <div className="min-w-0">
                      <div className="font-semibold mov-title truncate">
                        {movimiento.productoNombre || "Producto"}
                      </div>
                      <div className="mov-muted text-sm truncate">
                        {(movimiento.sku || "SINSKU") +
                          " · Usuario: " +
                          (movimiento.usuario || "sistema") +
                          (movimiento.motivo ? " · Motivo: " + movimiento.motivo : "")}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-5 shrink-0">
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold ${
                        esEntrada
                          ? "bg-[#eefbf3] text-[#20a464]"
                          : "bg-[#fff1ea] text-[#e58a57]"
                      }`}
                    >
                      {tipo}
                    </span>

                    <span
                      className={`font-semibold text-sm ${
                        esEntrada ? "text-[#20a464]" : "text-[#e35d5d]"
                      }`}
                    >
                      {esEntrada ? "+" : "-"}
                      {movimiento.cantidad ?? 0}
                    </span>

                    <span className="mov-muted text-sm min-w-[130px] text-right">
                      {formatearFecha(movimiento.fecha)}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {!cargando && movimientos.length > 0 && hayMas && (
          <div className="flex justify-center mt-6">
            <button
              onClick={cargarMas}
              disabled={cargandoMas}
              className="h-9 px-5 rounded-full mov-load-button text-sm font-semibold transition disabled:opacity-60"
              type="button"
            >
              {cargandoMas ? "Cargando..." : "Cargar más registros"}
            </button>
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[660px] rounded-[26px] mov-modal shadow-[0_20px_60px_rgba(39,33,79,0.18)] border overflow-hidden">
            <div className="relative px-6 pt-5 pb-2">
              <button
                onClick={cerrarModal}
                className="absolute right-5 top-5 mov-muted hover:opacity-80 transition"
                type="button"
              >
                <X size={18} />
              </button>

              <div className="text-center">
                <h2 className="text-[22px] font-bold mov-title leading-none">
                  Nuevo Movimiento
                </h2>
                <p className="mov-muted text-sm mt-2">
                  {esOperador
                    ? "Registra una salida de inventario"
                    : "Registra una entrada o salida de inventario"}
                </p>
              </div>
            </div>

            <div className="px-6 pb-5">
              <div className="space-y-3">
                <Field label="Producto">
                  <select
                    name="productoId"
                    value={form.productoId}
                    onChange={handleChange}
                    className="modal-input"
                  >
                    <option value="">Selecciona un producto</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} - {producto.sku}
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Tipo de Movimiento">
                    <select
                      name="tipo"
                      value={esOperador ? "SALIDA" : form.tipo}
                      onChange={handleChange}
                      className="modal-input"
                      disabled={esOperador}
                    >
                      {esOperador ? (
                        <option value="SALIDA">Salida</option>
                      ) : (
                        <>
                          <option value="ENTRADA">Entrada</option>
                          <option value="SALIDA">Salida</option>
                        </>
                      )}
                    </select>
                  </Field>

                  <Field label="Cantidad">
                    <input
                      name="cantidad"
                      type="text"
                      inputMode="numeric"
                      value={form.cantidad}
                      onChange={handleChange}
                      className="modal-input"
                      placeholder="0"
                    />
                  </Field>
                </div>

                <Field label="Motivo">
                  <input
                    name="motivo"
                    value={form.motivo}
                    onChange={handleChange}
                    className="modal-input"
                    placeholder="Ej: reposición, venta, ajuste"
                  />
                </Field>

                {errorMovimiento && (
                  <div className="rounded-2xl border border-[#fecaca] bg-[#fff1f2] px-4 py-3 text-sm text-[#be123c] leading-5">
                    {errorMovimiento}
                  </div>
                )}
              </div>

              <div className="border-t mov-border mt-5 pt-4 flex justify-center gap-3">
                <button
                  onClick={cerrarModal}
                  className="h-10 px-6 rounded-xl mov-cancel-button border font-medium transition"
                  type="button"
                >
                  Cancelar
                </button>

                <button
                  onClick={registrarMovimiento}
                  className="h-10 px-6 rounded-xl mov-primary-button text-white font-semibold transition"
                  type="button"
                >
                  Guardar Movimiento
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalExito && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[360px] mov-modal rounded-[14px] shadow-[0_20px_60px_rgba(39,33,79,0.18)] px-8 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center">
                <Check size={46} className="text-green-600" strokeWidth={2.5} />
              </div>
            </div>

            <h3 className="text-[28px] font-bold mov-title leading-none mb-4">
              ¡Éxito!
            </h3>

            <p className="mov-muted text-[17px] mb-6">
              Movimiento registrado exitosamente
            </p>

            <button
              onClick={() => setModalExito(false)}
              className="h-10 px-8 rounded-md bg-green-700 text-white font-semibold hover:bg-green-800 transition"
              type="button"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {mensaje && (
        <div className="fixed right-6 bottom-6 z-[60] rounded-2xl mov-toast px-5 py-3 shadow-lg">
          {mensaje}
        </div>
      )}

      <style>{`
        .mov-page {
          background: var(--mov-page);
          color: var(--mov-text);
        }

        .mov-title {
          color: var(--mov-text);
        }

        .mov-muted,
        .mov-muted-icon {
          color: var(--mov-muted);
        }

        .mov-primary-icon {
          color: var(--mov-primary);
        }

        .mov-border {
          border-color: var(--mov-border);
        }

        .mov-input,
        .modal-input {
          background: var(--mov-input);
          border-color: var(--mov-border);
          color: var(--mov-text);
        }

        .mov-input::placeholder,
        .modal-input::placeholder {
          color: var(--mov-muted);
        }

        .mov-input:focus,
        .modal-input:focus {
          border-color: var(--mov-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--mov-primary) 18%, transparent);
        }

        .mov-alert-button {
          background: #fff8e6;
          border: 1px solid #f2df9c;
          color: #d6a11a;
        }

        .mov-primary-button {
          background: var(--mov-primary);
        }

        .mov-primary-button:hover {
          background: var(--mov-primary-hover);
        }

        .mov-panel {
          background: var(--mov-panel);
          border-color: var(--mov-border);
        }

        .mov-card,
        .mov-modal {
          background: var(--mov-card);
          border-color: var(--mov-border);
          color: var(--mov-text);
        }

        .mov-icon-box {
          background: var(--mov-selected);
        }

        .mov-load-button {
          background: var(--mov-selected);
          color: var(--mov-primary);
        }

        .mov-load-button:hover {
          background: var(--mov-input);
        }

        .mov-cancel-button {
          background: transparent;
          border-color: var(--mov-border);
          color: var(--mov-text);
        }

        .mov-cancel-button:hover {
          background: var(--mov-input);
        }

        .mov-toast {
          background: var(--mov-button-dark);
          color: white;
        }

        .modal-input {
          width: 100%;
          height: 44px;
          border: 1px solid var(--mov-border);
          border-radius: 12px;
          padding: 0 14px;
          outline: none;
        }

        .modal-input:disabled {
          background: var(--mov-selected);
          color: var(--mov-muted);
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

type TabButtonProps = {
  active: boolean
  onClick: () => void
  label: string
}

function TabButton({ active, onClick, label }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`mov-tab-button px-4 h-10 rounded-2xl text-sm font-semibold transition ${
        active ? "active" : ""
      }`}
      type="button"
    >
      {label}

      <style>{`
        .mov-tab-button {
          color: var(--mov-muted);
          background: transparent;
        }

        .mov-tab-button.active {
          background: var(--mov-primary);
          color: white;
        }

        .mov-tab-button:hover {
          background: var(--mov-selected);
          color: var(--mov-primary);
        }

        .mov-tab-button.active:hover {
          background: var(--mov-primary-hover);
          color: white;
        }
      `}</style>
    </button>
  )
}

type FieldProps = {
  label: string
  children: React.ReactNode
}

function Field({ label, children }: FieldProps) {
  return (
    <div>
      <label className="block text-sm mov-title mb-2">{label}</label>
      {children}
    </div>
  )
}

export default Movimientos