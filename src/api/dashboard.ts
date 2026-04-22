import axios from "axios"

const API_URL = "http://localhost:8080/api"

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
})

export const getResumenDashboard = async () => {
  const response = await axios.get(`${API_URL}/dashboard/resumen`, {
    headers: getHeaders(),
  })
  return response.data
}

export const getMovimientosPorDiaDashboard = async () => {
  const response = await axios.get(`${API_URL}/dashboard/movimientos-por-dia`, {
    headers: getHeaders(),
  })
  return response.data
}

export const getTopProductosDashboard = async () => {
  const response = await axios.get(`${API_URL}/dashboard/top-productos`, {
    headers: getHeaders(),
    params: { limit: 5 },
  })
  return response.data
}

export const getAlertasDashboard = async () => {
  try {
    const response = await axios.get(`${API_URL}/dashboard/alertas`, {
      headers: getHeaders(),
      params: { limit: 10 },
    })
    return response.data
  } catch (error: any) {
    if (error?.response?.status === 403 || error?.response?.status === 401) {
      return []
    }
    throw error
  }
}