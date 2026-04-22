import type { ReactNode } from "react"
import { Navigate } from "react-router-dom"

type Rol = "SUPER_ADMIN" | "ADMIN" | "SUPERVISOR" | "OPERADOR"

type ProtectedRouteProps = {
  children: ReactNode
  allowedRoles?: Rol[]
}

type JwtPayload = {
  sub?: string
  rol?: string
  role?: string
  roles?: string[] | string
  authorities?: string[] | string
  exp?: number
}

const TOKEN_KEY = "token"

function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1]
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/")
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => `%${("00" + c.charCodeAt(0).toString(16)).slice(-2)}`)
        .join("")
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

function normalizeRole(value: string): Rol | null {
  const clean = value.replace(/^ROLE_/, "").trim().toUpperCase()
  if (
    clean === "SUPER_ADMIN" ||
    clean === "ADMIN" ||
    clean === "SUPERVISOR" ||
    clean === "OPERADOR"
  ) {
    return clean
  }
  return null
}

function extractRoles(payload: JwtPayload | null): Rol[] {
  if (!payload) return []

  const candidates: string[] = []

  if (typeof payload.rol === "string") candidates.push(payload.rol)
  if (typeof payload.role === "string") candidates.push(payload.role)

  if (Array.isArray(payload.roles)) {
    candidates.push(...payload.roles)
  } else if (typeof payload.roles === "string") {
    candidates.push(payload.roles)
  }

  if (Array.isArray(payload.authorities)) {
    candidates.push(...payload.authorities)
  } else if (typeof payload.authorities === "string") {
    candidates.push(payload.authorities)
  }

  const normalized = candidates
    .flatMap((item) => item.split(","))
    .map((item) => normalizeRole(item))
    .filter((item): item is Rol => item !== null)

  return Array.from(new Set(normalized))
}

function isTokenExpired(payload: JwtPayload | null): boolean {
  if (!payload?.exp) return true
  const now = Math.floor(Date.now() / 1000)
  return payload.exp < now
}

export default function ProtectedRoute({
  children,
  allowedRoles = [],
}: ProtectedRouteProps) {
  const token = localStorage.getItem(TOKEN_KEY)

  if (!token) {
    return <Navigate to="/login" replace />
  }

  const payload = parseJwt(token)

  if (!payload || isTokenExpired(payload)) {
    localStorage.removeItem(TOKEN_KEY)
    return <Navigate to="/login" replace />
  }

  const userRoles = extractRoles(payload)

  if (userRoles.length === 0) {
    localStorage.removeItem(TOKEN_KEY)
    return <Navigate to="/login" replace />
  }

  if (allowedRoles.length > 0) {
    const hasAccess = userRoles.some((role) => allowedRoles.includes(role))
    if (!hasAccess) {
      return <Navigate to="/dashboard" replace />
    }
  }

  return <>{children}</>
}