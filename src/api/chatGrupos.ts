import axios from "axios"
import type {
  ChatGrupo,
  ChatGrupoMensaje,
  ChatGrupoMensajeReq,
  ChatGrupoReq,
} from "../types/chatGrupo"

const API_GRUPOS = "http://localhost:8080/api/chat/grupos"

const getHeaders = () => {
  const token = localStorage.getItem("token") || ""

  return {
    Authorization: `Bearer ${token}`,
  }
}

export const crearChatGrupo = async (data: ChatGrupoReq): Promise<ChatGrupo> => {
  const res = await axios.post(API_GRUPOS, data, {
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json",
    },
  })

  return res.data
}

export const listarMisChatGrupos = async (): Promise<ChatGrupo[]> => {
  const res = await axios.get(API_GRUPOS, {
    headers: getHeaders(),
  })

  return Array.isArray(res.data) ? res.data : []
}

export const getChatGrupoMensajes = async (
  grupoId: string
): Promise<ChatGrupoMensaje[]> => {
  const res = await axios.get(`${API_GRUPOS}/${encodeURIComponent(grupoId)}/mensajes`, {
    headers: getHeaders(),
  })

  return Array.isArray(res.data) ? res.data : []
}

export const enviarChatGrupoMensaje = async (
  grupoId: string,
  data: ChatGrupoMensajeReq
): Promise<ChatGrupoMensaje> => {
  const res = await axios.post(
    `${API_GRUPOS}/${encodeURIComponent(grupoId)}/mensajes`,
    data,
    {
      headers: {
        ...getHeaders(),
        "Content-Type": "application/json",
      },
    }
  )

  return res.data
}