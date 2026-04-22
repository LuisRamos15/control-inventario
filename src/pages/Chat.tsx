import { useEffect, useMemo, useRef, useState } from "react"
import { MessageCircle, Search, Send } from "lucide-react"
import {
  conectarChatSocket,
  crearChatSocket,
  desconectarChatSocket,
  enviarChatMensaje,
  getChatContactos,
  getChatConversacion,
} from "../api/chat"
import type { ChatContacto, ChatMensaje } from "../types/chat"
import type { Client } from "@stomp/stompjs"

function Chat() {
  const [contactos, setContactos] = useState<ChatContacto[]>([])
  const [contactoSeleccionado, setContactoSeleccionado] = useState<ChatContacto | null>(null)
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [texto, setTexto] = useState("")
  const [cargandoContactos, setCargandoContactos] = useState(true)
  const [cargandoMensajes, setCargandoMensajes] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensajeError, setMensajeError] = useState("")
  const [noLeidos, setNoLeidos] = useState<Record<string, number>>({})

  const socketRef = useRef<Client | null>(null)
  const mensajesRef = useRef<HTMLDivElement | null>(null)
  const pollingRef = useRef<number | null>(null)

  const token = localStorage.getItem("token") || ""

  const decodeJwt = (jwt: string) => {
    try {
      const base64 = jwt.split(".")[1]
      const normalized = base64.replace(/-/g, "+").replace(/_/g, "/")
      const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")
      const decoded = atob(padded)
      return JSON.parse(decoded)
    } catch {
      return null
    }
  }

  const payload = decodeJwt(token)

  const usuarioActual = useMemo(() => {
    return String(
      payload?.sub ||
        payload?.nombreUsuario ||
        payload?.username ||
        payload?.usuario ||
        ""
    ).trim()
  }, [payload])

  const moverContactoArriba = (nombreUsuario: string) => {
    setContactos((prev) => {
      const index = prev.findIndex((c) => c.nombreUsuario === nombreUsuario)
      if (index <= 0) return prev
      const copia = [...prev]
      const [contacto] = copia.splice(index, 1)
      copia.unshift(contacto)
      return copia
    })
  }

  const limpiarNoLeidos = (nombreUsuario: string) => {
    setNoLeidos((prev) => ({
      ...prev,
      [nombreUsuario]: 0,
    }))
  }

  const cargarContactos = async () => {
    try {
      setCargandoContactos(true)
      const data = await getChatContactos()
      setContactos(data)

      if (data.length > 0) {
        setContactoSeleccionado((prev) => {
          if (prev) {
            const encontrado = data.find((c) => c.nombreUsuario === prev.nombreUsuario)
            return encontrado || data[0]
          }
          return data[0]
        })
      } else {
        setContactoSeleccionado(null)
      }
    } catch (error) {
      console.log(error)
      setContactos([])
      setContactoSeleccionado(null)
      setMensajeError("No se pudieron cargar los contactos")
    } finally {
      setCargandoContactos(false)
    }
  }

  const cargarConversacion = async (usuario: string, mostrarCarga = true) => {
    try {
      if (mostrarCarga) {
        setCargandoMensajes(true)
      }

      const data = await getChatConversacion(usuario)

      setMensajes((prev) => {
        if (prev.length === 0) return data

        const prevIds = new Set(prev.map((item) => item.id))
        const sonIguales =
          prev.length === data.length &&
          data.every((item) => prevIds.has(item.id))

        return sonIguales ? prev : data
      })
    } catch (error) {
      console.log(error)
      if (mostrarCarga) {
        setMensajes([])
        setMensajeError("No se pudo cargar la conversación")
      }
    } finally {
      if (mostrarCarga) {
        setCargandoMensajes(false)
      }
    }
  }

  useEffect(() => {
    cargarContactos()
  }, [])

  useEffect(() => {
    if (!contactoSeleccionado) {
      setMensajes([])
      return
    }

    limpiarNoLeidos(contactoSeleccionado.nombreUsuario)
    cargarConversacion(contactoSeleccionado.nombreUsuario, true)

    if (pollingRef.current) {
      window.clearInterval(pollingRef.current)
    }

    pollingRef.current = window.setInterval(() => {
      cargarConversacion(contactoSeleccionado.nombreUsuario, false)
    }, 2000)

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [contactoSeleccionado])

  useEffect(() => {
    const client = crearChatSocket(
      (mensajeRecibido) => {
        const otroUsuario =
          mensajeRecibido.remitente === usuarioActual
            ? mensajeRecibido.destinatario
            : mensajeRecibido.remitente

        moverContactoArriba(otroUsuario)

        const estaAbierto = contactoSeleccionado?.nombreUsuario === otroUsuario

        if (!estaAbierto && mensajeRecibido.remitente !== usuarioActual) {
          setNoLeidos((prev) => ({
            ...prev,
            [otroUsuario]: (prev[otroUsuario] || 0) + 1,
          }))
        }

        const perteneceAConversacion =
          contactoSeleccionado &&
          (
            (mensajeRecibido.remitente === contactoSeleccionado.nombreUsuario &&
              mensajeRecibido.destinatario === usuarioActual) ||
            (mensajeRecibido.remitente === usuarioActual &&
              mensajeRecibido.destinatario === contactoSeleccionado.nombreUsuario)
          )

        if (!perteneceAConversacion) {
          return
        }

        setMensajes((prev) => {
          const existe = prev.some((item) => item.id === mensajeRecibido.id)
          if (existe) return prev
          return [...prev, mensajeRecibido]
        })
      },
      undefined,
      (error) => {
        console.log(error)
      }
    )

    socketRef.current = client
    conectarChatSocket(client)

    return () => {
      desconectarChatSocket(socketRef.current)
      socketRef.current = null
    }
  }, [contactoSeleccionado, usuarioActual])

  useEffect(() => {
    if (!mensajeError) return
    const timer = setTimeout(() => setMensajeError(""), 2500)
    return () => clearTimeout(timer)
  }, [mensajeError])

  useEffect(() => {
    if (!mensajesRef.current) return
    mensajesRef.current.scrollTop = mensajesRef.current.scrollHeight
  }, [mensajes])

  const contactosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()

    if (!q) return contactos

    return contactos.filter((contacto) => {
      const nombre = contacto.nombreUsuario.toLowerCase()
      const rol = contacto.rol.toLowerCase()
      return nombre.includes(q) || rol.includes(q)
    })
  }, [contactos, busqueda])

  const enviar = async () => {
    if (!contactoSeleccionado) return

    const mensaje = texto.trim()

    if (!mensaje) return

    try {
      setEnviando(true)

      const guardado = await enviarChatMensaje({
        destinatario: contactoSeleccionado.nombreUsuario,
        mensaje,
      })

      setMensajes((prev) => {
        const existe = prev.some((item) => item.id === guardado.id)
        if (existe) return prev
        return [...prev, guardado]
      })

      moverContactoArriba(contactoSeleccionado.nombreUsuario)
      setTexto("")

      await cargarConversacion(contactoSeleccionado.nombreUsuario, false)
    } catch (error) {
      console.log(error)
      setMensajeError("No se pudo enviar el mensaje")
    } finally {
      setEnviando(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await enviar()
  }

  return (
    <div className="p-6 bg-[#f5f2ff] min-h-screen">
      <div className="flex items-center gap-2 mb-5">
        <MessageCircle size={20} className="text-[#7f78ff]" />
        <h1 className="text-[32px] font-bold text-[#20224a] leading-none">
          Chat Interno
        </h1>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-5 h-[calc(100vh-170px)]">
        <section className="bg-white rounded-[28px] border border-[#ece7fb] flex flex-col overflow-hidden">
          <div className="p-5 border-b border-[#f0ebfc]">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ea3bf]"
              />
              <input
                type="text"
                placeholder="Buscar usuario o rol..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full h-11 rounded-2xl bg-[#f8f6ff] border border-[#ece7fb] pl-10 pr-4 text-sm text-[#20224a] outline-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cargandoContactos ? (
              <div className="h-full flex items-center justify-center text-[#9ea3bf] text-sm">
                Cargando contactos...
              </div>
            ) : contactosFiltrados.length === 0 ? (
              <div className="h-full flex items-center justify-center text-[#9ea3bf] text-sm text-center px-4">
                No hay usuarios disponibles para chatear
              </div>
            ) : (
              contactosFiltrados.map((contacto) => {
                const seleccionado = contactoSeleccionado?.nombreUsuario === contacto.nombreUsuario
                const cantidadNoLeidos = noLeidos[contacto.nombreUsuario] || 0

                return (
                  <button
                    key={contacto.id}
                    onClick={() => setContactoSeleccionado(contacto)}
                    className={`w-full text-left rounded-2xl px-4 py-3 transition border ${
                      seleccionado
                        ? "bg-[#f3efff] border-[#dcd2ff]"
                        : "bg-white border-transparent hover:bg-[#faf8ff]"
                    }`}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold text-[#20224a] truncate">
                          {contacto.nombreUsuario}
                        </div>
                        <div className="text-xs text-[#8f95b2] mt-1">
                          {contacto.rol}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {cantidadNoLeidos > 0 && (
                          <span className="min-w-5 h-5 px-1 rounded-full bg-[#8f7cf8] text-white text-[11px] font-semibold flex items-center justify-center">
                            {cantidadNoLeidos}
                          </span>
                        )}

                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            contacto.activo ? "bg-[#20a464]" : "bg-[#d1d5db]"
                          }`}
                        ></span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="bg-white rounded-[28px] border border-[#ece7fb] flex flex-col overflow-hidden">
          {contactoSeleccionado ? (
            <>
              <div className="px-6 py-5 border-b border-[#f0ebfc]">
                <div className="font-bold text-[20px] text-[#20224a]">
                  {contactoSeleccionado.nombreUsuario}
                </div>
                <div className="text-sm text-[#8f95b2] mt-1">
                  {contactoSeleccionado.rol}
                </div>
              </div>

              <div
                ref={mensajesRef}
                className="flex-1 overflow-y-auto px-6 py-5 bg-[#fcfbff]"
              >
                {cargandoMensajes ? (
                  <div className="h-full flex items-center justify-center text-[#9ea3bf] text-sm">
                    Cargando conversación...
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-[#9ea3bf] text-sm text-center">
                    No hay mensajes aún. Inicia la conversación.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mensajes.map((item) => {
                      const esMio = item.remitente === usuarioActual

                      return (
                        <div
                          key={item.id}
                          className={`flex ${esMio ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                              esMio
                                ? "bg-[#8f7cf8] text-white"
                                : "bg-white border border-[#ece7fb] text-[#20224a]"
                            }`}
                          >
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {item.mensaje}
                            </div>
                            <div
                              className={`text-[11px] mt-2 ${
                                esMio ? "text-[#e9e5ff]" : "text-[#9ea3bf]"
                              }`}
                            >
                              {formatearHora(item.fecha)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleSubmit}
                className="px-6 py-4 border-t border-[#f0ebfc] bg-white"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="flex-1 h-12 rounded-2xl border border-[#e5defa] px-4 text-sm text-[#20224a] outline-none"
                  />

                  <button
                    type="submit"
                    disabled={enviando || !texto.trim()}
                    className="h-12 px-5 rounded-2xl bg-[#8f7cf8] text-white font-semibold flex items-center gap-2 hover:bg-[#7e69f6] transition disabled:opacity-60"
                  >
                    <Send size={16} />
                    Enviar
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full flex items-center justify-center text-center px-6">
              <div>
                <div className="flex justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-[#f3efff] flex items-center justify-center">
                    <MessageCircle size={26} className="text-[#7f78ff]" />
                  </div>
                </div>
                <div className="text-[20px] font-bold text-[#20224a] mb-2">
                  Selecciona una conversación
                </div>
                <div className="text-sm text-[#8f95b2]">
                  Elige un usuario disponible para comenzar a chatear.
                </div>
              </div>
            </div>
          )}
        </section>
      </div>

      {mensajeError && (
        <div className="fixed right-6 bottom-6 z-[60] rounded-2xl bg-[#20224a] text-white px-5 py-3 shadow-lg">
          {mensajeError}
        </div>
      )}
    </div>
  )
}

function formatearHora(fecha: string) {
  if (!fecha) return ""

  const valor = new Date(fecha)

  if (isNaN(valor.getTime())) {
    return ""
  }

  return valor.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default Chat