/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  actualizarJugador as actualizarJugadorApi,
  actualizarMascota as actualizarMascotaApi,
  crearCombate,
  enviarAccionTurno,
  finalizarCombate,
  generarRival,
  obtenerPerfilJugador,
  registrarResultadoCombate,
} from "../services/api";
import { useQueryClient } from "@tanstack/react-query";
import { playerKeys } from "../api/hooks";

export type JugadorState = {
  id: string;
  nombre: string;
  oro: number;
  nivel: number;
  xpActual: number;
  xpSiguienteNivel: number;
  victorias: number;
  derrotas: number;
  cantidadMascotas: number;
};

export type MascotaState = {
  id: string;
  nombre: string;
  especie: string;
  ataque: number;
  defensa: number;
  vida: number;
  vidaMax: number;
  xp: number;
  nivel: number;
  elemento: string;
  estado: string;
  evolucionada: boolean;
};

export type RivalState = {
  id: string;
  nombre: string;
  dificultad: "Fácil" | "Medio" | "Difícil";
  elemento: string;
  vida: number;
  vidaMax: number;
  ataque: number;
};

export type CombateActualState = {
  id: string;
  rival: RivalState;
  turno: number;
  log: string[];
  finalizado: boolean;
  resultado: "en_progreso" | "ganado" | "perdido";
  recompensas?: { experiencia: number; monedas: number };
};

export type GameContextValue = {
  jugador: JugadorState;
  mascotas: MascotaState[];
  mascotaActiva: MascotaState | null;
  combateActual: CombateActualState | null;
  setJugador: (jugador: JugadorState) => void;
  setMascotas: (mascotas: MascotaState[]) => void;
  setMascotaActiva: (mascota: MascotaState | null) => void;
  setCombateActual: (combate: CombateActualState | null) => void;
  patchJugador: (patch: Partial<JugadorState>) => void;
  patchMascotaActiva: (patch: Partial<MascotaState>) => void;
  patchCombateActual: (patch: Partial<CombateActualState>) => void;
  entrenarMascota: (id: string) => void;
  entrenarEstadistica: (
    mascotaId: string,
    tipo: "ataque" | "defensa",
    costo: number,
    statsNuevos: { ataque: number; defensa: number; xp: number }
  ) => Promise<string | null>;
  elegirMascotaParaPelear: (id: string) => void;
  invocarMascota: (nombre: string, especie: string) => void;
  evolucionarMascota: (id: string) => void;
  modificarOro: (cantidad: number) => void;
  iniciarCombate: (dificultad: "Fácil" | "Medio" | "Difícil") => Promise<void>;
  ejecutarTurno: (accion?: "atacar" | "defender" | "pasar") => Promise<void>;
  refrescarJugador: () => Promise<void>;
  resetGameState: () => void;
};

const GameContext = createContext<GameContextValue | undefined>(undefined);

function getInitialJugador(): JugadorState {
  const storedName =
    typeof window !== "undefined"
      ? (window.localStorage.getItem("ldv_player_name") ?? "Jugador")
      : "Jugador";
  const storedId =
    typeof window !== "undefined"
      ? (window.localStorage.getItem("ldv_player_id") ?? "")
      : "";
  return {
    id: storedId,
    nombre: storedName,
    oro: 600,
    nivel: 1,
    xpActual: 0,
    xpSiguienteNivel: 1000,
    victorias: 0,
    derrotas: 0,
    cantidadMascotas: 0,
  };
}

const initialMascotas: MascotaState[] = [];

function createPetId() {
  const randomId = globalThis.crypto?.randomUUID?.();
  return randomId ? `pet-${randomId}` : `pet-${Date.now()}`;
}

function getBasePetTemplate(nombre: string, especie: string): MascotaState {
  return {
    id: createPetId(),
    nombre,
    especie,
    nivel: 1,
    ataque: 10,
    defensa: 8,
    vida: 70,
    vidaMax: 70,
    xp: 0,
    elemento: "Neutro",
    estado: "Listo",
    evolucionada: false,
  };
}

function evolvePet(pet: MascotaState): MascotaState {
  return {
    ...pet,
    ataque: pet.ataque + 15,
    defensa: pet.defensa + 15,
    vidaMax: pet.vidaMax + 50,
    vida: pet.vida + 50,
    evolucionada: true,
  };
}

