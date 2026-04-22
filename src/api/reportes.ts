import axios from "axios"

const API_REPORTES = "http://localhost:8080/api/reportes"
const API_PRODUCTOS = "http://localhost:8080/api/productos"
const API_MOVIMIENTOS = "http://localhost:8080/api/movimientos"

const getHeaders = () => {
  const token = localStorage.getItem("token") || ""
  return {
    Authorization: `Bearer ${token}`,
  }
}

export const getProductosReporte = async () => {
  const res = await axios.get(API_PRODUCTOS, {
    headers: getHeaders(),
  })
  return Array.isArray(res.data) ? res.data : []
}

export const getMovimientosReporte = async () => {
  const res = await axios.get(API_MOVIMIENTOS, {
    headers: getHeaders(),
    params: {
      page: 0,
      size: 200,
      sort: "fecha,asc",
    },
  })

  if (Array.isArray(res.data?.content)) {
    return res.data.content
  }

  return []
}

export const descargarInventarioPdf = async () => {
  const res = await axios.get(`${API_REPORTES}/inventario/pdf`, {
    headers: getHeaders(),
    responseType: "blob",
  })
  return res.data
}

export const descargarInventarioExcel = async () => {
  const res = await axios.get(`${API_REPORTES}/inventario/excel`, {
    headers: getHeaders(),
    responseType: "blob",
  })
  return res.data
}

export const descargarMovimientosPdf = async () => {
  const res = await axios.get(`${API_REPORTES}/movimientos/pdf`, {
    headers: getHeaders(),
    responseType: "blob",
  })
  return res.data
}