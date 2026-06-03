import api from "./apiClient";
import type { Pet } from "./types";

export async function fetchPetsByPlayerId(jugadorId: number): Promise<Pet[]> {
  const response = await api.get<Pet[]>("/mascotas", {
    params: { jugadorId },
  });
  return response.data;
}
