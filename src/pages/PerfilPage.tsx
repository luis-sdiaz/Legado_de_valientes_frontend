import { useEffect } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useGameContext } from "../context/GameContext";
import { playerKeys } from "../api/hooks";
import {
  obtenerMascotas,
  obtenerEstadisticasJugador,
  obtenerPerfilJugador,
} from "../services/api";

const StatItem = ({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
}) => (
  <div className="flex justify-between items-center py-3 border-b border-white/5 last:border-0 hover:bg-white/5 px-2 transition-colors rounded">
    <span className="text-stone-400 text-sm font-medium tracking-wide uppercase">
      {label}
    </span>
    <span className={`font-mono text-sm ${highlight ? "text-amber-400 font-bold" : "text-stone-100"}`}>
      {value}
    </span>
  </div>
);

export default function PerfilPage() {
  const { jugador, mascotaActiva, patchJugador } = useGameContext();
  const jugadorId = jugador.id || (typeof window !== "undefined" ? localStorage.getItem("ldv_player_id") ?? "" : "");
  const nombrePet = mascotaActiva?.nombre ?? "Ninguna";

  // Única query para el perfil: el backend ahora devuelve todos los campos en un solo objeto.
  const { data: perfil, isLoading: perfilLoading } = useQuery({
    queryKey: playerKeys.byId(jugadorId),
    queryFn: () => obtenerPerfilJugador(jugadorId),
    enabled: !!jugadorId,
    staleTime: 30_000,
  });

  // Sincronizar el contexto global cuando llegan datos frescos del backend.
  // Sin fallbacks: el backend garantiza que todos los campos numéricos son válidos.
  useEffect(() => {
    if (!perfil) return;
    patchJugador({
      nombre: perfil.nombre,
      oro: perfil.monedas,
      nivel: perfil.nivel,
      xpActual: perfil.experiencia,        // backend envia "experiencia", no "xpActual"
      xpSiguienteNivel: perfil.xpSiguienteNivel,
      victorias: perfil.victorias,
      derrotas: perfil.derrotas,
      cantidadMascotas: perfil.cantidadMascotas ?? jugador.cantidadMascotas,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [perfil]);

  // Estadísticas opcionales: solo se usan para el campo "evoluciones".
  const { data: stats } = useQuery({
    queryKey: ["estadisticas", jugadorId],
    queryFn: () => obtenerEstadisticasJugador(jugadorId),
    enabled: !!jugadorId,
    staleTime: 30_000,
  });

  const { data: mascotasData } = useQuery({
    queryKey: ["mascotas", jugadorId],
    queryFn: () => obtenerMascotas(jugadorId),
    enabled: !!jugadorId,
    staleTime: 30_000,
  });

  const totalMascotas = mascotasData?.length ?? jugador.cantidadMascotas;

  // Barra de XP defensiva: usa 0 si algún campo aún no llegó (evita NaN%).
  const porcentaje = (jugador.xpSiguienteNivel ?? 0) > 0
    ? Math.min(100, ((jugador.xpActual ?? 0) / jugador.xpSiguienteNivel) * 100)
    : 0;

  // No renderizar estadísticas hasta que el perfil esté disponible.
  const isLoading = !jugadorId || perfilLoading;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-[#040406] text-white p-6 md:p-12 font-sans flex items-center justify-center"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(217,119,6,0.08),transparent_70%)] pointer-events-none" />

      <div className="relative w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 gap-8 z-10">
        <div className="md:col-span-4 flex flex-col items-center">
          <div className="relative group p-1.5 rounded-2xl bg-linear-to-b from-amber-500 to-amber-900 shadow-[0_0_40px_rgba(245,158,11,0.2)]">
            <img
              src="/assets/avatar.png"
              alt="Avatar Jugador"
              className="w-64 h-64 rounded-xl object-contain bg-stone-950"
            />
            <div className="absolute inset-0 rounded-2xl bg-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <button className="mt-6 w-full max-w-62.5 py-3 bg-stone-900 border border-amber-600/30 text-amber-500 hover:text-white hover:border-amber-500 hover:bg-amber-950 transition-all rounded uppercase font-black tracking-widest text-[10px]">
            Personalizar Perfil
          </button>
        </div>

        <div className="md:col-span-8 flex flex-col gap-8">
          <div className="border-l-4 border-amber-500 pl-6">
            <h1 className="text-6xl md:text-7xl font-black uppercase italic tracking-tighter text-transparent bg-clip-text bg-linear-to-b from-white to-stone-400">
              {jugador.nombre.toUpperCase()}
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-amber-500 font-bold tracking-[0.2em] uppercase text-xs">
                Aventurero de la Arena
              </span>
              <span className="bg-amber-600 text-black px-3 py-0.5 rounded font-black text-[10px]">
                NIVEL {jugador.nivel}
              </span>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[0, 1].map((i) => (
                <div
                  key={i}
                  className="bg-stone-950/50 backdrop-blur border border-white/5 p-6 rounded-lg space-y-3"
                >
                  <div className="h-2 w-24 bg-stone-800 rounded animate-pulse" />
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="flex justify-between py-3 border-b border-white/5">
                      <div className="h-2 w-20 bg-stone-800 rounded animate-pulse" />
                      <div className="h-2 w-12 bg-stone-700 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Progresión */}
              <div className="bg-stone-950/50 backdrop-blur border border-white/5 p-6 rounded-lg hover:border-amber-900/50 transition-all">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-amber-600 font-bold mb-4">
                  Progresión
                </h3>
                <StatItem label="Nivel" value={jugador.nivel} highlight />
                <StatItem label="XP actual" value={`${jugador.xpActual} XP`} />
                <StatItem label="XP siguiente nivel" value={`${jugador.xpSiguienteNivel} XP`} />
                <div className="mt-3">
                  <div className="flex justify-between text-[10px] text-stone-400 mb-1">
                    <span>PROGRESO</span>
                    <span>{porcentaje.toFixed(0)}%</span>
                  </div>
                  <div className="h-2 w-full bg-stone-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all"
                      style={{ width: `${porcentaje}%` }}
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <StatItem label="Monedas" value={jugador.oro} highlight />
                  <StatItem label="Mascotas" value={totalMascotas} />
                </div>
              </div>

              {/* Estadísticas de Combate */}
              <div className="bg-stone-950/50 backdrop-blur border border-white/5 p-6 rounded-lg hover:border-amber-900/50 transition-all">
                <h3 className="text-[10px] uppercase tracking-[0.2em] text-red-500 font-bold mb-4">
                  Estadísticas de Combate
                </h3>
                <StatItem
                  label="Combates totales"
                  value={jugador.victorias + jugador.derrotas}
                />
                <StatItem label="Victorias" value={jugador.victorias} highlight />
                <StatItem label="Derrotas" value={jugador.derrotas} />
                <StatItem
                  label="Ratio V/D"
                  value={
                    jugador.derrotas > 0
                      ? (jugador.victorias / jugador.derrotas).toFixed(2)
                      : jugador.victorias
                  }
                />
                <StatItem label="Mascotas creadas" value={totalMascotas} />
                {stats?.evoluciones !== undefined && (
                  <StatItem label="Evoluciones" value={stats.evoluciones} />
                )}
                <StatItem label="Mascota Activa" value={nombrePet} highlight />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
