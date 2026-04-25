import { Outlet, useLocation, useNavigate } from "react-router-dom"
import {
  LayoutDashboard,
  Boxes,
  ArrowLeftRight,
  Bell,
  FileText,
  Users,
  LogOut,
  MessageCircle,
  Palette,
  Check,
} from "lucide-react"
import { useMemo, useState } from "react"
import { marcarUsuarioOffline } from "../api/chat"
import { appThemes } from "../theme/appTheme"
import type { AppThemeName } from "../theme/appTheme"
import { useAppTheme } from "../theme/AppThemeContext"

function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const token = localStorage.getItem("token") || ""
  const { themeName, theme, setThemeName } = useAppTheme()
  const [selectorTemaAbierto, setSelectorTemaAbierto] = useState(false)

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
  const esOperador = roles.includes("OPERADOR")

  const puedeVerUsuarios = esSuperAdmin || esAdmin
  const puedeVerAlertas = esSuperAdmin || esAdmin || esSupervisor
  const puedeVerReportes = esSuperAdmin || esAdmin || esSupervisor
  const puedeVerChat = esSuperAdmin || esAdmin || esSupervisor || esOperador

  const cerrarSesion = async () => {
    try {
      await marcarUsuarioOffline()
    } catch {
    } finally {
      localStorage.removeItem("token")
      navigate("/", { replace: true })
    }
  }

  const cambiarTema = (nuevoTema: AppThemeName) => {
    setThemeName(nuevoTema)
    setSelectorTemaAbierto(false)
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen flex app-layout">
      <aside className="app-sidebar w-[230px] border-r flex flex-col h-screen sticky top-0">
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-[22px] font-bold app-text">Inventario</h1>

          <div className="mt-3 inline-flex items-center gap-2 text-sm text-[#14a165]">
            <span className="w-2 h-2 rounded-full bg-[#14a165]"></span>
            En línea
          </div>
        </div>

        <div className="px-5 mt-2 text-[11px] font-semibold app-muted">
          PRINCIPAL
        </div>

        <nav className="mt-2 space-y-1 px-2">
          <MenuItem
            icon={<LayoutDashboard size={18} />}
            text="Dashboard"
            active={isActive("/dashboard")}
            onClick={() => navigate("/dashboard")}
          />

          <MenuItem
            icon={<Boxes size={18} />}
            text="Inventario"
            active={isActive("/inventario")}
            onClick={() => navigate("/inventario")}
          />

          <MenuItem
            icon={<ArrowLeftRight size={18} />}
            text="Movimientos"
            active={isActive("/movimientos")}
            onClick={() => navigate("/movimientos")}
          />
        </nav>

        <div className="px-5 mt-5 text-[11px] font-semibold app-muted">
          GESTIÓN
        </div>

        <nav className="mt-2 space-y-1 px-2">
          {puedeVerAlertas && (
            <MenuItem
              icon={<Bell size={18} />}
              text="Alertas"
              active={isActive("/alertas")}
              onClick={() => navigate("/alertas")}
            />
          )}

          {puedeVerReportes && (
            <MenuItem
              icon={<FileText size={18} />}
              text="Reportes"
              active={isActive("/reportes")}
              onClick={() => navigate("/reportes")}
            />
          )}

          {puedeVerUsuarios && (
            <MenuItem
              icon={<Users size={18} />}
              text="Usuarios"
              active={isActive("/usuarios")}
              onClick={() => navigate("/usuarios")}
            />
          )}

          {puedeVerChat && (
            <MenuItem
              icon={<MessageCircle size={18} />}
              text="Chat"
              active={isActive("/chat")}
              onClick={() => navigate("/chat")}
            />
          )}
        </nav>

        <div className="mt-auto p-4">
          <div className="relative mb-3">
            <button
              type="button"
              onClick={() => setSelectorTemaAbierto((prev) => !prev)}
              className="app-theme-button w-full h-10 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition"
            >
              <Palette size={16} />
              Tema: {theme.nombre}
            </button>

            {selectorTemaAbierto && (
              <div className="absolute left-0 right-0 bottom-12 rounded-2xl shadow-xl border overflow-hidden app-theme-menu z-50">
                {(Object.keys(appThemes) as AppThemeName[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => cambiarTema(item)}
                    className="w-full px-4 py-3 text-left text-sm flex items-center justify-between app-theme-option"
                  >
                    <span>{appThemes[item].nombre}</span>
                    {themeName === item && <Check size={15} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-2xl app-user-card p-3 flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full app-avatar text-white flex items-center justify-center font-semibold text-sm">
              {esSuperAdmin ? "SA" : esAdmin ? "AD" : esSupervisor ? "SU" : esOperador ? "OP" : "US"}
            </div>
            <div>
              <p className="text-sm font-semibold app-text">
                {payload?.sub || payload?.subject || "Usuario"}
              </p>
              <p className="text-xs app-muted">
                {esSuperAdmin
                  ? "Super Admin"
                  : esAdmin
                  ? "Administrador"
                  : esSupervisor
                  ? "Supervisor"
                  : esOperador
                  ? "Operador"
                  : "Usuario"}
              </p>
            </div>
          </div>

          <button
            onClick={cerrarSesion}
            className="app-logout-button w-full h-10 rounded-xl border text-sm transition flex items-center justify-center gap-2"
            type="button"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto app-main">
        <Outlet />
      </main>

      <style>{`
        .app-layout {
          background: var(--app-page);
        }

        .app-sidebar {
          background: var(--app-sidebar);
          border-color: var(--app-border);
          color: var(--app-text);
        }

        .app-main {
          background: var(--app-page);
        }

        .app-text {
          color: var(--app-text);
        }

        .app-muted {
          color: var(--app-muted);
        }

        .app-user-card {
          background: var(--app-selected);
        }

        .app-avatar {
          background: var(--app-primary);
        }

        .app-logout-button {
          background: var(--app-sidebar);
          color: var(--app-text);
          border-color: var(--app-border);
        }

        .app-logout-button:hover {
          background: var(--app-selected);
        }

        .app-theme-button {
          background: var(--app-sidebar);
          color: var(--app-text);
          border: 1px solid var(--app-border);
        }

        .app-theme-button:hover {
          background: var(--app-selected);
        }

        .app-theme-menu {
          background: var(--app-sidebar);
          border-color: var(--app-border);
          color: var(--app-text);
        }

        .app-theme-option:hover {
          background: var(--app-selected);
        }

        .app-menu-item {
          color: var(--app-text);
        }

        .app-menu-item svg {
          color: var(--app-text);
        }

        .app-menu-item:hover {
          background: var(--app-selected);
          color: var(--app-primary);
        }

        .app-menu-item.active {
          background: var(--app-selected);
          color: var(--app-primary);
        }
      `}</style>
    </div>
  )
}

function MenuItem({ icon, text, active = false, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className={`app-menu-item w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
        active ? "active font-semibold" : ""
      }`}
      type="button"
    >
      {icon}
      <span>{text}</span>
    </button>
  )
}

export default MainLayout