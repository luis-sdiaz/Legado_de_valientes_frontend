import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useGameContext } from "../context/GameContext";
import { obtenerHistorialCombates, type ResultadoCombate } from "../services/api";

const historialKeys = {
  byPlayer: (jugadorId: string) => ["historial", jugadorId] as const,
};

function getStoredPlayerId(fallback: string) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem("ldv_player_id") ?? fallback;
}

export default function HistorialPage() {
  const { jugador } = useGameContext();
  const jugadorId =
    getStoredPlayerId(jugador.id) || (jugador.id !== "player-123" ? jugador.id : "");

  const historialQuery = useQuery<ResultadoCombate[]>({
    queryKey: historialKeys.byPlayer(jugadorId),
    queryFn: () => obtenerHistorialCombates(jugadorId),
    enabled: !!jugadorId,
    staleTime: 30_000,
  });

  const historial = historialQuery.data ?? [];

  return (
    <div className="page-shell relative overflow-hidden bg-[#070A12] text-slate-100 menu-bg">
      {/* Mismo overlay radial que MascotasPage */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,rgba(7,10,18,0.08)_28%,rgba(7,10,18,0.95)_74%,rgba(7,10,18,1)_100%)]" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 page-shell-inner content-stack"
      >
        {/* Cabecera */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="content-stack">
            <div className="page-kicker">Registro</div>
            <h1 className="page-title uppercase">Crónicas de Batalla</h1>
            <div className="text-xs uppercase tracking-[0.32em] text-amber-200/80">
              {jugador.nombre} • {historial.length} combate{historial.length !== 1 ? "s" : ""}
            </div>
          </div>
          <div className="page-actions">
            <Link
              to="/menu"
              className="pointer-events-auto inline-flex items-center justify-center rounded-full px-5 py-2 btn-rpg organic"
            >
              Volver al menú
            </Link>
          </div>
        </div>

        {/* Estados de carga / error / vacío */}
        {!jugadorId && (
          <div className="rounded-2xl border border-amber-300/15 bg-black/30 px-4 py-6 text-sm text-slate-300">
            No hay un jugador activo para consultar el historial.
          </div>
        )}

        {historialQuery.isError && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            No se pudo cargar el historial. Verifica el backend.
          </div>
        )}

        {historialQuery.isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-slate-300">
            Cargando crónicas de batalla...
          </div>
        ) : historial.length === 0 ? (
          <div className="rounded-2xl border border-amber-300/15 bg-black/30 px-4 py-6 text-sm text-slate-300">
            Aún no tienes combates registrados.
          </div>
        ) : (
          /* Lista de combates — grid de 1 columna en móvil, 2 en md */
          <div className="grid gap-5 md:grid-cols-2">
            {historial.map((battle, index) => {
              const key = battle.id ?? battle.combateId ?? String(index);
              const fecha = battle.createdAt ?? battle.fecha;
              const rival = battle.oponente ?? battle.mascota2Id ?? battle.jugador2Id;
              const esVictoria =
                (battle.ganadorId !== undefined && battle.ganadorId === jugadorId) ||
                battle.ganador === "jugador";

              return (
                <motion.div
                  key={key}
                  whileHover={{ y: -6 }}
                  transition={{ duration: 0.2 }}
                  className={`relative overflow-hidden content-panel p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)] transition-all ${
                    esVictoria
                      ? "ring-1 ring-emerald-500/30 shadow-[0_0_0_1px_rgba(52,211,153,0.2),0_24px_70px_rgba(0,0,0,0.42)]"
                      : "ring-1 ring-red-500/20 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_24px_70px_rgba(0,0,0,0.42)]"
                  }`}
                >
                  {/* Barra de acento superior */}
                  <div
                    className={`absolute inset-x-0 top-0 h-0.5 ${
                      esVictoria
                        ? "bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent"
                        : "bg-gradient-to-r from-transparent via-red-500/50 to-transparent"
                    }`}
                  />

                  <div className="flex items-start justify-between gap-4">
                    {/* Info izquierda */}
                    <div className="flex flex-col gap-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-[0.3em] text-slate-500">
                          #{index + 1}
                        </span>
                        <span className="text-sm font-black uppercase tracking-[0.08em] text-slate-100">
                          {rival && rival !== "SYSTEM" ? `vs ${rival}` : "Combate"}
                        </span>
                      </div>

                      {fecha && (
                        <div className="text-xs text-slate-400">
                          {new Date(fecha).toLocaleString("es-ES", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </div>
                      )}

                      {battle.resumen && (
                        <div className="text-xs text-slate-300 leading-relaxed line-clamp-2">
                          {battle.resumen}
                        </div>
                      )}
                    </div>

                    {/* Info derecha — resultado */}
                    <div className="shrink-0 flex flex-col items-end gap-1.5">
                      <div
                        className={`rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.25em] ${
                          esVictoria
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                            : "border-red-500/35 bg-red-500/8 text-red-400"
                        }`}
                      >
                        {esVictoria ? "Victoria" : "Derrota"}
                      </div>

                      {(battle.experienciaGanada !== undefined ||
                        battle.monedasGanadas !== undefined) && (
                        <div className="text-[11px] font-medium text-amber-200/80">
                          +{battle.experienciaGanada ?? 0} XP &nbsp;·&nbsp; +{battle.monedasGanadas ?? 0} ORO
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
