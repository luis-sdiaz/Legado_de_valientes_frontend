export type Player = {
  id: number;
  nombre: string;
  nivel?: number;
  experiencia?: number;
  energia?: number;
  clase?: string;
};

export type Pet = {
  id: number;
  jugadorId: number;
  nombre: string;
  tipo: string;
  salud: number;
  ataque: number;
  defensa: number;
  velocidad: number;
  activo: boolean;
};
