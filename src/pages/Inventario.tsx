import { useEffect, useMemo, useState } from "react"
import axios from "axios"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import {
  Bell,
  Search,
  Plus,
  X,
  Package,
  Pencil,
  Trash2,
  FileSpreadsheet,
  FileText,
} from "lucide-react"
import { useNavigate } from "react-router-dom"
import { useAppTheme } from "../theme/AppThemeContext"

function Inventario() {
  const [productos, setProductos] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [modal, setModal] = useState(false)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [productoEditar, setProductoEditar] = useState<any | null>(null)
  const [productoEliminar, setProductoEliminar] = useState<any | null>(null)
  const [mensaje, setMensaje] = useState("")
  const [busqueda, setBusqueda] = useState("")
  const [filtro, setFiltro] = useState("todos")
  const [errores, setErrores] = useState<Record<string, string>>({})

  const token = localStorage.getItem("token") || ""
  const API_PRODUCTOS = "http://localhost:8080/api/productos"
  const navigate = useNavigate()
  const { theme } = useAppTheme()

  const [form, setForm] = useState({
    sku: "",
    nombre: "",
    categoria: "",
    precioUnitario: "",
    stock: "",
    stockMinimo: "",
    stockMaximo: "",
    descripcion: "",
  })

  const getHeaders = () => ({
    Authorization: `Bearer ${token}`,
  })

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
  const puedeGestionar = esSuperAdmin || esAdmin
  const puedeVerAlertas = esSuperAdmin || esAdmin || esSupervisor

  const cargarProductos = async () => {
    try {
      setCargando(true)
      const res = await axios.get(API_PRODUCTOS, {
        headers: getHeaders(),
      })
      setProductos(Array.isArray(res.data) ? res.data : [])
    } catch (error) {
      console.log(error)
      setProductos([])
      setMensaje("No se pudieron cargar los productos")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    cargarProductos()
  }, [])

  useEffect(() => {
    if (!mensaje) return
    const timer = setTimeout(() => setMensaje(""), 3000)
    return () => clearTimeout(timer)
  }, [mensaje])

  const productosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()

    return productos.filter((producto) => {
      const stock = Number(producto.stock ?? 0)
      const minimo = Number(producto.minimo ?? 0)
      const esCritico = minimo > 0 && stock <= minimo

      if (filtro === "normales" && esCritico) return false
      if (filtro === "criticos" && !esCritico) return false

      if (!q) return true

      return (
        String(producto.sku || "").toLowerCase().includes(q) ||
        String(producto.nombre || "").toLowerCase().includes(q) ||
        String(producto.categoria || "").toLowerCase().includes(q) ||
        String(producto.descripcion || "").toLowerCase().includes(q)
      )
    })
  }, [productos, busqueda, filtro])

  const productosNormales = productos.filter((p) => {
    const stock = Number(p.stock ?? 0)
    const minimo = Number(p.minimo ?? 0)
    return !(minimo > 0 && stock <= minimo)
  }).length

  const productosCriticos = productos.filter((p) => {
    const stock = Number(p.stock ?? 0)
    const minimo = Number(p.minimo ?? 0)
    return minimo > 0 && stock <= minimo
  }).length

  const limpiarFormulario = () => {
    setForm({
      sku: "",
      nombre: "",
      categoria: "",
      precioUnitario: "",
      stock: "",
      stockMinimo: "",
      stockMaximo: "",
      descripcion: "",
    })
    setErrores({})
    setProductoEditar(null)
  }

  const abrirNuevo = () => {
    limpiarFormulario()
    setModal(true)
  }

  const abrirEditar = (producto: any) => {
    setProductoEditar(producto)
    setErrores({})
    setForm({
      sku: String(producto.sku ?? ""),
      nombre: String(producto.nombre ?? ""),
      categoria: String(producto.categoria ?? ""),
      precioUnitario: String(producto.precioUnitario ?? ""),
      stock: String(producto.stock ?? ""),
      stockMinimo: String(producto.minimo ?? ""),
      stockMaximo: String(producto.stockMaximo ?? ""),
      descripcion: String(producto.descripcion ?? ""),
    })
    setModal(true)
  }

  const cerrarModal = () => {
    setModal(false)
    limpiarFormulario()
  }

  const limpiarErrorCampo = (name: string) => {
    setErrores((prev) => {
      if (!prev[name]) return prev
      const copia = { ...prev }
      delete copia[name]
      return copia
    })
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target
    limpiarErrorCampo(name)

    if (
      name === "precioUnitario" ||
      name === "stock" ||
      name === "stockMinimo" ||
      name === "stockMaximo"
    ) {
      const limpio = value.replace(/[^\d]/g, "")
      setForm((prev) => ({ ...prev, [name]: limpio }))
      return
    }

    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const validarFormulario = () => {
    const nuevosErrores: Record<string, string> = {}

    if (!form.sku.trim()) {
      nuevosErrores.sku = "Este campo es obligatorio."
    }

    if (!form.nombre.trim()) {
      nuevosErrores.nombre = "Este campo es obligatorio."
    }

    if (!form.categoria.trim()) {
      nuevosErrores.categoria = "Este campo es obligatorio."
    }

    if (!form.stockMinimo.trim()) {
      nuevosErrores.stockMinimo = "Este campo es obligatorio."
    }

    if (!form.stockMaximo.trim()) {
      nuevosErrores.stockMaximo = "Este campo es obligatorio."
    }

    if (!form.stock.trim()) {
      nuevosErrores.stock = "Este campo es obligatorio."
    }

    if (!form.precioUnitario.trim()) {
      nuevosErrores.precioUnitario = "Este campo es obligatorio."
    }

    const stock = Number(form.stock || 0)
    const minimo = Number(form.stockMinimo || 0)
    const stockMaximo = Number(form.stockMaximo || 0)
    const precioUnitario = Number(form.precioUnitario || 0)

    if (form.precioUnitario.trim() && precioUnitario <= 0) {
      nuevosErrores.precioUnitario = "Ingrese un valor unitario válido."
    }

    if (stock < 0) {
      nuevosErrores.stock = "El stock no puede ser negativo."
    }

    if (minimo < 0) {
      nuevosErrores.stockMinimo = "El stock mínimo no puede ser negativo."
    }

    if (stockMaximo < 0) {
      nuevosErrores.stockMaximo = "El stock máximo no puede ser negativo."
    }

    if (form.stockMinimo.trim() && form.stockMaximo.trim() && minimo > stockMaximo) {
      nuevosErrores.stockMinimo = "El stock mínimo no puede ser mayor que el stock máximo."
    }

    if (form.stock.trim() && form.stockMaximo.trim() && stock > stockMaximo) {
      nuevosErrores.stock = "El stock actual no puede superar el stock máximo."
    }

    setErrores(nuevosErrores)
    return Object.keys(nuevosErrores).length === 0
  }

  const guardarProducto = async () => {
    if (!validarFormulario()) return

    try {
      const data = {
        sku: form.sku.trim(),
        nombre: form.nombre.trim(),
        categoria: form.categoria.trim(),
        precioUnitario: Number(form.precioUnitario || 0),
        stock: Number(form.stock || 0),
        minimo: Number(form.stockMinimo || 0),
        stockMaximo: Number(form.stockMaximo || 0),
        descripcion: form.descripcion.trim(),
      }

      if (productoEditar?.id) {
        await axios.put(`${API_PRODUCTOS}/${productoEditar.id}`, data, {
          headers: getHeaders(),
        })
        setMensaje("Producto actualizado correctamente")
      } else {
        await axios.post(API_PRODUCTOS, data, {
          headers: getHeaders(),
        })
        setMensaje("Producto creado correctamente")
      }

      cerrarModal()
      await cargarProductos()
    } catch (error: any) {
      console.log(error)
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "No se pudo guardar el producto"
      setMensaje(String(msg))
    }
  }

  const confirmarEliminar = (producto: any) => {
    setProductoEliminar(producto)
    setModalEliminar(true)
  }

  const eliminarProducto = async () => {
    if (!productoEliminar?.id) return

    try {
      await axios.delete(`${API_PRODUCTOS}/${productoEliminar.id}`, {
        headers: getHeaders(),
      })
      setModalEliminar(false)
      setProductoEliminar(null)
      setMensaje("Producto eliminado correctamente")
      await cargarProductos()
    } catch (error: any) {
      console.log(error)
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "No se pudo eliminar el producto"
      setMensaje(String(msg))
    }
  }

  const formatoMoneda = (valor: any) => {
    const numero = Number(valor || 0)
    return numero.toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    })
  }

  const valorTotalInventario = productos.reduce((acc, p) => {
    return acc + Number(p.stock || 0) * Number(p.precioUnitario || 0)
  }, 0)

  const exportarExcel = () => {
    const filas = productos.map((p) => {
      const stock = Number(p.stock || 0)
      const precio = Number(p.precioUnitario || 0)

      return `
        <tr>
          <td>${p.sku || ""}</td>
          <td>${p.nombre || ""}</td>
          <td>${p.categoria || ""}</td>
          <td>${p.descripcion || ""}</td>
          <td>${stock}</td>
          <td>${p.minimo ?? 0}</td>
          <td>${p.stockMaximo ?? 0}</td>
          <td>${precio}</td>
          <td>${stock * precio}</td>
        </tr>
      `
    }).join("")

    const html = `
      <html>
        <head>
          <meta charset="UTF-8" />
        </head>
        <body>
          <table>
            <tr>
              <td colspan="9"><b>NEXSTOCK - REPORTE DE INVENTARIO</b></td>
            </tr>
            <tr>
              <td colspan="2">Fecha de generación:</td>
              <td>${new Date().toLocaleString("es-CO")}</td>
            </tr>
            <tr></tr>
            <tr style="background:#0f6fc6;color:white;font-weight:bold;">
              <td>SKU</td>
              <td>Nombre</td>
              <td>Categoría</td>
              <td>Descripción</td>
              <td>Stock Actual</td>
              <td>Mínimo</td>
              <td>Máximo</td>
              <td>Precio Unitario</td>
              <td>Valor Total</td>
            </tr>
            ${filas}
            <tr></tr>
            <tr>
              <td colspan="7"></td>
              <td><b>Total Inventario</b></td>
              <td><b>${valorTotalInventario}</b></td>
            </tr>
          </table>
        </body>
      </html>
    `

    const blob = new Blob([html], {
      type: "application/vnd.ms-excel;charset=utf-8;",
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "reporte-inventario.xls"
    link.click()
    URL.revokeObjectURL(url)
  }

  const exportarPDF = () => {
    const doc = new jsPDF({
      orientation: "landscape",
      unit: "pt",
      format: "a4",
    })

    const fecha = new Date().toLocaleString("es-CO")

    doc.setFont("helvetica", "bold")
    doc.setFontSize(22)
    doc.text("NEXSTOCK", 40, 45)

    doc.setFont("helvetica", "normal")
    doc.setFontSize(10)
    doc.text("Sistema de Control de Inventario", 40, 62)
    doc.text(`Fecha de generación: ${fecha}`, 40, 78)

    const filas = productos.map((p) => {
      const stock = Number(p.stock || 0)
      const precio = Number(p.precioUnitario || 0)

      return [
        p.sku || "",
        p.nombre || "",
        p.categoria || "",
        stock,
        p.minimo ?? 0,
        p.stockMaximo ?? 0,
        formatoMoneda(precio),
        formatoMoneda(stock * precio),
      ]
    })

    autoTable(doc, {
      startY: 110,
      head: [[
        "SKU",
        "Nombre",
        "Categoría",
        "Stock",
        "Mín.",
        "Máx.",
        "Valor Unitario",
        "Valor Total",
      ]],
      body: filas,
      theme: "grid",
      styles: {
        fontSize: 9,
        cellPadding: 5,
        textColor: [17, 24, 39],
        lineColor: [40, 40, 40],
        lineWidth: 0.4,
      },
      headStyles: {
        fillColor: [124, 101, 246],
        textColor: [255, 255, 255],
        halign: "center",
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 170 },
        2: { cellWidth: 100 },
        3: { cellWidth: 55, halign: "center" },
        4: { cellWidth: 55, halign: "center" },
        5: { cellWidth: 55, halign: "center" },
        6: { cellWidth: 100 },
        7: { cellWidth: 100 },
      },
    })

    const finalY = (doc as any).lastAutoTable?.finalY || 110

    doc.setFont("helvetica", "bold")
    doc.setFontSize(12)
    doc.text(
      `Valor total del inventario: ${formatoMoneda(valorTotalInventario)}`,
      560,
      finalY + 35
    )

    doc.setFont("helvetica", "italic")
    doc.setFontSize(9)
    doc.setTextColor(120)
    doc.text("Nexstock © - Reporte generado automáticamente", 335, finalY + 70)

    doc.save("reporte-inventario.pdf")
  }

  return (
    <div
      className="inventario-page"
      style={
        {
          "--inv-page": theme.page,
          "--inv-card": theme.card,
          "--inv-panel": theme.panel,
          "--inv-input": theme.input,
          "--inv-text": theme.text,
          "--inv-muted": theme.muted,
          "--inv-border": theme.border,
          "--inv-selected": theme.selected,
          "--inv-primary": theme.primary,
          "--inv-primary-hover": theme.primaryHover,
          "--inv-button-dark": theme.buttonDark,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-[32px] font-bold inventario-title leading-none">
            Gestión de Inventario
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 inventario-muted-icon"
            />
            <input
              type="text"
              placeholder="Buscar..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="inventario-input w-[220px] h-11 rounded-2xl border pl-10 pr-4 text-sm outline-none"
            />
          </div>

          {puedeVerAlertas && (
            <button
              onClick={() => navigate("/alertas")}
              className="w-11 h-11 rounded-2xl inventario-alert-button flex items-center justify-center relative"
              type="button"
            >
              <Bell size={16} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500"></span>
            </button>
          )}

          {puedeGestionar && (
            <button
              onClick={abrirNuevo}
              className="h-11 rounded-2xl inventario-primary-button text-white font-semibold px-5 flex items-center justify-center gap-2 transition"
              type="button"
            >
              <Plus size={16} />
              Nuevo Producto
            </button>
          )}
        </div>
      </div>

      <section className="inventario-panel rounded-[28px] border p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <TabButton active={filtro === "todos"} onClick={() => setFiltro("todos")} label={`Todos (${productos.length})`} />
            <TabButton active={filtro === "normales"} onClick={() => setFiltro("normales")} label={`Normales (${productosNormales})`} />
            <TabButton active={filtro === "criticos"} onClick={() => setFiltro("criticos")} label={`Críticos (${productosCriticos})`} />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={exportarExcel}
              className="inventario-secondary-button h-10 rounded-xl border px-4 text-sm font-semibold flex items-center gap-2 transition"
              type="button"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>

            <button
              onClick={exportarPDF}
              className="inventario-secondary-button h-10 rounded-xl border px-4 text-sm font-semibold flex items-center gap-2 transition"
              type="button"
            >
              <FileText size={16} />
              Exportar PDF
            </button>
          </div>
        </div>

        <div className="inventario-table rounded-[24px] border overflow-hidden">
          <div className="grid grid-cols-[90px_1.7fr_1fr_1.1fr_1fr_1fr_1fr] px-6 py-4 text-[12px] font-bold uppercase border-b inventario-table-head">
            <div>SKU</div>
            <div>Producto</div>
            <div>Categoría</div>
            <div>Valor Unitario</div>
            <div>Stock Actual</div>
            <div>Estado</div>
            <div>Acciones</div>
          </div>

          {cargando ? (
            <div className="px-6 py-12 text-center inventario-muted">
              Cargando productos...
            </div>
          ) : productosFiltrados.length === 0 ? (
            <div className="px-6 py-12 text-center inventario-muted">
              No hay productos para mostrar
            </div>
          ) : (
            productosFiltrados.map((producto) => {
              const stock = Number(producto.stock || 0)
              const minimo = Number(producto.minimo || 0)
              const maximo = Number(producto.stockMaximo || 0)
              const critico = minimo > 0 && stock <= minimo
              const porcentaje = maximo > 0 ? Math.min((stock / maximo) * 100, 100) : 0

              return (
                <div
                  key={producto.id}
                  className="grid grid-cols-[90px_1.7fr_1fr_1.1fr_1fr_1fr_1fr] items-center px-6 py-4 border-b last:border-b-0 inventario-row"
                >
                  <div className="text-sm inventario-muted">
                    {producto.sku}
                  </div>

                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl inventario-icon-box flex items-center justify-center">
                      <Package size={17} />
                    </div>
                    <div className="min-w-0">
                      <div
                        className="font-semibold inventario-title truncate cursor-help"
                        title={producto.descripcion || "Sin descripción"}
                      >
                        {producto.nombre}
                      </div>
                      <div className="text-xs inventario-muted">
                        {producto.sku}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm inventario-title">
                    {producto.categoria}
                  </div>

                  <div className="text-sm font-semibold inventario-title">
                    {formatoMoneda(producto.precioUnitario)}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full inventario-stock-bg overflow-hidden">
                        <div
                          className="h-full rounded-full inventario-stock-bar"
                          style={{ width: `${porcentaje}%` }}
                        ></div>
                      </div>
                      <span className="text-sm font-semibold inventario-title min-w-[30px]">
                        {stock}
                      </span>
                    </div>
                    <div className="text-[11px] inventario-muted mt-1">
                      Mín: {minimo} · Máx: {maximo}
                    </div>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center rounded-full px-3 py-1 text-[12px] font-semibold ${
                        critico
                          ? "bg-[#fff1ea] text-[#e58a57]"
                          : "bg-[#eefbf3] text-[#20a464]"
                      }`}
                    >
                      {critico ? "Crítico" : "Normal"}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {puedeGestionar ? (
                      <>
                        <button
                          onClick={() => abrirEditar(producto)}
                          className="w-9 h-9 rounded-xl bg-[#fff7ed] text-[#f59e0b] flex items-center justify-center hover:bg-[#ffedd5] transition"
                          type="button"
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          onClick={() => confirmarEliminar(producto)}
                          className="w-9 h-9 rounded-xl bg-[#fff1f2] text-[#ef4444] flex items-center justify-center hover:bg-[#ffe4e6] transition"
                          type="button"
                        >
                          <Trash2 size={15} />
                        </button>
                      </>
                    ) : (
                      <span className="text-xs inventario-muted">
                        Solo lectura
                      </span>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[620px] rounded-[22px] inventario-modal shadow-[0_20px_60px_rgba(39,33,79,0.18)] border overflow-hidden">
            <div className="relative px-6 pt-3 pb-1">
              <button
                onClick={cerrarModal}
                className="absolute right-5 top-4 inventario-muted hover:opacity-80 transition"
                type="button"
              >
                <X size={18} />
              </button>

              <div className="text-center">
                <h2 className="text-[22px] font-bold inventario-title leading-none">
                  {productoEditar ? "Editar Producto" : "Nuevo Producto"}
                </h2>
                <p className="inventario-muted text-sm mt-2">
                  Complete la información del producto
                </p>
              </div>
            </div>

            <div className="px-6 pb-3">
              <div className="space-y-3">
                <Field label="SKU" error={errores.sku}>
                  <input
                    name="sku"
                    value={form.sku}
                    onChange={handleChange}
                    className={`modal-input ${errores.sku ? "modal-error" : ""}`}
                    placeholder="SKU-001"
                  />
                </Field>

                <Field label="Nombre del Producto" error={errores.nombre}>
                  <input
                    name="nombre"
                    value={form.nombre}
                    onChange={handleChange}
                    className={`modal-input ${errores.nombre ? "modal-error" : ""}`}
                    placeholder="Nombre del producto"
                  />
                </Field>

                <Field label="Categoría" error={errores.categoria}>
                  <input
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    className={`modal-input ${errores.categoria ? "modal-error" : ""}`}
                    placeholder="Escribe o selecciona"
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Stock Mínimo" error={errores.stockMinimo}>
                    <input
                      name="stockMinimo"
                      value={form.stockMinimo}
                      onChange={handleChange}
                      className={`modal-input ${errores.stockMinimo ? "modal-error" : ""}`}
                      placeholder="10"
                      inputMode="numeric"
                    />
                  </Field>

                  <Field label="Stock Máximo" error={errores.stockMaximo}>
                    <input
                      name="stockMaximo"
                      value={form.stockMaximo}
                      onChange={handleChange}
                      className={`modal-input ${errores.stockMaximo ? "modal-error" : ""}`}
                      placeholder="100"
                      inputMode="numeric"
                    />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Stock" error={errores.stock}>
                    <input
                      name="stock"
                      value={form.stock}
                      onChange={handleChange}
                      className={`modal-input ${errores.stock ? "modal-error" : ""}`}
                      placeholder="20"
                      inputMode="numeric"
                    />
                  </Field>

                  <Field label="Precio Unitario" error={errores.precioUnitario}>
                    <input
                      name="precioUnitario"
                      value={form.precioUnitario}
                      onChange={handleChange}
                      className={`modal-input ${errores.precioUnitario ? "modal-error" : ""}`}
                      placeholder="210000"
                      inputMode="numeric"
                    />
                  </Field>
                </div>

                <Field label="Descripción">
                  <textarea
                    name="descripcion"
                    value={form.descripcion}
                    onChange={handleChange}
                    className="modal-textarea"
                    placeholder="Opcional"
                  />
                </Field>
              </div>

              <div className="border-t inventario-border mt-5 pt-4 flex justify-center gap-3">
                <button
                  onClick={cerrarModal}
                  className="h-10 px-6 rounded-xl inventario-cancel-button border font-medium transition"
                  type="button"
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarProducto}
                  className="h-10 px-6 rounded-xl inventario-primary-button text-white font-semibold transition"
                  type="button"
                >
                  {productoEditar ? "Guardar Cambios" : "Guardar Producto"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalEliminar && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[420px] rounded-[24px] inventario-modal shadow-xl border p-6">
            <h3 className="text-xl font-bold inventario-title mb-2">
              Eliminar producto
            </h3>
            <p className="text-sm inventario-muted mb-5">
              ¿Seguro que deseas eliminar el producto{" "}
              <b>{productoEliminar?.nombre}</b>?
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setModalEliminar(false)
                  setProductoEliminar(null)
                }}
                className="h-10 px-5 rounded-xl inventario-cancel-button border"
                type="button"
              >
                Cancelar
              </button>

              <button
                onClick={eliminarProducto}
                className="h-10 px-5 rounded-xl bg-[#ef4444] text-white font-semibold"
                type="button"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {mensaje && (
        <div className="fixed right-6 bottom-6 z-[60] max-w-[420px] rounded-2xl inventario-toast px-5 py-3 shadow-lg text-sm">
          {mensaje}
        </div>
      )}

      <style>{`
        .inventario-page {
          background: var(--inv-page);
          color: var(--inv-text);
        }

        .inventario-title {
          color: var(--inv-text);
        }

        .inventario-muted,
        .inventario-muted-icon {
          color: var(--inv-muted);
        }

        .inventario-border {
          border-color: var(--inv-border);
        }

        .inventario-input {
          background: var(--inv-input);
          border-color: var(--inv-border);
          color: var(--inv-text);
        }

        .inventario-input::placeholder {
          color: var(--inv-muted);
        }

        .inventario-input:focus,
        .modal-input:focus,
        .modal-textarea:focus {
          border-color: var(--inv-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--inv-primary) 18%, transparent);
        }

        .inventario-alert-button {
          background: #fff8e6;
          border: 1px solid #f2df9c;
          color: #d6a11a;
        }

        .inventario-primary-button {
          background: var(--inv-primary);
        }

        .inventario-primary-button:hover {
          background: var(--inv-primary-hover);
        }

        .inventario-secondary-button {
          background: var(--inv-card);
          border-color: var(--inv-border);
          color: var(--inv-text);
        }

        .inventario-secondary-button:hover {
          background: var(--inv-input);
        }

        .inventario-panel {
          background: var(--inv-panel);
          border-color: var(--inv-border);
        }

        .inventario-table,
        .inventario-modal {
          background: var(--inv-card);
          border-color: var(--inv-border);
          color: var(--inv-text);
        }

        .inventario-table-head {
          color: var(--inv-muted);
          border-color: var(--inv-border);
        }

        .inventario-row {
          border-color: var(--inv-border);
        }

        .inventario-icon-box {
          background: var(--inv-selected);
          color: var(--inv-primary);
        }

        .inventario-stock-bg {
          background: var(--inv-border);
        }

        .inventario-stock-bar {
          background: var(--inv-primary);
        }

        .inventario-cancel-button {
          background: transparent;
          border-color: var(--inv-border);
          color: var(--inv-text);
        }

        .inventario-cancel-button:hover {
          background: var(--inv-input);
        }

        .inventario-toast {
          background: var(--inv-button-dark);
          color: white;
        }

        .modal-input {
          width: 100%;
          height: 40px;
          border: 1px solid var(--inv-border);
          border-radius: 12px;
          padding: 0 14px;
          outline: none;
          color: var(--inv-text);
          background: var(--inv-input);
        }

        .modal-textarea {
          width: 100%;
          min-height: 86px;
          border: 1px solid var(--inv-border);
          border-radius: 12px;
          padding: 12px 14px;
          outline: none;
          color: var(--inv-text);
          background: var(--inv-input);
          resize: none;
        }

        .modal-input::placeholder,
        .modal-textarea::placeholder {
          color: var(--inv-muted);
        }

        .modal-error {
          border-color: #ef4444 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.14);
        }

        .field-error-text {
          color: #ef4444;
          font-size: 12px;
          margin-top: 5px;
          line-height: 1.2;
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
      className={`inventario-tab-button px-4 h-10 rounded-2xl text-sm font-semibold transition ${
        active ? "active" : ""
      }`}
      type="button"
    >
      {label}

      <style>{`
        .inventario-tab-button {
          color: var(--inv-muted);
          background: transparent;
        }

        .inventario-tab-button.active {
          background: var(--inv-primary);
          color: white;
        }

        .inventario-tab-button:hover {
          background: var(--inv-selected);
          color: var(--inv-primary);
        }

        .inventario-tab-button.active:hover {
          background: var(--inv-primary-hover);
          color: white;
        }
      `}</style>
    </button>
  )
}

type FieldProps = {
  label: string
  children: React.ReactNode
  error?: string
}

function Field({ label, children, error }: FieldProps) {
  return (
    <div>
      <label className="block text-sm inventario-title mb-2">{label}</label>
      {children}
      {error && <p className="field-error-text">{error}</p>}
    </div>
  )
}

export default Inventario