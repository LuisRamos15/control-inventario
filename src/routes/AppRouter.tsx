import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"
import Login from "../pages/Login"
import Dashboard from "../pages/Dashboard"
import Inventario from "../pages/Inventario"
import Movimientos from "../pages/Movimientos"
import Alertas from "../pages/Alertas"
import Usuarios from "../pages/Usuarios"
import Reportes from "../pages/Reportes"
import Chat from "../pages/Chat"
import ProtectedRoute from "./ProtectedRoute"
import PublicRoute from "./PublicRoute"
import MainLayout from "../layouts/MainLayout"

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/movimientos" element={<Movimientos />} />
          <Route
            path="/alertas"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]}>
                <Alertas />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reportes"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "SUPERVISOR"]}>
                <Reportes />
              </ProtectedRoute>
            }
          />
          <Route
            path="/usuarios"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN"]}>
                <Usuarios />
              </ProtectedRoute>
            }
          />
          <Route
            path="/chat"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN", "ADMIN", "SUPERVISOR", "OPERADOR"]}>
                <Chat />
              </ProtectedRoute>
            }
          />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AppRouter