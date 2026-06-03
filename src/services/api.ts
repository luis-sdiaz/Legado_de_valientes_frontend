import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL;
const API_PREFIX = "/api";

export const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export type Jugador = {
  id: string;
  nombre: string;
  monedas: number;
  nivel: number;
  experiencia: number;     // campo real del backend (JugadorResponse.java)
  xpSiguienteNivel: number;
  victorias: number;
  derrotas: number;
  energia?: number;
  clase?: string;
  cantidadMascotas?: number;
};

export type ComprarMascotaResponse = {
  mascota: Mascota;
  jugador: Jugador & { cantidadMascotas: number };
};

export type Mascota = {
  id: string;
  jugadorId: string;
  nombre: string;
  tipo?: string;        // campo real del backend (DRAGON, LEON, GORILA, AGUILA)
  especie?: string;     // alias legacy — el backend NO lo envía, solo tipo
  ataque: number;
  defensa: number;
  velocidad?: number;
  salud: number;
  vida?: number;
  vidaActual?: number;
  vidaMax?: number;
  vidaMaxima?: number;
  hp?: number;
  experiencia?: number;
  xp?: number;
  nivel: number;
  elemento?: string;
  estado?: "activa" | "descanso";
  // Atributos exclusivos del Dragon (null para otras especies)
  temperaturaFuego?: number;
  alcanceVuelo?: number;
};

/** Lee el campo de experiencia independientemente del nombre que use el backend */
export function getMascotaXp(m: Mascota): number {
  return m.experiencia ?? m.xp ?? 0;
}

export type EntrenarMascotaResponse = {
  mascota: Mascota;
  monedasRestantes: number;
};

export type Rival = {
  id: string;
  nombre: string;
  dificultad: "Fácil" | "Medio" | "Difícil";
  nivel: number;
  ataque: number;
  defensa: number;
  vida: number;
};

export type TurnoAccion = {
  actor: "jugador" | "sistema";
  accion: string;
  daño?: number;
  cura?: number;
  vidaJugador?: number;
  vidaRival?: number;
  resumen: string;
};

export type Combate = {
  id: string;
  jugadorId: string;
  mascotaId: string;
  rival: Rival;
  turnoActual: number;
  historialTurnos: TurnoAccion[];
  estado: "en_progreso" | "ganado" | "perdido";
};

export type ResultadoTurno = {
  combateId: string;
  turnoActual: number;
  historialTurnos: TurnoAccion[];
  estado: "en_progreso" | "ganado" | "perdido";
  resumen: string;
};

// Campos reales que envía el backend (CombateResponse.java)
export type ResultadoCombate = {
  id?: string;           // campo real del backend
  combateId?: string;    // alias legacy (no enviado por el backend)
  jugador1Id?: string;
  jugador2Id?: string;
  mascota2Id?: string;   // nombre del rival (ej. "Rival Fácil")
  ganadorId?: string;    // ID del jugador o "SYSTEM"
  ganador?: "jugador" | "sistema"; // alias legacy
  resumen?: string;
  createdAt?: string;    // campo real del backend (ISO timestamp)
  fecha?: string;        // alias legacy
  oponente?: string;     // alias legacy
  experienciaGanada?: number; // no viene en CombateResponse, queda opcional
  monedasGanadas?: number;    // no viene en CombateResponse, queda opcional
};

export type EstadisticasJugador = {
  victorias: number;
  derrotas: number;
  combates: number;
  mascotas: number;
  evoluciones?: number;
};

export type ProgresoPerfil = {
  nivel: number;
  xpActual: number;
  xpSiguienteNivel: number;
  porcentaje: number;
};

// Campos exactos de LogroResponse.java
export type Logro = {
  nombre: string;
  descripcion: string;
  condicion?: string;
  completado: boolean;       // backend: isCompletado()
  fechaObtencion?: string;   // backend: getFechaObtencion() — null si no desbloqueado
};

export async function crearPerfil(nombre: string, email: string): Promise<Jugador> {
  const { data } = await api.post<Jugador>(`${API_PREFIX}/jugadores`, { nombre, email });
  return data;
}

export async function obtenerPerfilJugador(jugadorId: string): Promise<Jugador> {
  const { data } = await api.get<Jugador>(`${API_PREFIX}/jugadores/${jugadorId}`);
  return data;
}

export async function obtenerEstadisticasJugador(
  jugadorId: string,
): Promise<EstadisticasJugador> {
  const { data } = await api.get<EstadisticasJugador>(
    `${API_PREFIX}/jugadores/${jugadorId}/estadisticas`,
  );
  return data;
}

export async function obtenerProgresoPerfil(
  jugadorId: string,
): Promise<ProgresoPerfil> {
  const { data } = await api.get<ProgresoPerfil>(
    `${API_PREFIX}/jugadores/${jugadorId}/progreso`,
  );
  return data;
}

export async function obtenerLogrosJugador(jugadorId: string): Promise<Logro[]> {
  // Endpoint real: GET /api/logros?jugadorId={id}  (LogroController.java)
  const { data } = await api.get<Logro[]>(`${API_PREFIX}/logros`, {
    params: { jugadorId },
  });
  return data;
}

