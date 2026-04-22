import { Client } from "@stomp/stompjs"

let stompClient: Client | null = null

export const connectSocket = (onMessage: (data: any) => void) => {
  if (stompClient?.active) return

  console.log("Intentando conectar WebSocket...")

  const token = localStorage.getItem("token") || ""

  stompClient = new Client({
    brokerURL: "ws://localhost:8080/ws",

    connectHeaders: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},

    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,

    debug: () => {},

    onConnect: () => {
      console.log("WebSocket conectado correctamente")

      stompClient?.subscribe("/topic/productos", (message) => {
        console.log("Evento recibido:", message.body)

        try {
          onMessage(JSON.parse(message.body))
        } catch {
          onMessage(message.body)
        }
      })
    },

    onStompError: () => {
      console.error("Error en STOMP")
    },

    onWebSocketError: () => {
      console.error("Error en WebSocket")
    },

    onWebSocketClose: () => {
      console.warn("WebSocket cerrado")
    },
  })

  stompClient.activate()
}

export const disconnectSocket = () => {
  if (stompClient) {
    stompClient.deactivate()
    stompClient = null
  }
}