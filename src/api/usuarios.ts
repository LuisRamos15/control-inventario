import axios from "axios"

const API_URL = "http://localhost:8080/api/usuarios"

const getHeaders = () => ({
  Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
})

export const getUsuarios = async () => {
  const response = await axios.get(API_URL, {
    headers: getHeaders(),
  })
  return response.data
}

export const getUsuarioById = async (id: string) => {
  const response = await axios.get(`${API_URL}/${id}`, {
    headers: getHeaders(),
  })
  return response.data
}

export const crearUsuario = async (payload: {
  nombreUsuario: string
  password: string
  roles: string[]
}) => {
  const response = await axios.post(API_URL, payload, {
    headers: getHeaders(),
  })
  return response.data
}

export const editarUsuario = async (
  id: string,
  payload: {
    nombreUsuario?: string
    roles?: string[]
    activo?: boolean
  }
) => {
  const response = await axios.patch(`${API_URL}/${id}`, payload, {
    headers: getHeaders(),
  })
  return response.data
}

export const eliminarUsuario = async (id: string) => {
  const response = await axios.delete(`${API_URL}/${id}`, {
    headers: getHeaders(),
  })
  return response.data
}