export async function crearMascota(
  jugadorId: string,
  nombre: string,
  tipo: string,
): Promise<ComprarMascotaResponse> {
  const { data } = await api.post<ComprarMascotaResponse>(`${API_PREFIX}/mascotas`, {
    jugadorId,
    nombre,
    tipo,
  });
  return data;
}

export async function obtenerMascotas(jugadorId: string): Promise<Mascota[]> {
  const { data } = await api.get<Mascota[]>(
    `${API_PREFIX}/mascotas/jugador/${jugadorId}`,
  );
  return data;
}

export async function obtenerColeccion(jugadorId: string): Promise<Mascota[]> {
  return obtenerMascotas(jugadorId);
}

export type TipoEntrenamiento = "ATAQUE" | "DEFENSA" | "VELOCIDAD";

export async function entrenarMascota(
  mascotaId: string,
  tipo: TipoEntrenamiento,
  jugadorId?: string,
): Promise<EntrenarMascotaResponse> {
  const { data } = await api.post<EntrenarMascotaResponse>(
    `${API_PREFIX}/mascotas/${mascotaId}/entrenar`,
    { tipo },
    jugadorId ? { headers: { jugadorId } } : undefined,
  );
  return data;
}

export async function evolucionarMascota(mascotaId: string): Promise<Mascota> {
  const { data } = await api.post<Mascota>(
    `${API_PREFIX}/mascotas/${mascotaId}/evolucionar`,
  );
  return data;
}

export async function elegirMascotaParaPelear(
  jugadorId: string,
  mascotaId: string,
): Promise<Mascota> {
  const { data } = await api.post<Mascota>(
    `${API_PREFIX}/jugadores/${jugadorId}/mascotas/${mascotaId}/activar`,
  );
  return data;
}

// HU07 – seleccionar mascota activa para combate
export async function seleccionarMascota(mascotaId: string): Promise<Mascota> {
  const { data } = await api.post<Mascota>(
    `${API_PREFIX}/mascotas/${mascotaId}/seleccionar`,
  );
  return data;
}

export async function generarRival(
  dificultad: Rival["dificultad"],
  jugadorId?: string,
): Promise<Rival> {
  const { data } = await api.post<Rival>(`${API_PREFIX}/combates/rival`, {
    dificultad,
    jugadorId,
  });
  return data;
}

export async function crearCombate(payload: {
  jugadorId: string;
  mascotaId: string;
  rivalId: string;
}): Promise<Combate> {
  const { data } = await api.post<Combate>(`${API_PREFIX}/combates`, payload);
  return data;
}

export async function enviarAccionTurno(
  combateId: string,
  accion: string,
): Promise<ResultadoTurno> {
  const { data } = await api.post<ResultadoTurno>(
    `${API_PREFIX}/combates/${combateId}/turno`,
    { accion },
  );
  return data;
}

export async function finalizarCombate(
  combateId: string,
): Promise<ResultadoCombate> {
  const { data } = await api.post<ResultadoCombate>(
    `${API_PREFIX}/combates/${combateId}/finalizar`,
  );
  return data;
}

export async function registrarResultadoCombate(payload: {
  jugadorId: string;
  dificultad: "Fácil" | "Medio" | "Difícil";
  resultado: "ganado" | "perdido";
}): Promise<void> {
  await api.post(`${API_PREFIX}/combates/registrar-resultado`, payload);
}

export async function obtenerHistorialCombates(
  jugadorId: string,
): Promise<ResultadoCombate[]> {
  const { data } = await api.get<ResultadoCombate[]>(
    `${API_PREFIX}/combates/jugador/${jugadorId}`,
  );
  return data;
}

export async function otorgarRecompensas(
  combateId: string,
): Promise<{ experiencia: number; monedas: number }> {
  const { data } = await api.post<{ experiencia: number; monedas: number }>(
    `${API_PREFIX}/combates/${combateId}/recompensas`,
  );
  return data;
}

export async function obtenerCombateActual(combateId: string): Promise<Combate> {
  const { data } = await api.get<Combate>(`${API_PREFIX}/combates/${combateId}`);
  return data;
}

export async function buscarJugadorPorEmail(email: string): Promise<Jugador | null> {
  try {
    const { data } = await api.get<Jugador>(`${API_PREFIX}/jugadores/buscar`, { params: { email } });
    return data;
  } catch {
    return null;
  }
}

export async function actualizarMascota(
  id: string,
  payload: { ataque?: number; defensa?: number; experiencia?: number; nivel?: number },
): Promise<Mascota> {
  const { data } = await api.put<Mascota>(`${API_PREFIX}/mascotas/${id}`, payload);
  return data;
}

export async function actualizarJugador(
  id: string,
  payload: { monedas?: number },
): Promise<Jugador> {
  const { data } = await api.put<Jugador>(`${API_PREFIX}/jugadores/${id}`, payload);
  return data;
}
