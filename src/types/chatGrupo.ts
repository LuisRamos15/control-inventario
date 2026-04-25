export type ChatGrupoMiembro = {
  nombreUsuario: string
  rolGrupo: string
  fechaAgregado: string
  activo: boolean
}

export type ChatGrupo = {
  id: string
  nombre: string
  descripcion: string
  creadoPor: string
  fechaCreacion: string
  activo: boolean
  soyAdminGrupo: boolean
  miembros: ChatGrupoMiembro[]
}

export type ChatGrupoReq = {
  nombre: string
  descripcion: string
  miembros: string[]
}

export type ChatGrupoMensaje = {
  id: string
  grupoId: string
  remitente: string
  mensaje: string
  fecha: string
  activo: boolean
}

export type ChatGrupoMensajeReq = {
  mensaje: string
}