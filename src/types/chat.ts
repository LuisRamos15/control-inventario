export type ChatContacto = {
  id: string
  nombreUsuario: string
  rol: string
  activo: boolean
}

export type ChatMensaje = {
  id: string
  remitente: string
  destinatario: string
  mensaje: string
  fecha: string
  leido: boolean
}

export type ChatReq = {
  destinatario: string
  mensaje: string
}