export function GameProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [jugador, setJugador] = useState<JugadorState>(getInitialJugador);
  const [mascotas, setMascotas] = useState<MascotaState[]>(initialMascotas);
  const [mascotaActiva, setMascotaActiva] = useState<MascotaState | null>(null);
  const [combateActual, setCombateActual] = useState<CombateActualState | null>(null);

  const value = useMemo<GameContextValue>(() => {
    const updateMascotas = (
      updater: (current: MascotaState[]) => MascotaState[],
    ) => {
      setMascotas((current) => {
        const nextMascotas = updater(current);
        if (mascotaActiva) {
          const active = nextMascotas.find(
            (pet) => String(pet.id) === String(mascotaActiva.id),
          );
          if (active) setMascotaActiva(active);
        }
        return nextMascotas;
      });
    };

    return {
      jugador,
      mascotas,
      mascotaActiva,
      combateActual,
      setJugador,
      setMascotas,
      setMascotaActiva,
      setCombateActual,
      patchJugador: (patch) => setJugador((prev) => ({ ...prev, ...patch })),
      patchMascotaActiva: (patch) =>
        setMascotaActiva((prev) => (prev ? { ...prev, ...patch } : prev)),
      patchCombateActual: (patch) =>
        setCombateActual((prev) => (prev ? { ...prev, ...patch } : prev)),

      entrenarMascota: (id) => {
        updateMascotas((current) =>
          current.map((pet) =>
            String(pet.id) === id
              ? {
                  ...pet,
                  ataque: pet.ataque + 2,
                  defensa: pet.defensa + 2,
                  xp: pet.xp + 50,
                }
              : pet,
          ),
        );
        setJugador((current) => ({
          ...current,
          oro: Math.max(0, current.oro - 50),
        }));
      },

      entrenarEstadistica: async (mascotaId, _tipo, costo, statsNuevos) => {
        if (jugador.oro < costo) {
          return "Oro insuficiente para entrenar.";
        }

        const nuevaOro = Math.max(0, jugador.oro - costo);

        setJugador((prev) => ({ ...prev, oro: nuevaOro }));

        // Actualiza el array de mascotas en contexto (y mascotaActiva si está ahí)
        updateMascotas((prev) =>
          prev.map((p) =>
            String(p.id) === String(mascotaId)
              ? { ...p, ataque: statsNuevos.ataque, defensa: statsNuevos.defensa, xp: statsNuevos.xp }
              : p,
          ),
        );

        // Si mascotaActiva es la mascota entrenada y no estaba en el array, actualízala igual
        if (mascotaActiva && String(mascotaActiva.id) === String(mascotaId)) {
          setMascotaActiva((prev) =>
            prev
              ? { ...prev, ataque: statsNuevos.ataque, defensa: statsNuevos.defensa, xp: statsNuevos.xp }
              : prev,
          );
        }

        try {
          await Promise.all([
            actualizarMascotaApi(mascotaId, {
              ataque: statsNuevos.ataque,
              defensa: statsNuevos.defensa,
              experiencia: statsNuevos.xp,
            }),
            actualizarJugadorApi(jugador.id, { monedas: nuevaOro }),
          ]);
          return null;
        } catch (error) {
          console.error("[Entrenamiento] Error al persistir en backend:", error);
          return "El entrenamiento se guardó localmente pero no se pudo sincronizar con el servidor.";
        }
      },

      elegirMascotaParaPelear: (id) => {
        const matched = mascotas.find((pet) => String(pet.id) === id);
        if (matched) {
          setMascotaActiva(matched);
        } else {
          console.warn(`No se encontro mascota con ID: ${id}`);
        }
      },

      invocarMascota: (nombre, especie) => {
        if (jugador.oro < 300) return;
        setJugador((prev) => ({ ...prev, oro: prev.oro - 300 }));
        setMascotas((prev) => [...prev, getBasePetTemplate(nombre, especie)]);
      },

      evolucionarMascota: (id) => {
        if (jugador.oro < 500) return;
        let evolved: MascotaState | null = null;
        setMascotas((prev) =>
          prev.map((pet) => {
            if (String(pet.id) !== id || pet.evolucionada || pet.nivel < 5)
              return pet;
            evolved = evolvePet(pet);
            return evolved;
          }),
        );
        if (evolved) {
          setJugador((prev) => ({ ...prev, oro: prev.oro - 500 }));
          if (mascotaActiva && String(mascotaActiva.id) === id)
            setMascotaActiva(evolved);
        }
      },

      modificarOro: (cantidad) => {
        setJugador((prev) => ({
          ...prev,
          oro: Math.max(0, prev.oro + cantidad),
        }));
      },

      iniciarCombate: async (dificultad) => {
        if (!mascotaActiva) {
          console.error("[Combate] No hay mascota activa para iniciar el combate");
          return;
        }

        // Restaurar vida y estado temporal de la mascota antes de cada combate
        const mascotaRestaurada: MascotaState = {
          ...mascotaActiva,
          vida: mascotaActiva.vidaMax,
          estado: "Listo",
        };
        setMascotaActiva(mascotaRestaurada);
        setMascotas((prev) =>
          prev.map((p) =>
            String(p.id) === String(mascotaActiva.id) ? mascotaRestaurada : p,
          ),
        );

        try {
          const rivalBackend = await generarRival(dificultad, jugador.id);
          const combateBackend = await crearCombate({
            jugadorId: jugador.id,
            mascotaId: mascotaActiva.id,
            rivalId: rivalBackend.id,
          });

          const rivalLocal: RivalState = {
            id: rivalBackend.id,
            nombre: rivalBackend.nombre,
            dificultad: rivalBackend.dificultad,
            elemento: "Neutro",
            vida: rivalBackend.vida,
            vidaMax: rivalBackend.vida,
            ataque: rivalBackend.ataque,
          };

          setCombateActual({
            id: combateBackend.id,
            rival: rivalLocal,
            turno: combateBackend.turnoActual || 1,
            log: combateBackend.historialTurnos?.map(
              (t: { resumen: string }) => t.resumen,
            ) || ["La batalla ha comenzado."],
            finalizado: combateBackend.estado !== "en_progreso",
            resultado:
              combateBackend.estado === "ganado"
                ? "ganado"
                : combateBackend.estado === "perdido"
                  ? "perdido"
                  : "en_progreso",
          });
        } catch (error) {
          console.error("[Combate] Error al conectar con el backend. Detalle:", error);
          console.warn("[Combate] Usando combate local como fallback (backend no disponible).");

          const rivalLocal: RivalState = {
            id: "rival-local",
            nombre: "Rival de Prueba",
            dificultad: dificultad,
            elemento: "Neutro",
            vida: 80,
            vidaMax: 80,
            ataque: 12,
          };

          setCombateActual({
            id: "combate-local",
            rival: rivalLocal,
            turno: 1,
            log: ["La batalla ha comenzado."],
            finalizado: false,
            resultado: "en_progreso",
          });
        }
      },

      ejecutarTurno: async (accion = "atacar") => {
        if (!combateActual || combateActual.finalizado) return;

        // combate sin backend activo
        if (combateActual.id === "combate-local") {
          const pet = mascotaActiva;
          if (!pet) return;

          const rival = combateActual.rival;
          let playerDamage = 0;
          let newLog: string[];

          if (accion === "atacar") {
            playerDamage = pet.ataque;
            newLog = [
              ...combateActual.log,
              `${pet.nombre} ataca y causa ${playerDamage} de daño.`,
            ];
          } else if (accion === "defender") {
            newLog = [...combateActual.log, `${pet.nombre} se defiende.`];
          } else {
            newLog = [...combateActual.log, `${pet.nombre} pasa el turno.`];
          }

          const rivalHpAfter = Math.max(0, rival.vida - playerDamage);

          if (rivalHpAfter <= 0) {
            setCombateActual({
              ...combateActual,
              rival: { ...rival, vida: 0 },
              log: [...newLog, "Has vencido al rival."],
              finalizado: true,
              resultado: "ganado",
            });
            setJugador((prev) => ({
              ...prev,
              oro: prev.oro + 100,
              xpActual: prev.xpActual + 50,
              victorias: prev.victorias + 1,
            }));
            try {
              await registrarResultadoCombate({
                jugadorId: jugador.id,
                dificultad: combateActual.rival.dificultad,
                resultado: "ganado",
              });
            } catch {
              // estado ya actualizado localmente
            }
          } else {
            const rivalDamage = Math.max(
              1,
              Math.floor(rival.ataque * (accion === "defender" ? 0.5 : 1)),
            );
            const petHpAfter = Math.max(0, pet.vida - rivalDamage);
            const newPet = { ...pet, vida: petHpAfter };
            setMascotaActiva(newPet);
            updateMascotas((pets) =>
              pets.map((p) => (p.id === pet.id ? newPet : p)),
            );

            const counterLog = `${rival.nombre} contraataca y causa ${rivalDamage} de daño.`;
            setCombateActual({
              ...combateActual,
              rival: { ...rival, vida: rivalHpAfter },
              log: [...newLog, counterLog],
              turno: combateActual.turno + 1,
              finalizado: petHpAfter <= 0,
              resultado: petHpAfter <= 0 ? "perdido" : "en_progreso",
            });

            if (petHpAfter <= 0) {
              setJugador((prev) => ({
                ...prev,
                derrotas: prev.derrotas + 1,
              }));
              try {
                await registrarResultadoCombate({
                  jugadorId: jugador.id,
                  dificultad: combateActual.rival.dificultad,
                  resultado: "perdido",
                });
              } catch {
                // estado ya actualizado localmente
              }
            }
          }
          return;
        }

        // combate con backend
        try {
          const resultadoTurno = await enviarAccionTurno(
            combateActual.id,
            accion,
          );

          const nuevoLog = [...combateActual.log, resultadoTurno.resumen];
          setCombateActual({
            ...combateActual,
            turno: resultadoTurno.turnoActual,
            log: nuevoLog,
            finalizado: resultadoTurno.estado !== "en_progreso",
            resultado:
              resultadoTurno.estado === "ganado"
                ? "ganado"
                : resultadoTurno.estado === "perdido"
                  ? "perdido"
                  : "en_progreso",
          });

          if (resultadoTurno.estado !== "en_progreso") {
            const recompensas = await finalizarCombate(combateActual.id);
            setJugador((prev) => ({
              ...prev,
              oro: prev.oro + (recompensas.monedasGanadas ?? 0),
              xpActual: prev.xpActual + (recompensas.experienciaGanada ?? 0),
              victorias:
                resultadoTurno.estado === "ganado"
                  ? prev.victorias + 1
                  : prev.victorias,
              derrotas:
                resultadoTurno.estado === "perdido"
                  ? prev.derrotas + 1
                  : prev.derrotas,
            }));
            setCombateActual((prev) =>
              prev
                ? {
                    ...prev,
                    recompensas: {
                      experiencia: recompensas.experienciaGanada ?? 0,
                      monedas: recompensas.monedasGanadas ?? 0,
                    },
                  }
                : prev,
            );

            const estadoFinal =
              resultadoTurno.estado === "ganado" ? "ganado" : "perdido";
            try {
              await registrarResultadoCombate({
                jugadorId: jugador.id,
                dificultad: combateActual.rival.dificultad,
                resultado: estadoFinal,
              });
            } catch {
              // el resultado ya fue guardado via finalizarCombate
            }

            const perfilActualizado = await obtenerPerfilJugador(jugador.id);
            // Usar forma funcional + ?? para no sobreescribir con undefined
            // si el endpoint omite algún campo opcional.
            setJugador((prev) => ({
              ...prev,
              nombre: perfilActualizado.nombre,
              oro: perfilActualizado.monedas,
              nivel: perfilActualizado.nivel,
              xpActual: perfilActualizado.experiencia,
              xpSiguienteNivel: perfilActualizado.xpSiguienteNivel,
              victorias: perfilActualizado.victorias,
              derrotas: perfilActualizado.derrotas,
              cantidadMascotas: perfilActualizado.cantidadMascotas ?? prev.cantidadMascotas,
            }));
            // Invalidar todas las queries del jugador para que PerfilPage
            // reciba datos frescos al navegar tras el combate.
            await queryClient.invalidateQueries({ queryKey: playerKeys.byId(jugador.id) });
            void queryClient.invalidateQueries({ queryKey: ["progreso", jugador.id] });
            void queryClient.invalidateQueries({ queryKey: ["estadisticas", jugador.id] });
          }
        } catch (error) {
          console.error("Error al ejecutar turno:", error);
        }
      },

      refrescarJugador: async () => {
        if (!jugador.id) return;
        try {
          const perfil = await obtenerPerfilJugador(jugador.id);
          setJugador((prev) => ({
            ...prev,
            nombre: perfil.nombre,
            oro: perfil.monedas,
            nivel: perfil.nivel,
            xpActual: perfil.experiencia,
            xpSiguienteNivel: perfil.xpSiguienteNivel,
            victorias: perfil.victorias,
            derrotas: perfil.derrotas,
            cantidadMascotas: perfil.cantidadMascotas ?? prev.cantidadMascotas,
          }));
        } catch {
          // Si el backend no responde, mantenemos el estado actual
        }
      },

      resetGameState: () => {
        setJugador(getInitialJugador());
        setMascotas([]);
        setMascotaActiva(null);
        setCombateActual(null);
      },
    };
  }, [jugador, mascotas, mascotaActiva, combateActual, queryClient]);

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameContext() {
  const context = useContext(GameContext);
  if (!context)
    throw new Error("useGameContext must be used within a GameProvider");
  return context;
}
