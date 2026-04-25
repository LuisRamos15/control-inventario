import { useEffect, useMemo, useState, type ReactNode } from "react"
import {
  Pencil,
  Trash2,
  Users,
  X,
  Check,
  Plus,
  Search,
} from "lucide-react"
import {
  crearUsuario,
  editarUsuario,
  eliminarUsuario,
  getUsuarios,
} from "../api/usuarios"
import { useAppTheme } from "../theme/AppThemeContext"

function Usuarios() {
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState("")
  const [modal, setModal] = useState(false)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [usuarioEditando, setUsuarioEditando] = useState<any | null>(null)
  const [modalEliminar, setModalEliminar] = useState(false)
  const [usuarioAEliminar, setUsuarioAEliminar] = useState<any | null>(null)
  const [modalExito, setModalExito] = useState(false)
  const [mensajeExito, setMensajeExito] = useState("Operación completada exitosamente")
  const [mensaje, setMensaje] = useState("")

  const { theme } = useAppTheme()

  const [form, setForm] = useState({
    nombreUsuario: "",
    password: "",
    rol: "OPERADOR",
    activo: true,
  })

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

  const usuarioActual = useMemo(() => {
    if (!payload) return ""
    return String(
      payload.sub ||
        payload.nombreUsuario ||
        payload.username ||
        payload.usuario ||
        ""
    )
      .trim()
      .toLowerCase()
  }, [payload])

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

  const puedeVerUsuarios = esSuperAdmin || esAdmin

  const rolesDisponibles = useMemo(() => {
    if (esSuperAdmin) {
      return ["ADMIN", "SUPERVISOR", "OPERADOR"]
    }

    if (esAdmin) {
      return ["SUPERVISOR", "OPERADOR"]
    }

    return []
  }, [esSuperAdmin, esAdmin])

  const cargarUsuarios = async () => {
    try {
      setCargando(true)
      const data = await getUsuarios()
      setUsuarios(Array.isArray(data) ? data : [])
    } catch (error: any) {
      console.log(error)
      setUsuarios([])
      setMensaje("No se pudieron cargar los usuarios")
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => {
    if (puedeVerUsuarios) {
      cargarUsuarios()
    } else {
      setCargando(false)
    }
  }, [puedeVerUsuarios])

  useEffect(() => {
    if (!mensaje) return
    const timer = setTimeout(() => setMensaje(""), 2500)
    return () => clearTimeout(timer)
  }, [mensaje])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const limpiarFormulario = () => {
    setForm({
      nombreUsuario: "",
      password: "",
      rol: rolesDisponibles[0] || "OPERADOR",
      activo: true,
    })
    setModoEdicion(false)
    setUsuarioEditando(null)
  }

  const abrirCrear = () => {
    limpiarFormulario()
    setModal(true)
  }

  const abrirEditar = (usuario: any) => {
    const rolActual = normalizarRol(usuario.roles)

    setForm({
      nombreUsuario: usuario.nombreUsuario || "",
      password: "",
      rol: rolActual,
      activo: usuario.activo ?? true,
    })
    setUsuarioEditando(usuario)
    setModoEdicion(true)
    setModal(true)
  }

  const cerrarModal = () => {
    setModal(false)
    limpiarFormulario()
  }

  const abrirEliminar = (usuario: any) => {
    setUsuarioAEliminar(usuario)
    setModalEliminar(true)
  }

  const cerrarEliminar = () => {
    setUsuarioAEliminar(null)
    setModalEliminar(false)
  }

  const guardarUsuario = async () => {
    try {
      if (modoEdicion && usuarioEditando) {
        await editarUsuario(usuarioEditando.id, {
          nombreUsuario: form.nombreUsuario,
          roles: [form.rol],
          activo: form.activo,
        })

        setMensajeExito("Usuario actualizado exitosamente")
      } else {
        await crearUsuario({
          nombreUsuario: form.nombreUsuario,
          password: form.password,
          roles: [form.rol],
        })

        setMensajeExito("Usuario creado exitosamente")
      }

      cerrarModal()
      await cargarUsuarios()
      setModalExito(true)
    } catch (error: any) {
      console.log(error)
      setMensaje(
        error?.response?.data?.message ||
          error?.response?.data ||
          "No se pudo guardar el usuario"
      )
    }
  }

  const confirmarEliminar = async () => {
    if (!usuarioAEliminar?.id) return

    try {
      await eliminarUsuario(usuarioAEliminar.id)
      cerrarEliminar()
      await cargarUsuarios()
      setMensajeExito("Usuario eliminado exitosamente")
      setModalExito(true)
    } catch (error: any) {
      console.log(error)
      setMensaje(
        error?.response?.data?.message ||
          error?.response?.data ||
          "No se pudo eliminar el usuario"
      )
    }
  }

  const usuariosFiltrados = useMemo(() => {
    const usuariosSinActual = usuarios.filter((u) => {
      const nombre = String(u.nombreUsuario || "").trim().toLowerCase()
      return nombre !== usuarioActual
    })

    const q = busqueda.trim().toLowerCase()

    if (!q) return usuariosSinActual

    return usuariosSinActual.filter((u) => {
      const nombre = String(u.nombreUsuario || "").toLowerCase()
      const rol = normalizarRol(u.roles).toLowerCase()
      return nombre.includes(q) || rol.includes(q)
    })
  }, [usuarios, busqueda, usuarioActual])

  if (!puedeVerUsuarios) {
    return (
      <div
        className="usuarios-page p-6 min-h-screen flex items-center justify-center"
        style={
          {
            "--usuarios-page": theme.page,
            "--usuarios-card": theme.card,
            "--usuarios-panel": theme.panel,
            "--usuarios-input": theme.input,
            "--usuarios-text": theme.text,
            "--usuarios-muted": theme.muted,
            "--usuarios-border": theme.border,
            "--usuarios-selected": theme.selected,
            "--usuarios-primary": theme.primary,
            "--usuarios-primary-hover": theme.primaryHover,
            "--usuarios-button-dark": theme.buttonDark,
          } as React.CSSProperties
        }
      >
        <div className="usuarios-card rounded-2xl border px-8 py-10 text-center">
          <h2 className="text-2xl font-bold usuarios-title mb-2">Acceso restringido</h2>
          <p className="usuarios-muted">
            No tienes permisos para acceder al módulo de usuarios.
          </p>
        </div>

        <style>{usuariosStyles}</style>
      </div>
    )
  }

  return (
    <div
      className="usuarios-page p-6 min-h-screen"
      style={
        {
          "--usuarios-page": theme.page,
          "--usuarios-card": theme.card,
          "--usuarios-panel": theme.panel,
          "--usuarios-input": theme.input,
          "--usuarios-text": theme.text,
          "--usuarios-muted": theme.muted,
          "--usuarios-border": theme.border,
          "--usuarios-selected": theme.selected,
          "--usuarios-primary": theme.primary,
          "--usuarios-primary-hover": theme.primaryHover,
          "--usuarios-button-dark": theme.buttonDark,
        } as React.CSSProperties
      }
    >
      <section className="usuarios-panel rounded-[28px] border p-6">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Users size={18} className="usuarios-primary-icon" />
              <h2 className="text-[22px] font-bold usuarios-title">Gestión de Usuarios</h2>
            </div>

            <p className="usuarios-muted text-sm">
              Administra roles, estado y acceso del sistema
            </p>
          </div>

          <button
            onClick={abrirCrear}
            className="h-11 rounded-2xl usuarios-primary-button text-white font-semibold px-5 flex items-center justify-center gap-2 transition shrink-0"
          >
            <Plus size={16} />
            Nuevo Usuario
          </button>
        </div>

        <div className="relative mb-4">
          <Search
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 usuarios-muted-icon"
          />
          <input
            type="text"
            placeholder="Buscar por nombre o rol..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="usuarios-input w-full h-11 rounded-2xl border pl-10 pr-4 text-sm outline-none"
          />
        </div>

        {cargando ? (
          <div className="usuarios-card rounded-[24px] border px-6 py-12 text-center usuarios-muted">
            Cargando usuarios...
          </div>
        ) : usuariosFiltrados.length === 0 ? (
          <div className="usuarios-card rounded-[24px] border px-6 py-12 text-center usuarios-muted">
            No hay usuarios para mostrar
          </div>
        ) : (
          <div className="space-y-3">
            {usuariosFiltrados.map((usuario, index) => {
              const rol = normalizarRol(usuario.roles)
              const iniciales = obtenerIniciales(usuario.nombreUsuario)

              return (
                <div
                  key={usuario.id || index}
                  className="usuarios-card rounded-[20px] border px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full usuarios-avatar text-white flex items-center justify-center font-semibold">
                      {iniciales}
                    </div>

                    <div>
                      <div className="font-semibold usuarios-title text-[20px] leading-none mb-1">
                        {usuario.nombreUsuario}
                      </div>
                      <div className="usuarios-muted text-sm">
                        {usuario.nombreUsuario}@inventario.com
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <span className={badgeRolClass(rol)}>{rol}</span>

                    <span className="inline-flex items-center gap-2 text-sm text-[#20a464] font-medium">
                      <span className="w-2 h-2 rounded-full bg-[#20a464]"></span>
                      {usuario.activo ? "Activo" : "Inactivo"}
                    </span>

                    <button
                      onClick={() => abrirEditar(usuario)}
                      className="w-9 h-9 rounded-xl bg-[#fff7ed] flex items-center justify-center text-[#f2a15e] hover:bg-[#ffedd5] transition"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      onClick={() => abrirEliminar(usuario)}
                      className="w-9 h-9 rounded-xl bg-[#fff1f1] flex items-center justify-center text-[#d86a6a] hover:bg-[#ffe5e5] transition"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[620px] rounded-[26px] usuarios-modal shadow-[0_20px_60px_rgba(39,33,79,0.18)] border overflow-hidden">
            <div className="relative px-6 pt-5 pb-2">
              <button
                onClick={cerrarModal}
                className="absolute right-5 top-5 usuarios-muted hover:opacity-80 transition"
              >
                <X size={18} />
              </button>

              <div className="text-center">
                <h2 className="text-[22px] font-bold usuarios-title leading-none">
                  {modoEdicion ? "Editar Usuario" : "Nuevo Usuario"}
                </h2>
                <p className="usuarios-muted text-sm mt-2">
                  Gestiona acceso, rol y estado del usuario
                </p>
              </div>
            </div>

            <div className="px-6 pb-5">
              <div className="space-y-3">
                <Field label="Nombre de usuario">
                  <input
                    name="nombreUsuario"
                    value={form.nombreUsuario}
                    onChange={handleChange}
                    placeholder="Ej: juan123"
                    className="modal-input"
                  />
                </Field>

                {!modoEdicion && (
                  <Field label="Contraseña">
                    <input
                      name="password"
                      type="password"
                      value={form.password}
                      onChange={handleChange}
                      placeholder="Escribe la contraseña"
                      className="modal-input"
                    />
                  </Field>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Rol">
                    <select
                      name="rol"
                      value={form.rol}
                      onChange={handleChange}
                      className="modal-input"
                    >
                      {rolesDisponibles.map((rol) => (
                        <option key={rol} value={rol}>
                          {rol}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Estado">
                    <select
                      name="activo"
                      value={String(form.activo)}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          activo: e.target.value === "true",
                        }))
                      }
                      className="modal-input"
                    >
                      <option value="true">Activo</option>
                      <option value="false">Inactivo</option>
                    </select>
                  </Field>
                </div>
              </div>

              <div className="border-t usuarios-border mt-5 pt-4 flex justify-center gap-3">
                <button
                  onClick={cerrarModal}
                  className="h-10 px-6 rounded-xl usuarios-cancel-button border font-medium transition"
                >
                  Cancelar
                </button>

                <button
                  onClick={guardarUsuario}
                  className="h-10 px-6 rounded-xl usuarios-primary-button text-white font-semibold transition"
                >
                  {modoEdicion ? "Guardar Cambios" : "Guardar Usuario"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {modalEliminar && usuarioAEliminar && (
        <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[480px] rounded-[18px] usuarios-modal shadow-[0_20px_60px_rgba(39,33,79,0.18)] border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b usuarios-border">
              <h3 className="text-[18px] font-semibold usuarios-title">
                Confirmar eliminación
              </h3>

              <button
                onClick={cerrarEliminar}
                className="usuarios-muted hover:opacity-80 transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="px-5 py-6 usuarios-title text-sm leading-6">
              <p>
                ¿Eliminar el usuario <span className="font-semibold">{usuarioAEliminar.nombreUsuario}</span>?
              </p>
              <p>Esta acción no se puede deshacer.</p>
            </div>

            <div className="px-5 pb-4 flex justify-end gap-3">
              <button
                onClick={cerrarEliminar}
                className="h-10 px-5 rounded-xl usuarios-cancel-button border font-medium transition"
              >
                Cancelar
              </button>

              <button
                onClick={confirmarEliminar}
                className="h-10 px-5 rounded-xl bg-[#e11d48] text-white font-semibold hover:bg-[#c81e46] transition"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalExito && (
        <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="w-full max-w-[360px] usuarios-modal rounded-[14px] shadow-[0_20px_60px_rgba(39,33,79,0.18)] px-8 py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className="w-14 h-14 rounded-full flex items-center justify-center">
                <Check size={46} className="text-green-600" strokeWidth={2.5} />
              </div>
            </div>

            <h3 className="text-[28px] font-bold usuarios-title leading-none mb-4">
              Éxito
            </h3>

            <p className="usuarios-muted text-[17px] mb-6">
              {mensajeExito}
            </p>

            <button
              onClick={() => setModalExito(false)}
              className="h-10 px-8 rounded-md bg-green-700 text-white font-semibold hover:bg-green-800 transition"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {mensaje && (
        <div className="fixed right-6 bottom-6 z-[60] rounded-2xl usuarios-toast px-5 py-3 shadow-lg">
          {mensaje}
        </div>
      )}

      <style>{usuariosStyles}</style>
    </div>
  )
}

function normalizarRol(roles: any): string {
  if (!roles) return "OPERADOR"

  if (Array.isArray(roles)) {
    const rol = String(roles[0] || "OPERADOR")
    return rol.replace(/^ROLE_/, "").toUpperCase()
  }

  return String(roles).replace(/^ROLE_/, "").toUpperCase()
}

function obtenerIniciales(texto: string) {
  if (!texto) return "U"
  const partes = texto.trim().split(/\s+/)
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase()
  return (partes[0][0] + partes[1][0]).toUpperCase()
}

function badgeRolClass(rol: string) {
  if (rol === "SUPER_ADMIN") {
    return "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[#efeafe] text-[#7f78ff]"
  }

  if (rol === "ADMIN") {
    return "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[#efeafe] text-[#7f78ff]"
  }

  if (rol === "SUPERVISOR") {
    return "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[#fff6df] text-[#d69a10]"
  }

  return "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-[#e9fbf4] text-[#18a96b]"
}

function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div>
      <label className="block text-sm usuarios-title mb-2">{label}</label>
      {children}
    </div>
  )
}

const usuariosStyles = `
  .usuarios-page {
    background: var(--usuarios-page);
    color: var(--usuarios-text);
  }

  .usuarios-title {
    color: var(--usuarios-text);
  }

  .usuarios-muted,
  .usuarios-muted-icon {
    color: var(--usuarios-muted);
  }

  .usuarios-primary-icon {
    color: var(--usuarios-primary);
  }

  .usuarios-border {
    border-color: var(--usuarios-border);
  }

  .usuarios-panel {
    background: var(--usuarios-panel);
    border-color: var(--usuarios-border);
  }

  .usuarios-card,
  .usuarios-modal {
    background: var(--usuarios-card);
    border-color: var(--usuarios-border);
    color: var(--usuarios-text);
  }

  .usuarios-input,
  .modal-input {
    background: var(--usuarios-input);
    border-color: var(--usuarios-border);
    color: var(--usuarios-text);
  }

  .usuarios-input::placeholder,
  .modal-input::placeholder {
    color: var(--usuarios-muted);
  }

  .usuarios-input:focus,
  .modal-input:focus {
    border-color: var(--usuarios-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--usuarios-primary) 18%, transparent);
  }

  .usuarios-primary-button {
    background: var(--usuarios-primary);
  }

  .usuarios-primary-button:hover {
    background: var(--usuarios-primary-hover);
  }

  .usuarios-avatar {
    background: var(--usuarios-primary);
  }

  .usuarios-cancel-button {
    background: transparent;
    border-color: var(--usuarios-border);
    color: var(--usuarios-text);
  }

  .usuarios-cancel-button:hover {
    background: var(--usuarios-input);
  }

  .usuarios-toast {
    background: var(--usuarios-button-dark);
    color: white;
  }

  .modal-input {
    width: 100%;
    height: 44px;
    border: 1px solid var(--usuarios-border);
    border-radius: 12px;
    padding: 0 14px;
    outline: none;
  }
`

export default Usuarios