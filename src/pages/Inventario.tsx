import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import { Package, Pencil, Trash2, Search, Bell, X, Check } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { connectSocket, disconnectSocket } from "../services/socket"

function Inventario() {
  const [productos, setProductos] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [productoEditandoId, setProductoEditandoId] = useState<string | null>(null)
  const [filtro, setFiltro] = useState("todos")
  const [busqueda, setBusqueda] = useState("")
  const [mensaje, setMensaje] = useState("")
  const [modalEliminar, setModalEliminar] = useState(false)
  const [productoAEliminar, setProductoAEliminar] = useState<any | null>(null)
  const [modalExito, setModalExito] = useState(false)

  const [form, setForm] = useState({
    sku: "",
    nombre: "",
    categoria: "",
    minimo: 10,
    stockMaximo: "",
    stock: "",
    precioUnitario: "",
    descripcion: "",
  })

  const token = localStorage.getItem("token") || ""
  const API = "http://localhost:8080/api/productos"
  const navigate = useNavigate()

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

  const puedeGestionarProductos =
    roles.includes("SUPER_ADMIN") ||
    roles.includes("ADMIN") ||
    roles.includes("SUPERVISOR") ||
    roles.includes("ROLE_SUPER_ADMIN") ||
    roles.includes("ROLE_ADMIN") ||
    roles.includes("ROLE_SUPERVISOR")

  const puedeVerAlertas =
    roles.includes("SUPER_ADMIN") ||
    roles.includes("ADMIN") ||
    roles.includes("SUPERVISOR") ||
    roles.includes("ROLE_SUPER_ADMIN") ||
    roles.includes("ROLE_ADMIN") ||
    roles.includes("ROLE_SUPERVISOR")

  const obtenerProductos = async () => {
    try {
      const res = await axios.get(API, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setProductos(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    obtenerProductos()

    connectSocket(() => {
      obtenerProductos()
    })

    return () => {
      disconnectSocket()
    }
  }, [])

  useEffect(() => {
    if (!mensaje) return

    const timer = setTimeout(() => {
      setMensaje("")
    }, 2500)

    return () => clearTimeout(timer)
  }, [mensaje])

  const handleChange = (e: any) => {
    const { name, value } = e.target

    if (name === "stockMaximo" || name === "stock" || name === "precioUnitario") {
      const soloNumeros = value.replace(/[^\d]/g, "")
      setForm({
        ...form,
        [name]: soloNumeros,
      })
      return
    }

    setForm({
      ...form,
      [name]: value,
    })
  }

  const limpiarFormulario = () => {
    setForm({
      sku: "",
      nombre: "",
      categoria: "",
      minimo: 10,
      stockMaximo: "",
      stock: "",
      precioUnitario: "",
      descripcion: "",
    })
    setModoEdicion(false)
    setProductoEditandoId(null)
  }

  const cerrarModal = () => {
    setModal(false)
    limpiarFormulario()
  }

  const abrirCrear = () => {
    setModoEdicion(false)
    setProductoEditandoId(null)
    setForm({
      sku: "",
      nombre: "",
      categoria: "",
      minimo: 10,
      stockMaximo: "",
      stock: "",
      precioUnitario: "",
      descripcion: "",
    })
    setModal(true)
  }

  const abrirEditar = (producto: any) => {
    setModoEdicion(true)
    setProductoEditandoId(producto.id)
    setForm({
      sku: producto.sku || "",
      nombre: producto.nombre || "",
      categoria: producto.categoria || "",
      minimo: 10,
      stockMaximo:
        producto.stockMaximo === null || producto.stockMaximo === undefined
          ? ""
          : String(producto.stockMaximo),
      stock:
        producto.stock === null || producto.stock === undefined
          ? ""
          : String(producto.stock),
      precioUnitario:
        producto.precioUnitario === null || producto.precioUnitario === undefined
          ? ""
          : String(producto.precioUnitario),
      descripcion: producto.descripcion || "",
    })
    setModal(true)
  }

  const guardarProducto = async () => {
    try {
      if (modoEdicion && productoEditandoId) {
        const payloadEditar = {
          nombre: form.nombre,
          categoria: form.categoria,
          descripcion: form.descripcion,
          precioUnitario: form.precioUnitario === "" ? 0 : Number(form.precioUnitario),
          stockMaximo: form.stockMaximo === "" ? 0 : Number(form.stockMaximo),
        }

        await axios.patch(`${API}/${productoEditandoId}`, payloadEditar, {
          headers: { Authorization: `Bearer ${token}` },
        })

        cerrarModal()
        await obtenerProductos()
        setModalExito(true)
      } else {
        const payloadCrear = {
          sku: form.sku,
          nombre: form.nombre,
          categoria: form.categoria,
          minimo: 10,
          stockMaximo: form.stockMaximo === "" ? 0 : Number(form.stockMaximo),
          stock: form.stock === "" ? 0 : Number(form.stock),
          precioUnitario: form.precioUnitario === "" ? 0 : Number(form.precioUnitario),
          descripcion: form.descripcion,
        }

        await axios.post(API, payloadCrear, {
          headers: { Authorization: `Bearer ${token}` },
        })

        cerrarModal()
        await obtenerProductos()
        setMensaje("Producto guardado exitosamente")
      }
    } catch (error) {
      console.log(error)
      setMensaje("No se pudo guardar el producto")
    }
  }

  const abrirEliminar = (producto: any) => {
    setProductoAEliminar(producto)
    setModalEliminar(true)
  }

  const cerrarEliminar = () => {
    setProductoAEliminar(null)
    setModalEliminar(false)
  }

  const eliminarProducto = async () => {
    if (!productoAEliminar?.id) return

    try {
      await axios.delete(`${API}/${productoAEliminar.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      cerrarEliminar()
      await obtenerProductos()
      setMensaje("Producto eliminado exitosamente")
    } catch (error) {
      console.log(error)
      setMensaje("No se pudo eliminar el producto")
    }
  }

  const estadoProducto = (producto: any) => {
    return producto.stock <= producto.minimo ? "critico" : "normal"
  }

  const productosFiltrados = useMemo(() => {
    let lista = [...productos]

    if (filtro === "normales") {
      lista = lista.filter((producto) => estadoProducto(producto) === "normal")
    }

    if (filtro === "criticos") {
      lista = lista.filter((producto) => estadoProducto(producto) === "critico")
    }

    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      lista = lista.filter(
        (producto) =>
          producto.nombre?.toLowerCase().includes(q) ||
          producto.sku?.toLowerCase().includes(q) ||
          producto.categoria?.toLowerCase().includes(q)
      )
    }

    return lista
  }, [productos, filtro, busqueda])

  const totalTodos = productos.length
  const totalNormales = productos.filter((p) => estadoProducto(p) === "normal").length
  const totalCriticos = productos.filter((p) => estadoProducto(p) === "critico").length

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[34px] font-bold text-[#20224a] leading-none">
          Gestión de Inventario
        </h1>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ea3bf]"
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-[220px] h-11 rounded-2xl bg-[#f3efff] border border-[#ece7fb] pl-10 pr-4 text-sm text-[#20224a] outline-none"
            />
          </div>

          {puedeVerAlertas && (
            <button
              onClick={() => navigate("/alertas")}
              className="w-11 h-11 rounded-2xl bg-[#fff8e6] border border-[#f2df9c] flex items-center justify-center relative"
              type="button"
            >
              <Bell className="text-[#d6a11a]" size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500"></span>
            </button>
          )}

          {puedeGestionarProductos && (
            <button
              onClick={abrirCrear}
              className="h-11 rounded-2xl bg-[#8f7cf8] text-white font-semibold px-5 flex items-center justify-center gap-2 hover:bg-[#7e69f6] transition"
              type="button"
            >
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <section className="bg-[#f3efff] rounded-[28px] border border-[#ece7fb] p-6">
        <div className="flex items-center gap-3 mb-6">
          <TabButton
            active={filtro === "todos"}
            onClick={() => setFiltro("todos")}
            label={`Todos (${totalTodos})`}
          />
          <TabButton
            active={filtro === "normales"}
            onClick={() => setFiltro("normales")}
            label={`Normales (${totalNormales})`}
          />
          <TabButton
            active={filtro === "criticos"}
            onClick={() => setFiltro("criticos")}
            label={`Críticos (${totalCriticos})`}
          />
        </div>

        <div className="bg-white rounded-[24px] border border-[#ece7fb] overflow-hidden">
          <div
            className={`grid px-8 py-5 text-[12px] font-semibold tracking-wide text-[#9ea3bf] uppercase ${
              puedeGestionarProductos
                ? "grid-cols-[0.8fr_2fr_1fr_1.15fr_0.8fr_0.9fr_0.9fr]"
                : "grid-cols-[0.8fr_2fr_1fr_1.15fr_0.8fr_0.9fr]"
            }`}
          >
            <div>SKU</div>
            <div>Producto</div>
            <div>Categoría</div>
            <div>Stock Actual</div>
            <div className="text-center">Stock Máx.</div>
            <div>Estado</div>
            {puedeGestionarProductos && <div>Acciones</div>}
          </div>

          {productosFiltrados.length === 0 ? (
            <div className="px-8 py-16 text-center text-[#9ea3bf]">
              No hay productos para mostrar
            </div>
          ) : (
            productosFiltrados.map((producto, index) => {
              const estado = estadoProducto(producto)
              const porcentaje =
                producto.stockMaximo && producto.stockMaximo > 0
                  ? Math.min((producto.stock / producto.stockMaximo) * 100, 100)
                  : 0

              return (
                <div
                  key={producto.id || index}
                  className={`grid items-center px-8 py-4 border-t border-[#f0ebfc] ${
                    puedeGestionarProductos
                      ? "grid-cols-[0.8fr_2fr_1fr_1.15fr_0.8fr_0.9fr_0.9fr]"
                      : "grid-cols-[0.8fr_2fr_1fr_1.15fr_0.8fr_0.9fr]"
                  }`}
                >
                  <div className="text-sm text-[#8f95b2]">{producto.sku}</div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#f5f2ff] flex items-center justify-center">
                      <Package size={16} className="text-[#7f78ff]" />
                    </div>

                    <div>
                      <div className="font-semibold text-[#20224a]">
                        {producto.nombre}
                      </div>
                      <div className="text-[#9ea3bf] text-sm">
                        {producto.sku}
                      </div>
                    </div>
                  </div>

                  <div className="text-[#5f6481] text-sm">
                    {producto.categoria}
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-[135px] h-2 rounded-full bg-[#ece7fb] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          estado === "critico" ? "bg-[#ef4e4e]" : "bg-[#8f7cf8]"
                        }`}
                        style={{ width: `${porcentaje}%` }}
                      ></div>
                    </div>

                    <span className="font-semibold text-[#20224a] w-[22px] text-left text-sm">
                      {producto.stock}
                    </span>
                  </div>

                  <div className="text-[#9ea3bf] font-medium text-sm text-center">
                    {producto.stockMaximo}
                  </div>

                  <div>
                    {estado === "critico" ? (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[#fff0f0] text-[#e35d5d]">
                        △ Crítico
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[#eefbf3] text-[#20a464]">
                        ✓ Normal
                      </span>
                    )}
                  </div>

                  {puedeGestionarProductos && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => abrirEditar(producto)}
                        className="w-10 h-10 rounded-xl bg-[#f5f2ff] flex items-center justify-center text-[#f2a15e] hover:bg-[#eee8ff] transition"
                        type="button"
                      >
                        <Pencil size={16} />
                      </button>

                      <button
                        onClick={() => abrirEliminar(producto)}
                        className="w-10 h-10 rounded-xl bg-[#fff1f1] flex items-center justify-center text-[#d86a6a] hover:bg-[#ffe5e5] transition"
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[660px] rounded-[26px] bg-white shadow-[0_20px_60px_rgba(39,33,79,0.18)] border border-[#ece7fb] overflow-hidden">
            <div className="relative px-6 pt-5 pb-2">
              <button
                onClick={cerrarModal}
                className="absolute right-5 top-5 text-[#8f95b2] hover:text-[#20224a] transition"
                type="button"
              >
                <X size={18} />
              </button>

              <div className="text-center">
                <h2 className="text-[22px] font-bold text-[#20224a] leading-none">
                  {modoEdicion ? "Editar Producto" : "Nuevo Producto"}
                </h2>
                <p className="text-[#8f95b2] text-sm mt-2">
                  Complete la información del producto
                </p>
              </div>
            </div>

            <div className="px-6 pb-5">
              <div className="space-y-3">
                <Field label="SKU">
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    placeholder="SKU-001"
                    className="modal-input"
                    disabled={modoEdicion}
                    readOnly={modoEdicion}
                  />
                </Field>

                <Field label="Nombre del Producto">
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    placeholder="Nombre del producto"
                    className="modal-input"
                  />
                </Field>

                <Field label="Categoría">
                  <input
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    placeholder="Escribe o selecciona"
                    className="modal-input"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Stock Mínimo">
                    <div className="relative">
                      <input
                        name="minimo"
                        type="number"
                        value={10}
                        readOnly
                        disabled
                        className="modal-input modal-input-disabled pr-24"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#8f95b2] bg-[#f5f2ff] px-2 py-1 rounded-full">
                        Fijo en 10
                      </span>
                    </div>
                  </Field>

                  <Field label="Stock Máximo">
                    <input
                      name="stockMaximo"
                      type="text"
                      inputMode="numeric"
                      value={form.stockMaximo}
                      onChange={handleChange}
                      className="modal-input"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Stock">
                    <input
                      name="stock"
                      type="text"
                      inputMode="numeric"
                      value={form.stock}
                      onChange={handleChange}
                      className="modal-input"
                      disabled={modoEdicion}
                      readOnly={modoEdicion}
                    />
                  </Field>

                  <Field label="Precio Unitario">
                    <input
                      name="precioUnitario"
                      type="text"
                      inputMode="numeric"
                      value={form.precioUnitario}
                      onChange={handleChange}
                      className="modal-input"
                    />
                  </Field>
                </div>

                <Field label="Descripción">
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    placeholder="Opcional"
                    rows={3}
                    className="modal-input modal-textarea resize-none"
                  />
                </Field>
              </div>

              <div className="border-t border-[#ece7fb] mt-5 pt-4 flex justify-center gap-3">
                <button
                  onClick={cerrarModal}
                  className="h-10 px-6 rounded-xl border border-[#d9dce8] text-[#20224a] font-medium hover:bg-[#f8f8fc] transition"
                  type="button"
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarProducto}
                  className="h-10 px-6 rounded-xl bg-[#8f7cf8] text-white font-semibold hover:bg-[#7e69f6] transition"
                  type="button"
                >
                  {modoEdicion ? "Guardar Cambios" : "Guardar Producto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalEliminar && productoAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] rounded-[18px] bg-white shadow-[0_20px_60px_rgba(39,33,79,0.18)] border border-[#ece7fb] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#ece7fb]">
              <h3 className="text-[18px] font-semibold text-[#20224a]">
                Confirmar eliminación
              </h3>

              <button
                onClick={cerrarEliminar}
                className="text-[#8f95b2] hover:text-[#20224a] transition"
                type="button"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-6 text-[#20224a] text-sm leading-6">
              <p>
                ¿Eliminar el producto <span className="font-semibold">{productoAEliminar.nombre}</span>{" "}
                (SKU <span className="font-semibold">{productoAEliminar.sku}</span>)?
              </p>
              <p>Esta acción no se puede deshacer.</p>
            </div>

            <div className="px-5 pb-4 flex justify-end gap-3">
              <button
                onClick={cerrarEliminar}
                className="h-10 px-5 rounded-xl bg-[#eef1f6] text-[#20224a] font-medium hover:bg-[#e6eaf2] transition"
                type="button"
              >
                Cancelar
              </button>

              <button
                onClick={eliminarProducto}
                className="h-10 px-5 rounded-xl bg-[#e11d48] text-white font-semibold hover:bg-[#c81e46] transition"
                type="button"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExito && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[360px] bg-white rounded-[14px] shadow-[0_20px_60px_rgba(39,33,79,0.18)] px-8 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center">
                <Check size={46} className="text-green-600" strokeWidth={2.5} />
              </div>
            </div>

            <h3 className="text-[28px] font-bold text-[#20224a] leading-none mb-4">
              ¡Éxito!
            </h3>

            <p className="text-[#4b5563] text-[17px] mb-6">
              Operación completada exitosamente
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
        <div className="fixed right-6 bottom-6 z-[60] rounded-2xl bg-[#20224a] text-white px-5 py-3 shadow-lg">
          {mensaje}
        </div>
      )}

      <style>{`
        .modal-input {
          width: 100%;
          height: 44px;
          border: 1px solid #d9dce8;
          border-radius: 12px;
          padding: 0 14px;
          outline: none;
          color: #20224a;
          background: white;
        }

        .modal-input:focus {
          border-color: #8f7cf8;
          box-shadow: 0 0 0 3px rgba(143, 124, 248, 0.12);
        }

        .modal-input:disabled {
          background: #f8f8fc;
          color: #6b7280;
          cursor: not-allowed;
        }

        .modal-input-disabled {
          background: #f8f8fc;
          color: #6b7280;
          cursor: not-allowed;
        }

        .modal-textarea {
          height: auto;
          min-height: 84px;
          padding-top: 12px;
          padding-bottom: 12px;
        }
      `}</style>
    </div>
  )
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

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm text-[#20224a] mb-2">{label}</label>
      {children}
    </div>
  )
}

export default Inventario