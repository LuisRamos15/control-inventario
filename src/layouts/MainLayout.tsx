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
} from "lucide-react"
import { useMemo } from "react"

function MainLayout() {
  const navigate = useNavigate()
  const location = useLocation()
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

  const cerrarSesion = () => {
    localStorage.removeItem("token")
    navigate("/")
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div className="min-h-screen bg-[#f5f2ff] flex">
      <aside className="w-[230px] bg-white border-r border-[#ece7fb] flex flex-col h-screen sticky top-0">
        <div className="px-5 pt-6 pb-4">
          <h1 className="text-[22px] font-bold text-[#20224a]">Inventario</h1>

          <div className="mt-3 inline-flex items-center gap-2 text-sm text-[#14a165]">
            <span className="w-2 h-2 rounded-full bg-[#14a165]"></span>
            En línea
          </div>
        </div>

        <div className="px-5 mt-2 text-[11px] font-semibold text-[#9ea3bf]">
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

        <div className="px-5 mt-5 text-[11px] font-semibold text-[#9ea3bf]">
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
          <div className="rounded-2xl bg-[#f5f2ff] p-3 flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-[#8f7cf8] text-white flex items-center justify-center font-semibold text-sm">
              {esSuperAdmin ? "SA" : esAdmin ? "AD" : esSupervisor ? "SU" : esOperador ? "OP" : "US"}
            </div>
            <div>
              <p className="text-sm font-semibold text-[#20224a]">
                {payload?.sub || payload?.subject || "Usuario"}
              </p>
              <p className="text-xs text-[#9ea3bf]">
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
            className="w-full h-10 rounded-xl border border-[#ece7fb] text-sm text-[#20224a] hover:bg-[#f5f2ff] transition flex items-center justify-center gap-2"
            type="button"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>
    </div>
  )
}

type MenuItemProps = {
  icon: React.ReactNode
  text: string
  active?: boolean
  onClick?: () => void
}

function MenuItem({ icon, text, active = false, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition ${
        active
          ? "bg-[#efeafe] text-[#7f78ff] font-semibold"
          : "text-[#20224a] hover:bg-[#f5f2ff]"
      }`}
      type="button"
    >
      {icon}
      <span>{text}</span>
    </button>
  )
}

export default MainLayout