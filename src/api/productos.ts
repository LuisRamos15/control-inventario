import axios from "axios"
import type { Producto } from "../types/producto"

const API_URL = "http://localhost:8080/api"

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
})

export const getProductos = async (): Promise<Producto[]> => {
  const response = await axios.get(`${API_URL}/productos`, {
    headers: getHeaders(),
  })
  return response.data
}

export const buscarProductos = async (q: string): Promise<Producto[]> => {
  const response = await axios.get(`${API_URL}/productos/search`, {
    headers: getHeaders(),
    params: {
      q,
      page: 0,
      size: 50,
    },
  })

  return response.data?.content ?? []
}

export const eliminarProducto = async (id: string) => {
  const response = await axios.delete(`${API_URL}/productos/${id}`, {
    headers: getHeaders(),
  })
  return response.data
}