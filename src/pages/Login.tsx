import { Eye, EyeOff, LogIn, Warehouse } from "lucide-react"
import { useState } from "react"
import type { FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { loginUser } from "../api/auth"

function Login() {
  const [nombreUsuario, setNombreUsuario] = useState("")
  const [password, setPassword] = useState("")
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState("")

  const navigate = useNavigate()

  const passwordValida = password.length >= 8

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()

    setError("")

    if (!nombreUsuario || !password) {
      setError("Por favor complete todos los campos")
      return
    }

    if (!passwordValida) {
      setError("La contraseña debe tener mínimo 8 caracteres")
      return
    }

    try {
      setCargando(true)

      const res = await loginUser({ nombreUsuario, password })

      localStorage.setItem("token", res.token)

      navigate("/dashboard", { replace: true })
    } catch (err: any) {
      const backendMessage =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.response?.data ||
        ""

      const mensaje = String(backendMessage)

      if (mensaje.includes("Usuario inactivo")) {
        setError("Usuario inactivo")
      } else if (mensaje.includes("Usuario no encontrado")) {
        setError("Usuario no encontrado")
      } else if (err?.response?.status === 401) {
        setError("Contraseña incorrecta")
      } else {
        setError("Error al iniciar sesión")
      }
    } finally {
      setCargando(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#dfeaf6] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-sm p-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-blue-600 flex items-center justify-center">
            <Warehouse className="text-white" size={26} />
          </div>

          <div>
            <h1 className="text-3xl font-bold text-slate-900">Nexstock</h1>
            <p className="text-sm text-slate-400">Sistema de Control de Inventario</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-4xl font-bold text-slate-900 mb-2">Bienvenido</h2>
          <p className="text-slate-400 text-lg">Inicia sesión para continuar</p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <input
              type="text"
              placeholder="Usuario*"
              value={nombreUsuario}
              onChange={(e) => setNombreUsuario(e.target.value)}
              className="w-full h-14 rounded-2xl border border-slate-200 px-5 text-base outline-none focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <input
              type={mostrarPassword ? "text" : "password"}
              placeholder="Contraseña*"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full h-14 rounded-2xl border px-5 pr-14 text-base outline-none ${
                password.length === 0
                  ? "border-slate-200"
                  : passwordValida
                  ? "border-green-500"
                  : "border-red-500"
              }`}
            />

            <button
              type="button"
              onClick={() => setMostrarPassword(!mostrarPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"
            >
              {mostrarPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          {error && <div className="text-red-500 text-sm font-medium">{error}</div>}

          <button
            type="submit"
            disabled={cargando || !passwordValida}
            className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 transition text-white font-semibold text-lg flex items-center justify-center gap-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
          >
            <LogIn size={20} />
            {cargando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login