import axios from "axios"
import { Client } from "@stomp/stompjs"
import type { ChatContacto, ChatMensaje, ChatReq } from "../types/chat"

const API_CHAT = "http://localhost:8080/api/chat"
const WS_CHAT = "ws://localhost:8080/ws-chat"

const getToken = () => localStorage.getItem("token") || ""

const getHeaders = () => {
  return {
    Authorization: `Bearer ${getToken()}`,
  }
}

export const getChatContactos = async (): Promise<ChatContacto[]> => {
  const res = await axios.get(`${API_CHAT}/contactos`, {
    headers: getHeaders(),
  })
  return Array.isArray(res.data) ? res.data : []
}

export const getChatConversacion = async (usuario: string): Promise<ChatMensaje[]> => {
  const res = await axios.get(`${API_CHAT}/conversacion/${encodeURIComponent(usuario)}`, {
    headers: getHeaders(),
  })
  return Array.isArray(res.data) ? res.data : []
}

export const enviarChatMensaje = async (data: ChatReq): Promise<ChatMensaje> => {
  const res = await axios.post(`${API_CHAT}/enviar`, data, {
    headers: {
      ...getHeaders(),
      "Content-Type": "application/json",
    },
  })
  return res.data
}

export const puedeChatearCon = async (usuario: string): Promise<boolean> => {
  const res = await axios.get(`${API_CHAT}/permiso/${encodeURIComponent(usuario)}`, {
    headers: getHeaders(),
  })
  return Boolean(res.data)
}

export const crearChatSocket = (
  onMensaje: (mensaje: ChatMensaje) => void,
  onConnect?: () => void,
  onError?: (error: unknown) => void
) => {
  const client = new Client({
    brokerURL: WS_CHAT,
    connectHeaders: {
      Authorization: `Bearer ${getToken()}`,
    },
    reconnectDelay: 5000,
    onConnect: () => {
      client.subscribe("/user/queue/mensajes", (message) => {
        try {
          const body = JSON.parse(message.body) as ChatMensaje
          onMensaje(body)
        } catch (error) {
          if (onError) onError(error)
        }
      })

      if (onConnect) onConnect()
    },
    onStompError: (frame) => {
      if (onError) onError(frame)
    },
    onWebSocketError: (event) => {
      if (onError) onError(event)
    },
  })

  return client
}

export const conectarChatSocket = (client: Client) => {
  if (!client.active) {
    client.activate()
  }
}

export const desconectarChatSocket = (client: Client | null) => {
  if (client && client.active) {
    client.deactivate()
  }
}

export const enviarChatMensajeWs = (client: Client, data: ChatReq) => {
  if (!client.active) return

  client.publish({
    destination: "/app/chat.enviar",
    body: JSON.stringify(data),
  })
}