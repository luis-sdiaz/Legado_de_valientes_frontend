import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  buscarJugadorPorEmail,
  crearPerfil,
  obtenerPerfilJugador,
  type Jugador as ApiJugador,
} from "../services/api";
import { fetchPetsByPlayerId } from "./petApi";
import type { Pet } from "./types";
import { useGameContext, type JugadorState } from "../context/GameContext";

export const playerKeys = {
  all: ["player"] as const,
  byId: (jugadorId: string) => ["player", jugadorId] as const,
};

export const petKeys = {
  all: ["pets"] as const,
  byPlayer: (jugadorId: number) => ["pets", jugadorId] as const,
};

function resolvePlayerId(explicitId?: string | null) {
  if (explicitId) return explicitId;
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("ldv_player_id");
}

function mapApiPlayerToGameState(player: ApiJugador): JugadorState {
  return {
    id: String(player.id),
    nombre: player.nombre,
    oro: player.monedas,
    nivel: player.nivel,
    xpActual: player.experiencia,
    xpSiguienteNivel: player.xpSiguienteNivel,
    victorias: player.victorias,
    derrotas: player.derrotas,
    cantidadMascotas: player.cantidadMascotas ?? 0,
  };
}

export function usePlayer(jugadorId?: string | null) {
  const { setJugador } = useGameContext();
  const resolvedPlayerId = resolvePlayerId(jugadorId);

  const query = useQuery<ApiJugador | null>({
    queryKey: resolvedPlayerId ? playerKeys.byId(resolvedPlayerId) : playerKeys.all,
    queryFn: async () => {
      if (!resolvedPlayerId) return null;
      const player = await obtenerPerfilJugador(resolvedPlayerId);
      const nextPlayer = mapApiPlayerToGameState(player);
      setJugador(nextPlayer);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ldv_player_id", nextPlayer.id);
        window.localStorage.setItem("ldv_player_name", nextPlayer.nombre);
      }
      return player;
    },
    enabled: Boolean(resolvedPlayerId),
    staleTime: 30_000,
  });

  return query;
}

export function useRegisterPlayer(data: { nombre: string; email: string }) {
  const queryClient = useQueryClient();
  const { setJugador } = useGameContext();

  return useMutation({
    mutationFn: async () => {
      // Si ya existe un jugador con ese email, recuperar su cuenta en lugar de crear una nueva
      const existing = await buscarJugadorPorEmail(data.email);
      if (existing) return existing;
      return await crearPerfil(data.nombre, data.email);
    },
    onSuccess: (player) => {
      const nextPlayer = mapApiPlayerToGameState(player);
      if (typeof window !== "undefined") {
        window.localStorage.setItem("ldv_player_id", nextPlayer.id);
        window.localStorage.setItem("ldv_player_name", nextPlayer.nombre);
      }
      setJugador(nextPlayer);
      queryClient.setQueryData(playerKeys.byId(nextPlayer.id), player);
      queryClient.invalidateQueries({ queryKey: playerKeys.all });
    },
  });
}

export function usePets(jugadorId: number | null) {
  return useQuery<Pet[]>({
    queryKey: jugadorId ? petKeys.byPlayer(jugadorId) : petKeys.all,
    queryFn: () => fetchPetsByPlayerId(jugadorId ?? 0),
    enabled: Boolean(jugadorId),
    staleTime: 30_000,
  });
}