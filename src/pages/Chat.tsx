import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { MessageCircle, Search, Send, Plus, Users } from "lucide-react"
import {
  conectarChatSocket,
  crearChatSocket,
  desconectarChatSocket,
  enviarChatMensaje,
  getChatContactos,
  getChatConversacion,
  getUsuariosOnline,
  marcarUsuarioOffline,
  marcarUsuarioOnline,
} from "../api/chat"
import {
  crearChatGrupo,
  enviarChatGrupoMensaje,
  getChatGrupoMensajes,
  listarMisChatGrupos,
} from "../api/chatGrupos"
import type { ChatContacto, ChatMensaje } from "../types/chat"
import type { ChatGrupo, ChatGrupoMensaje, ChatGrupoReq } from "../types/chatGrupo"
import type { Client, StompSubscription } from "@stomp/stompjs"
import { useAppTheme } from "../theme/AppThemeContext"

function Chat() {
  const [contactos, setContactos] = useState<ChatContacto[]>([])
  const [contactoSeleccionado, setContactoSeleccionado] = useState<ChatContacto | null>(null)
  const [mensajes, setMensajes] = useState<ChatMensaje[]>([])
  const [mensajesGrupo, setMensajesGrupo] = useState<ChatGrupoMensaje[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [texto, setTexto] = useState("")
  const [cargandoContactos, setCargandoContactos] = useState(true)
  const [cargandoMensajes, setCargandoMensajes] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensajeError, setMensajeError] = useState("")
  const [noLeidos, setNoLeidos] = useState<Record<string, number>>({})
  const [noLeidosGrupos, setNoLeidosGrupos] = useState<Record<string, number>>({})
  const [usuariosOnline, setUsuariosOnline] = useState<Set<string>>(new Set())

  const [vistaChat, setVistaChat] = useState<"usuarios" | "grupos">("usuarios")
  const [grupos, setGrupos] = useState<ChatGrupo[]>([])
  const [grupoSeleccionado, setGrupoSeleccionado] = useState<ChatGrupo | null>(null)
  const [cargandoGrupos, setCargandoGrupos] = useState(false)
  const [modalGrupoAbierto, setModalGrupoAbierto] = useState(false)
  const [creandoGrupo, setCreandoGrupo] = useState(false)

  const [nuevoGrupo, setNuevoGrupo] = useState<ChatGrupoReq>({
    nombre: "",
    descripcion: "",
    miembros: [],
  })

  const socketRef = useRef<Client | null>(null)
  const mensajesRef = useRef<HTMLDivElement | null>(null)
  const pollingRef = useRef<number | null>(null)
  const presenciaRef = useRef<number | null>(null)
  const contactoSeleccionadoRef = useRef<ChatContacto | null>(null)
  const grupoSeleccionadoRef = useRef<ChatGrupo | null>(null)
  const gruposRef = useRef<ChatGrupo[]>([])
  const usuarioActualRef = useRef("")
  const mensajesProcesadosRef = useRef<Set<string>>(new Set())
  const mensajesGrupoProcesadosRef = useRef<Set<string>>(new Set())
  const suscripcionesGruposRef = useRef<Map<string, StompSubscription>>(new Map())
  const suscripcionNuevosGruposRef = useRef<StompSubscription | null>(null)
  const usuarioEstaAlFinalRef = useRef(true)
  const forzarBajarAlFinalRef = useRef(false)

  const token = localStorage.getItem("token") || ""
  const { theme } = useAppTheme()

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

  useEffect(() => {
    usuarioActualRef.current = usuarioActual
  }, [usuarioActual])

  useEffect(() => {
    contactoSeleccionadoRef.current = contactoSeleccionado
  }, [contactoSeleccionado])

  useEffect(() => {
    grupoSeleccionadoRef.current = grupoSeleccionado
  }, [grupoSeleccionado])

  useEffect(() => {
    gruposRef.current = grupos
  }, [grupos])

  const rolActual = useMemo(() => {
    const valores: string[] = []

    if (payload?.rol) valores.push(String(payload.rol))
    if (payload?.role) valores.push(String(payload.role))
    if (payload?.authority) valores.push(String(payload.authority))

    if (Array.isArray(payload?.roles)) {
      payload.roles.forEach((item: unknown) => {
        if (typeof item === "string") valores.push(item)
        if (typeof item === "object" && item !== null && "authority" in item) {
          valores.push(String((item as { authority: string }).authority))
        }
      })
    }

    if (Array.isArray(payload?.authorities)) {
      payload.authorities.forEach((item: unknown) => {
        if (typeof item === "string") valores.push(item)
        if (typeof item === "object" && item !== null && "authority" in item) {
          valores.push(String((item as { authority: string }).authority))
        }
      })
    }

    const rolDesdeContacto = contactos.find(
      (contacto) => contacto.nombreUsuario === usuarioActual
    )?.rol

    if (rolDesdeContacto) valores.push(rolDesdeContacto)

    const normalizados = valores.map((valor) =>
      valor.replace("ROLE_", "").trim().toUpperCase()
    )

    if (normalizados.includes("SUPER_ADMIN")) return "SUPER_ADMIN"
    if (normalizados.includes("ADMIN")) return "ADMIN"
    if (normalizados.includes("SUPERVISOR")) return "SUPERVISOR"
    if (normalizados.includes("OPERADOR")) return "OPERADOR"

    return ""
  }, [payload, contactos, usuarioActual])

  const puedeCrearGrupo = rolActual === "SUPER_ADMIN" || rolActual === "ADMIN"

  const usuarioEstaCercaDelFinal = () => {
    const contenedor = mensajesRef.current
    if (!contenedor) return true

    const distanciaFinal =
      contenedor.scrollHeight - contenedor.scrollTop - contenedor.clientHeight

    return distanciaFinal < 120
  }

  const actualizarEstadoScroll = () => {
    usuarioEstaAlFinalRef.current = usuarioEstaCercaDelFinal()
  }

  const bajarAlFinal = () => {
    const contenedor = mensajesRef.current
    if (!contenedor) return

    requestAnimationFrame(() => {
      contenedor.scrollTop = contenedor.scrollHeight

      requestAnimationFrame(() => {
        contenedor.scrollTop = contenedor.scrollHeight
        usuarioEstaAlFinalRef.current = true
      })
    })
  }

  const bajarSiCorresponde = () => {
    if (forzarBajarAlFinalRef.current || usuarioEstaAlFinalRef.current) {
      bajarAlFinal()
      forzarBajarAlFinalRef.current = false
    }
  }

  const prepararEntradaAlChat = () => {
    usuarioEstaAlFinalRef.current = true
    forzarBajarAlFinalRef.current = true
  }

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

  const moverGrupoArriba = (grupoId: string) => {
    setGrupos((prev) => {
      const index = prev.findIndex((g) => g.id === grupoId)
      if (index <= 0) return prev
      const copia = [...prev]
      const [grupo] = copia.splice(index, 1)
      copia.unshift(grupo)
      return copia
    })
  }

  const agregarGrupoSiNoExiste = (grupo: ChatGrupo) => {
    setGrupos((prev) => {
      const existe = prev.some((g) => g.id === grupo.id)
      if (existe) return prev
      return [grupo, ...prev]
    })
  }

  const limpiarNoLeidos = (nombreUsuario: string) => {
    setNoLeidos((prev) => ({
      ...prev,
      [nombreUsuario]: 0,
    }))
  }

  const limpiarNoLeidosGrupo = (grupoId: string) => {
    setNoLeidosGrupos((prev) => ({
      ...prev,
      [grupoId]: 0,
    }))
  }

  const cerrarChatAbierto = () => {
    setContactoSeleccionado(null)
    setGrupoSeleccionado(null)
    setMensajes([])
    setMensajesGrupo([])
    setTexto("")
    usuarioEstaAlFinalRef.current = true
    forzarBajarAlFinalRef.current = false

    if (pollingRef.current) {
      window.clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const cargarContactos = async () => {
    try {
      setCargandoContactos(true)
      const data = await getChatContactos()
      setContactos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.log(error)
      setContactos([])
      setMensajeError("No se pudieron cargar los contactos")
    } finally {
      setCargandoContactos(false)
    }
  }

  const cargarGrupos = async () => {
    try {
      setCargandoGrupos(true)
      const data = await listarMisChatGrupos()
      setGrupos(Array.isArray(data) ? data : [])
    } catch (error) {
      console.log(error)
      setGrupos([])
      setMensajeError("No se pudieron cargar los grupos")
    } finally {
      setCargandoGrupos(false)
    }
  }

  const cargarUsuariosOnline = async () => {
    try {
      const data = await getUsuariosOnline()
      setUsuariosOnline(new Set(Array.isArray(data) ? data : []))
    } catch (error) {
      console.log(error)
    }
  }

  const marcarConectado = async () => {
    try {
      const data = await marcarUsuarioOnline()
      setUsuariosOnline(new Set(Array.isArray(data) ? data : []))
    } catch (error) {
      console.log(error)
    }
  }

  const cargarConversacion = async (usuario: string, mostrarCarga = true) => {
    try {
      if (mostrarCarga) {
        prepararEntradaAlChat()
        setCargandoMensajes(true)
      }

      const data = await getChatConversacion(usuario)
      setMensajes(Array.isArray(data) ? data : [])
    } catch (error) {
      console.log(error)
      if (mostrarCarga) {
        setMensajes([])
        setMensajeError("No se pudo cargar la conversación")
      }
    } finally {
      if (mostrarCarga) setCargandoMensajes(false)
    }
  }

  const cargarMensajesGrupo = async (grupoId: string, mostrarCarga = true) => {
    try {
      if (mostrarCarga) {
        prepararEntradaAlChat()
        setCargandoMensajes(true)
      }

      const data = await getChatGrupoMensajes(grupoId)
      setMensajesGrupo(Array.isArray(data) ? data : [])
    } catch (error) {
      console.log(error)
      if (mostrarCarga) {
        setMensajesGrupo([])
        setMensajeError("No se pudieron cargar los mensajes del grupo")
      }
    } finally {
      if (mostrarCarga) setCargandoMensajes(false)
    }
  }

  const limpiarSuscripcionesGrupos = () => {
    suscripcionesGruposRef.current.forEach((sub) => {
      try {
        sub.unsubscribe()
      } catch {}
    })
    suscripcionesGruposRef.current.clear()
  }

  const suscribirANuevosGrupos = () => {
    const client = socketRef.current
    const actual = usuarioActualRef.current
    if (!client || !client.connected || !actual) return

    try {
      if (suscripcionNuevosGruposRef.current) {
        suscripcionNuevosGruposRef.current.unsubscribe()
      }
    } catch {}

    suscripcionNuevosGruposRef.current = client.subscribe(
      `/topic/chat/grupos/${actual}`,
      (message) => {
        try {
          const grupo = JSON.parse(message.body) as ChatGrupo
          agregarGrupoSiNoExiste(grupo)
          setVistaChat("grupos")
          setTimeout(() => {
            suscribirAGrupos()
          }, 100)
        } catch (error) {
          console.log(error)
        }
      }
    )
  }

  const suscribirAGrupos = () => {
    const client = socketRef.current
    if (!client || !client.connected) return

    gruposRef.current.forEach((grupo) => {
      if (!grupo.id) return
      if (suscripcionesGruposRef.current.has(grupo.id)) return

      const sub = client.subscribe(`/topic/chat/grupo/${grupo.id}`, (message) => {
        try {
          const body = JSON.parse(message.body) as ChatGrupoMensaje
          const grupoId = body.grupoId || grupo.id
          const idMensaje = body.id || `${grupoId}-${body.remitente}-${body.fecha}-${body.mensaje}`

          if (mensajesGrupoProcesadosRef.current.has(idMensaje)) return
          mensajesGrupoProcesadosRef.current.add(idMensaje)

          const actual = usuarioActualRef.current
          const abierto = grupoSeleccionadoRef.current
          const esMio = body.remitente === actual
          const estaAbierto = abierto?.id === grupoId

          moverGrupoArriba(grupoId)

          if (!estaAbierto && !esMio) {
            setNoLeidosGrupos((prev) => ({
              ...prev,
              [grupoId]: (prev[grupoId] || 0) + 1,
            }))
          }

          if (estaAbierto) {
            if (esMio || usuarioEstaAlFinalRef.current) {
              forzarBajarAlFinalRef.current = true
            }

            setMensajesGrupo((prev) => {
              const existe = prev.some((item) => item.id === body.id)
              if (existe) return prev
              return [...prev, body]
            })
          }
        } catch (error) {
          console.log(error)
        }
      })

      suscripcionesGruposRef.current.set(grupo.id, sub)
    })
  }

  useEffect(() => {
    cargarContactos()
    cargarGrupos()
    marcarConectado()
    cargarUsuariosOnline()

    presenciaRef.current = window.setInterval(() => {
      marcarConectado()
      cargarUsuariosOnline()
    }, 5000)

    const handleBeforeUnload = () => {
      marcarUsuarioOffline()
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      marcarUsuarioOffline()
      window.removeEventListener("beforeunload", handleBeforeUnload)

      if (presenciaRef.current) {
        window.clearInterval(presenciaRef.current)
        presenciaRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !modalGrupoAbierto) {
        cerrarChatAbierto()
      }
    }

    window.addEventListener("keydown", handleEscape)

    return () => {
      window.removeEventListener("keydown", handleEscape)
    }
  }, [modalGrupoAbierto])

  useEffect(() => {
    if (!contactoSeleccionado) {
      setMensajes([])
      return
    }

    prepararEntradaAlChat()
    limpiarNoLeidos(contactoSeleccionado.nombreUsuario)
    cargarConversacion(contactoSeleccionado.nombreUsuario, true)

    if (pollingRef.current) window.clearInterval(pollingRef.current)

    pollingRef.current = window.setInterval(() => {
      cargarConversacion(contactoSeleccionado.nombreUsuario, false)
    }, 2500)

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [contactoSeleccionado])

  useEffect(() => {
    if (!grupoSeleccionado) {
      setMensajesGrupo([])
      return
    }

    prepararEntradaAlChat()
    limpiarNoLeidosGrupo(grupoSeleccionado.id)
    cargarMensajesGrupo(grupoSeleccionado.id, true)

    if (pollingRef.current) window.clearInterval(pollingRef.current)

    pollingRef.current = window.setInterval(() => {
      cargarMensajesGrupo(grupoSeleccionado.id, false)
    }, 2500)

    return () => {
      if (pollingRef.current) {
        window.clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [grupoSeleccionado])

  useEffect(() => {
    const client = crearChatSocket(
      (mensajeRecibido) => {
        const idMensaje =
          mensajeRecibido.id ||
          `${mensajeRecibido.remitente}-${mensajeRecibido.destinatario}-${mensajeRecibido.fecha}-${mensajeRecibido.mensaje}`

        if (mensajesProcesadosRef.current.has(idMensaje)) return
        mensajesProcesadosRef.current.add(idMensaje)

        const actual = usuarioActualRef.current
        const abierto = contactoSeleccionadoRef.current

        const otroUsuario =
          mensajeRecibido.remitente === actual
            ? mensajeRecibido.destinatario
            : mensajeRecibido.remitente

        moverContactoArriba(otroUsuario)

        const estaAbierto = abierto?.nombreUsuario === otroUsuario
        const esMio = mensajeRecibido.remitente === actual

        if (!estaAbierto && !esMio) {
          setNoLeidos((prev) => ({
            ...prev,
            [otroUsuario]: (prev[otroUsuario] || 0) + 1,
          }))
        }

        if (estaAbierto) {
          if (esMio || usuarioEstaAlFinalRef.current) {
            forzarBajarAlFinalRef.current = true
          }

          setMensajes((prev) => {
            const existe = prev.some((item) => item.id === mensajeRecibido.id)
            if (existe) return prev
            return [...prev, mensajeRecibido]
          })
        }
      },
      () => {
        marcarConectado()
        cargarUsuariosOnline()
        setTimeout(() => {
          suscribirANuevosGrupos()
          suscribirAGrupos()
        }, 400)
      },
      (error) => {
        console.log(error)
      }
    )

    socketRef.current = client
    conectarChatSocket(client)

    return () => {
      limpiarSuscripcionesGrupos()

      try {
        if (suscripcionNuevosGruposRef.current) {
          suscripcionNuevosGruposRef.current.unsubscribe()
        }
      } catch {}

      desconectarChatSocket(socketRef.current)
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    gruposRef.current = grupos
    suscribirAGrupos()
  }, [grupos.length])

  useEffect(() => {
    suscribirANuevosGrupos()
  }, [usuarioActual])

  useEffect(() => {
    if (!mensajeError) return
    const timer = setTimeout(() => setMensajeError(""), 2500)
    return () => clearTimeout(timer)
  }, [mensajeError])

  useLayoutEffect(() => {
    bajarSiCorresponde()
  }, [mensajes, mensajesGrupo, cargandoMensajes, contactoSeleccionado, grupoSeleccionado])

  const contactosFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return contactos

    return contactos.filter((contacto) => {
      const nombre = contacto.nombreUsuario.toLowerCase()
      const rol = contacto.rol.toLowerCase()
      return nombre.includes(q) || rol.includes(q)
    })
  }, [contactos, busqueda])

  const gruposFiltrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return grupos

    return grupos.filter((grupo) => {
      const nombre = grupo.nombre.toLowerCase()
      const descripcion = grupo.descripcion?.toLowerCase() || ""
      return nombre.includes(q) || descripcion.includes(q)
    })
  }, [grupos, busqueda])

  const seleccionarContacto = (contacto: ChatContacto) => {
    prepararEntradaAlChat()
    setGrupoSeleccionado(null)
    setMensajesGrupo([])
    setContactoSeleccionado(contacto)
    limpiarNoLeidos(contacto.nombreUsuario)
    setTexto("")
  }

  const seleccionarGrupo = (grupo: ChatGrupo) => {
    prepararEntradaAlChat()
    setContactoSeleccionado(null)
    setMensajes([])
    setGrupoSeleccionado(grupo)
    limpiarNoLeidosGrupo(grupo.id)
    setTexto("")
  }

  const toggleMiembroGrupo = (nombreUsuario: string) => {
    setNuevoGrupo((prev) => {
      const existe = prev.miembros.includes(nombreUsuario)

      return {
        ...prev,
        miembros: existe
          ? prev.miembros.filter((item) => item !== nombreUsuario)
          : [...prev.miembros, nombreUsuario],
      }
    })
  }

  const cerrarModalGrupo = () => {
    setModalGrupoAbierto(false)
    setNuevoGrupo({
      nombre: "",
      descripcion: "",
      miembros: [],
    })
  }

  const guardarGrupo = async () => {
    const nombre = nuevoGrupo.nombre.trim()

    if (!nombre) {
      setMensajeError("El nombre del grupo es obligatorio")
      return
    }

    if (nuevoGrupo.miembros.length === 0) {
      setMensajeError("Selecciona al menos un integrante")
      return
    }

    try {
      setCreandoGrupo(true)

      const grupoCreado = await crearChatGrupo({
        nombre,
        descripcion: nuevoGrupo.descripcion.trim(),
        miembros: nuevoGrupo.miembros,
      })

      cerrarModalGrupo()
      agregarGrupoSiNoExiste(grupoCreado)
      await cargarGrupos()
      setVistaChat("grupos")
      setContactoSeleccionado(null)
      prepararEntradaAlChat()
      setGrupoSeleccionado(grupoCreado)
      setTimeout(() => {
        suscribirAGrupos()
      }, 100)
    } catch (error) {
      console.log(error)
      setMensajeError("No se pudo crear el grupo")
    } finally {
      setCreandoGrupo(false)
    }
  }

  const enviar = async () => {
    const mensaje = texto.trim()
    if (!mensaje) return

    if (contactoSeleccionado) {
      try {
        setEnviando(true)
        forzarBajarAlFinalRef.current = true

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

      return
    }

    if (grupoSeleccionado) {
      try {
        setEnviando(true)
        forzarBajarAlFinalRef.current = true

        const guardado = await enviarChatGrupoMensaje(grupoSeleccionado.id, {
          mensaje,
        })

        setMensajesGrupo((prev) => {
          const existe = prev.some((item) => item.id === guardado.id)
          if (existe) return prev
          return [...prev, guardado]
        })

        moverGrupoArriba(grupoSeleccionado.id)
        setTexto("")
        await cargarMensajesGrupo(grupoSeleccionado.id, false)
      } catch (error) {
        console.log(error)
        setMensajeError("No se pudo enviar el mensaje al grupo")
      } finally {
        setEnviando(false)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await enviar()
  }

  return (
    <div
      className="chat-theme p-6 min-h-screen"
      style={
        {
          "--chat-page": theme.page,
          "--chat-card": theme.card,
          "--chat-panel": theme.panel,
          "--chat-input": theme.input,
          "--chat-text": theme.text,
          "--chat-muted": theme.muted,
          "--chat-border": theme.border,
          "--chat-selected": theme.selected,
          "--chat-selected-border": theme.selectedBorder,
          "--chat-primary": theme.primary,
          "--chat-primary-hover": theme.primaryHover,
          "--chat-button-dark": theme.buttonDark,
          "--chat-mine": theme.mine,
          "--chat-other": theme.other,
          "--chat-other-border": theme.otherBorder,
          "--chat-other-text": theme.otherText,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <MessageCircle size={20} className="chat-primary-icon" />
          <h1 className="text-[32px] font-bold leading-none chat-title">
            Chat Interno
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-[320px_1fr] gap-5 h-[calc(100vh-170px)]">
        <section className="chat-card rounded-[28px] border flex flex-col overflow-hidden">
          <div className="p-5 border-b chat-border">
            <div className="relative">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 chat-muted-icon" />
              <input
                type="text"
                placeholder={vistaChat === "usuarios" ? "Buscar usuario o rol..." : "Buscar grupo..."}
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="chat-input w-full h-11 rounded-2xl border pl-10 pr-4 text-sm outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                type="button"
                onClick={() => setVistaChat("usuarios")}
                className={`h-10 rounded-2xl text-sm font-semibold transition ${
                  vistaChat === "usuarios" ? "chat-tab-active" : "chat-tab"
                }`}
              >
                Usuarios
              </button>

              <button
                type="button"
                onClick={() => setVistaChat("grupos")}
                className={`h-10 rounded-2xl text-sm font-semibold transition ${
                  vistaChat === "grupos" ? "chat-tab-active" : "chat-tab"
                }`}
              >
                Grupos
              </button>
            </div>

            {vistaChat === "grupos" && puedeCrearGrupo && (
              <button
                type="button"
                onClick={() => setModalGrupoAbierto(true)}
                className="mt-3 w-full h-10 rounded-2xl chat-dark-button text-sm font-semibold flex items-center justify-center gap-2 transition"
              >
                <Plus size={15} />
                Nuevo grupo
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {vistaChat === "usuarios" ? (
              cargandoContactos ? (
                <div className="h-full flex items-center justify-center chat-muted text-sm">
                  Cargando contactos...
                </div>
              ) : contactosFiltrados.length === 0 ? (
                <div className="h-full flex items-center justify-center chat-muted text-sm text-center px-4">
                  No hay usuarios disponibles para chatear
                </div>
              ) : (
                contactosFiltrados.map((contacto) => {
                  const seleccionado = contactoSeleccionado?.nombreUsuario === contacto.nombreUsuario
                  const cantidadNoLeidos = noLeidos[contacto.nombreUsuario] || 0
                  const online = usuariosOnline.has(contacto.nombreUsuario)

                  return (
                    <button
                      key={contacto.id}
                      onClick={() => seleccionarContacto(contacto)}
                      className={`w-full text-left rounded-2xl px-4 py-3 transition border ${
                        seleccionado ? "chat-item-selected" : "chat-item"
                      }`}
                      type="button"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-semibold truncate chat-text">
                            {contacto.nombreUsuario}
                          </div>
                          <div className="text-xs mt-1 chat-muted">
                            {contacto.rol}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {cantidadNoLeidos > 0 && (
                            <span className="min-w-5 h-5 px-1 rounded-full chat-badge text-white text-[11px] font-semibold flex items-center justify-center">
                              {cantidadNoLeidos}
                            </span>
                          )}

                          <span
                            title={online ? "En línea" : "Desconectado"}
                            className={`w-2.5 h-2.5 rounded-full ${
                              online ? "bg-[#20a464]" : "bg-[#cbd5e1]"
                            }`}
                          ></span>
                        </div>
                      </div>
                    </button>
                  )
                })
              )
            ) : cargandoGrupos ? (
              <div className="h-full flex items-center justify-center chat-muted text-sm">
                Cargando grupos...
              </div>
            ) : gruposFiltrados.length === 0 ? (
              <div className="h-full flex items-center justify-center chat-muted text-sm text-center px-4">
                No hay grupos disponibles
              </div>
            ) : (
              gruposFiltrados.map((grupo) => {
                const seleccionado = grupoSeleccionado?.id === grupo.id
                const cantidadNoLeidosGrupo = noLeidosGrupos[grupo.id] || 0

                return (
                  <button
                    key={grupo.id}
                    onClick={() => seleccionarGrupo(grupo)}
                    className={`w-full text-left rounded-2xl px-4 py-3 transition border ${
                      seleccionado ? "chat-item-selected" : "chat-item"
                    }`}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full chat-group-icon flex items-center justify-center shrink-0">
                          <Users size={18} className="chat-primary-icon" />
                        </div>

                        <div className="min-w-0">
                          <div className="font-semibold truncate chat-text">
                            {grupo.nombre}
                          </div>
                          <div className="text-xs mt-1 truncate chat-muted">
                            {grupo.miembros?.length || 0} integrantes
                          </div>
                        </div>
                      </div>

                      {cantidadNoLeidosGrupo > 0 && (
                        <span className="min-w-5 h-5 px-1 rounded-full chat-badge text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                          {cantidadNoLeidosGrupo}
                        </span>
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        <section className="chat-card rounded-[28px] border flex flex-col overflow-hidden">
          {contactoSeleccionado ? (
            <>
              <div className="px-6 py-5 border-b chat-border">
                <div className="font-bold text-[20px] chat-text">
                  {contactoSeleccionado.nombreUsuario}
                </div>
                <div className="text-sm mt-1 chat-muted">
                  {contactoSeleccionado.rol}
                </div>
              </div>

              <div
                ref={mensajesRef}
                onScroll={actualizarEstadoScroll}
                className="flex-1 overflow-y-auto px-6 py-5 chat-panel"
              >
                {cargandoMensajes ? (
                  <div className="h-full flex items-center justify-center chat-muted text-sm">
                    Cargando conversación...
                  </div>
                ) : mensajes.length === 0 ? (
                  <div className="h-full flex items-center justify-center chat-muted text-sm text-center">
                    No hay mensajes aún. Inicia la conversación.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mensajes.map((item) => {
                      const esMio = item.remitente === usuarioActual

                      return (
                        <div key={item.id} className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${esMio ? "chat-bubble-mine" : "chat-bubble-other"}`}>
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {item.mensaje}
                            </div>
                            <div className={`text-[11px] mt-2 ${esMio ? "text-white/75" : "chat-muted"}`}>
                              {formatearHora(item.fecha)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-4 border-t chat-border chat-card">
                <div className="max-w-[920px] mx-auto flex items-center gap-3">
                  <input
                    type="text"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escribe un mensaje..."
                    className="chat-input flex-1 h-12 rounded-2xl border px-4 text-sm outline-none"
                  />

                  <button
                    type="submit"
                    disabled={enviando || !texto.trim()}
                    className="h-12 px-5 rounded-2xl chat-send-button font-semibold flex items-center gap-2 transition disabled:opacity-60"
                  >
                    <Send size={16} />
                    Enviar
                  </button>
                </div>
              </form>
            </>
          ) : grupoSeleccionado ? (
            <>
              <div className="px-6 py-5 border-b chat-border">
                <div className="font-bold text-[20px] chat-text">
                  {grupoSeleccionado.nombre}
                </div>
                <div className="text-sm mt-1 chat-muted">
                  {grupoSeleccionado.descripcion || "Grupo interno de trabajo"}
                </div>
              </div>

              <div
                ref={mensajesRef}
                onScroll={actualizarEstadoScroll}
                className="flex-1 overflow-y-auto px-6 py-5 chat-panel"
              >
                {cargandoMensajes ? (
                  <div className="h-full flex items-center justify-center chat-muted text-sm">
                    Cargando mensajes del grupo...
                  </div>
                ) : mensajesGrupo.length === 0 ? (
                  <div className="h-full flex items-center justify-center chat-muted text-sm text-center">
                    No hay mensajes en este grupo. Inicia la conversación.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {mensajesGrupo.map((item) => {
                      const esMio = item.remitente === usuarioActual

                      return (
                        <div key={item.id} className={`flex ${esMio ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[70%] rounded-2xl px-4 py-3 ${esMio ? "chat-bubble-mine" : "chat-bubble-other"}`}>
                            {!esMio && (
                              <div className="text-[11px] font-semibold mb-1 chat-primary-text">
                                {item.remitente}
                              </div>
                            )}
                            <div className="text-sm whitespace-pre-wrap break-words">
                              {item.mensaje}
                            </div>
                            <div className={`text-[11px] mt-2 ${esMio ? "text-white/75" : "chat-muted"}`}>
                              {formatearHora(item.fecha)}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="px-6 py-4 border-t chat-border chat-card">
                <div className="max-w-[920px] mx-auto flex items-center gap-3">
                  <input
                    type="text"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    placeholder="Escribe un mensaje al grupo..."
                    className="chat-input flex-1 h-12 rounded-2xl border px-4 text-sm outline-none"
                  />

                  <button
                    type="submit"
                    disabled={enviando || !texto.trim()}
                    className="h-12 px-5 rounded-2xl chat-send-button font-semibold flex items-center gap-2 transition disabled:opacity-60"
                  >
                    <Send size={16} />
                    Enviar
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="h-full chat-card"></div>
          )}
        </section>
      </div>

      {modalGrupoAbierto && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center px-4">
          <div className="w-full max-w-[520px] chat-card rounded-[28px] shadow-xl border overflow-hidden">
            <div className="px-6 py-5 border-b chat-border">
              <h2 className="text-[22px] font-bold chat-text">Nuevo grupo</h2>
              <p className="text-sm mt-1 chat-muted">
                Crea un grupo interno para organizar conversaciones por equipo.
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-semibold mb-2 chat-text">
                  Nombre del grupo
                </label>
                <input
                  type="text"
                  value={nuevoGrupo.nombre}
                  onChange={(e) =>
                    setNuevoGrupo((prev) => ({
                      ...prev,
                      nombre: e.target.value,
                    }))
                  }
                  className="chat-input w-full h-11 rounded-2xl border px-4 text-sm outline-none"
                  placeholder="Ej: Administradores"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 chat-text">
                  Descripción
                </label>
                <textarea
                  value={nuevoGrupo.descripcion}
                  onChange={(e) =>
                    setNuevoGrupo((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  className="chat-input w-full min-h-[90px] rounded-2xl border px-4 py-3 text-sm outline-none resize-none"
                  placeholder="Descripción opcional del grupo"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2 chat-text">
                  Integrantes
                </label>

                <div className="max-h-[210px] overflow-y-auto rounded-2xl border chat-border chat-panel p-2 space-y-1">
                  {contactos.length === 0 ? (
                    <div className="text-sm chat-muted text-center py-4">
                      No hay usuarios disponibles
                    </div>
                  ) : (
                    contactos
                      .filter((contacto) => contacto.nombreUsuario !== usuarioActual)
                      .map((contacto) => {
                        const marcado = nuevoGrupo.miembros.includes(contacto.nombreUsuario)

                        return (
                          <label
                            key={contacto.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-xl cursor-pointer chat-hover"
                          >
                            <input
                              type="checkbox"
                              checked={marcado}
                              onChange={() => toggleMiembroGrupo(contacto.nombreUsuario)}
                              className="w-4 h-4 accent-[#8f7cf8]"
                            />
                            <div className="min-w-0">
                              <div className="text-sm font-semibold truncate chat-text">
                                {contacto.nombreUsuario}
                              </div>
                              <div className="text-xs chat-muted">
                                {contacto.rol}
                              </div>
                            </div>
                          </label>
                        )
                      })
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t chat-border flex justify-end gap-3">
              <button
                type="button"
                onClick={cerrarModalGrupo}
                className="h-11 px-5 rounded-2xl border chat-border chat-cancel-button font-semibold transition"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={guardarGrupo}
                disabled={creandoGrupo}
                className="h-11 px-5 rounded-2xl chat-send-button font-semibold transition disabled:opacity-60"
              >
                {creandoGrupo ? "Creando..." : "Crear grupo"}
              </button>
            </div>
          </div>
        </div>
      )}

      {mensajeError && (
        <div className="fixed right-6 bottom-6 z-[60] rounded-2xl px-5 py-3 shadow-lg chat-toast">
          {mensajeError}
        </div>
      )}

      <style>{`
        .chat-theme {
          background: var(--chat-page);
          transition: background 0.25s ease;
        }

        .chat-card {
          background: var(--chat-card);
          border-color: var(--chat-border);
          color: var(--chat-text);
        }

        .chat-panel {
          background: var(--chat-panel);
        }

        .chat-title,
        .chat-text {
          color: var(--chat-text);
        }

        .chat-muted {
          color: var(--chat-muted);
        }

        .chat-border {
          border-color: var(--chat-border);
        }

        .chat-input {
          background: var(--chat-input);
          border-color: var(--chat-border);
          color: var(--chat-text);
        }

        .chat-input::placeholder {
          color: var(--chat-muted);
        }

        .chat-input:focus {
          border-color: var(--chat-primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--chat-primary) 18%, transparent);
        }

        .chat-tab {
          background: var(--chat-input);
          color: var(--chat-primary);
          border: 1px solid var(--chat-border);
        }

        .chat-tab-active {
          background: var(--chat-primary);
          color: white;
          box-shadow: 0 8px 18px color-mix(in srgb, var(--chat-primary) 22%, transparent);
        }

        .chat-dark-button {
          background: var(--chat-button-dark);
          color: white;
        }

        .chat-dark-button:hover {
          filter: brightness(1.08);
        }

        .chat-send-button {
          background: var(--chat-primary);
          color: white;
        }

        .chat-send-button:hover {
          background: var(--chat-primary-hover);
        }

        .chat-cancel-button {
          color: var(--chat-text);
          background: transparent;
        }

        .chat-cancel-button:hover {
          background: var(--chat-input);
        }

        .chat-item {
          background: var(--chat-card);
          border-color: transparent;
        }

        .chat-item:hover {
          background: var(--chat-input);
        }

        .chat-item-selected {
          background: var(--chat-selected);
          border-color: var(--chat-selected-border);
        }

        .chat-badge {
          background: var(--chat-primary);
        }

        .chat-primary-icon,
        .chat-primary-text {
          color: var(--chat-primary);
        }

        .chat-muted-icon {
          color: var(--chat-muted);
        }

        .chat-group-icon {
          background: var(--chat-selected);
        }

        .chat-bubble-mine {
          background: var(--chat-mine);
          color: white;
        }

        .chat-bubble-other {
          background: var(--chat-other);
          border: 1px solid var(--chat-other-border);
          color: var(--chat-other-text);
        }

        .chat-toast {
          background: var(--chat-button-dark);
          color: white;
        }

        .chat-hover:hover {
          background: var(--chat-input);
        }
      `}</style>
    </div>
  )
}

function formatearHora(fecha: string) {
  if (!fecha) return ""

  const valor = new Date(fecha)

  if (isNaN(valor.getTime())) return ""

  return valor.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  })
}

export default Chat