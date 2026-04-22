import { Navigate } from "react-router-dom"

type Props = {
  children: React.ReactNode
}

function PublicRoute({ children }: Props) {
  const token = localStorage.getItem("token")

  if (token) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default PublicRoute