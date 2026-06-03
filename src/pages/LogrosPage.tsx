import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useGameContext } from "../context/GameContext";
import { obtenerLogrosJugador, type Logro } from "../services/api";

function getStoredPlayerId(fallback: string) {
  if (typeof window === "undefined") return fallback;
  return window.localStorage.getItem("ldv_player_id") ?? fallback;
}

// Icono según el estado del logro
function LogroIcon({ completado }: { completado: boolean }) {
  return (
    <div
      className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border text-2xl transition-all ${
        completado
          ? "border-amber-500/50 bg-amber-500/15 shadow-[0_0_16px_rgba(245,158,11,0.25)]"
          : "border-white/8 bg-white/4"
      }`}
    >
      {completado ? "🏆" : "🔒"}
    </div>
  );
}

function LogroCard({ logro, index }: { logro: Logro; index: number }) {
  const { completado } = logro;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06 }}
      whileHover={{ y: -6 }}
      className={`relative overflow-hidden content-panel p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)] transition-all ${
        completado
          ? "ring-1 ring-amber-500/35 shadow-[0_0_0_1px_rgba(212,175,55,0.25),0_24px_70px_rgba(0,0,0,0.42)]"
          : "opacity-55 grayscale"
      }`}
    >
      {/* Barra de acento superior — solo en desbloqueados */}
      {completado && (
        <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
      )}

      <div className="flex items-start gap-4">
        <LogroIcon completado={completado} />

        <div className="flex-1 min-w-0">
          {/* Nombre + badge de estado */}
          <div className="flex items-start justify-between gap-3">
            <div
              className={`text-sm font-black uppercase tracking-[0.07em] ${
                completado ? "text-slate-100" : "text-slate-400"
              }`}
            >
              {logro.nombre}
            </div>
            {completado && (
              <span className="shrink-0 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                Desbloqueado
              </span>
            )}
          </div>

          {/* Descripción */}
          <div
            className={`mt-1.5 text-xs leading-relaxed ${
              completado ? "text-slate-300" : "text-slate-500"
            }`}
          >
            {logro.descripcion}
          </div>

          {/* Condición o fecha */}
          {completado && logro.fechaObtencion ? (
            <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-amber-400/70">
              Obtenido el{" "}
              {new Date(logro.fechaObtencion).toLocaleDateString("es-ES", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })}
            </div>
          ) : logro.condicion ? (
            <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-slate-500">
              {logro.condicion}
            </div>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export default function LogrosPage() {
  const { jugador } = useGameContext();
  const jugadorId = getStoredPlayerId(jugador.id);

  const logrosQuery = useQuery<Logro[]>({
    queryKey: ["logros", jugadorId],
    queryFn: () => obtenerLogrosJugador(jugadorId),
    enabled: !!jugadorId,
    staleTime: 60_000,
  });

  const logros = logrosQuery.data ?? [];
  const desbloqueados = logros.filter((l) => l.completado).length;
  const total = logros.length;
  const porcentaje = total > 0 ? Math.round((desbloqueados / total) * 100) : 0;

  // Ordenar: desbloqueados primero
  const logrosOrdenados = [...logros].sort(
    (a, b) => Number(b.completado) - Number(a.completado),
  );

  return (
    <div className="page-shell relative overflow-hidden bg-[#070A12] text-slate-100 menu-bg">
      {/* Overlay radial — idéntico a MascotasPage */}
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
            <div className="page-kicker">Salón de la Fama</div>
            <h1 className="page-title uppercase">Logros</h1>
            {total > 0 && (
              <div className="text-xs uppercase tracking-[0.32em] text-amber-200/80">
                {desbloqueados} / {total} desbloqueados
              </div>
            )}
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

        {/* Barra de progreso global */}
        {total > 0 && (
          <div className="rounded-2xl border border-white/8 bg-black/20 px-5 py-4">
            <div className="mb-2 flex justify-between text-[11px] uppercase tracking-[0.28em] text-slate-400">
              <span>Progreso total</span>
              <span className="text-amber-300">{porcentaje}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400"
                initial={{ width: 0 }}
                animate={{ width: `${porcentaje}%` }}
                transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Estados de sin jugador / error / cargando / vacío */}
        {!jugadorId && (
          <div className="rounded-2xl border border-amber-300/15 bg-black/30 px-4 py-6 text-sm text-slate-300">
            No hay un jugador activo. Regístrate primero.
          </div>
        )}

        {logrosQuery.isError && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            No se pudieron cargar los logros. Verifica el backend.
          </div>
        )}

        {logrosQuery.isLoading ? (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="content-panel p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
              >
                <div className="flex items-start gap-4">
                  <div className="h-14 w-14 shrink-0 rounded-2xl border border-white/8 bg-white/4 animate-pulse" />
                  <div className="flex-1 space-y-3 pt-1">
                    <div className="h-3 w-32 rounded bg-slate-700 animate-pulse" />
                    <div className="h-2 w-48 rounded bg-slate-800 animate-pulse" />
                    <div className="h-2 w-24 rounded bg-slate-800 animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : logros.length === 0 ? (
          <div className="rounded-2xl border border-amber-300/15 bg-black/30 px-4 py-6 text-sm text-slate-300">
            Aún no hay logros registrados para este jugador.
          </div>
        ) : (
          <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {logrosOrdenados.map((logro, index) => (
              <LogroCard key={logro.nombre} logro={logro} index={index} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
