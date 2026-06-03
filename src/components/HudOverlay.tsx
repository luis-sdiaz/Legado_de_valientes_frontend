import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import audioManager from "../game/audio/AudioManager";
import { useGameContext } from "../context/GameContext";
import { EventBus, EVENT_BATTLE_ATTACK } from "../game/EventBus";

type HudOverlayProps = {
  mapName?: string;
  rivalLabel?: string;
  difficultyLabel?: string;
  onToggleSettings?: () => void;
};

export default function HudOverlay({
  mapName = "ARENA DRACO",
  rivalLabel = "Rival: Golem de Piedra",
  difficultyLabel = "Medio",
  onToggleSettings,
}: HudOverlayProps) {
  const navigate = useNavigate();
  const { mascotaActiva, combateActual, ejecutarTurno } = useGameContext();
  const [enemyChip, setEnemyChip] = useState(100);

  const logs = combateActual?.log ?? [];
  const enemyHp = combateActual?.rival.vida ?? 100;
  const enemyHpMax = combateActual?.rival.vidaMax ?? 100;
  const enemyHpPercent = Math.max(0, Math.min(100, (enemyHp / Math.max(1, enemyHpMax)) * 100));

  useEffect(() => {
    const timeout = window.setTimeout(() => setEnemyChip(enemyHpPercent), 450);
    return () => window.clearTimeout(timeout);
  }, [enemyHpPercent]);

  if (!mascotaActiva) return null;

  // const binding preserves the narrowed type (MascotaState, non-null)
  // in all closure contexts including nested function declarations.
  const pet = mascotaActiva;

  const activePetHpPercent = Math.max(
    0,
    Math.min(100, (pet.vida / Math.max(1, pet.vidaMax)) * 100),
  );

  function playHover() {
    audioManager.playSfx("ui_hover");
  }

  function playClick() {
    audioManager.playSfx("ui_click");
  }

  const title = combateActual ? "ARENA DRACO" : mapName;
  const details = combateActual
    ? `Rival: ${combateActual.rival.nombre} • Dificultad: ${combateActual.rival.dificultad}`
    : `${rivalLabel} • Dificultad: ${difficultyLabel}`;
  const resultLabel =
    combateActual?.resultado === "ganado"
      ? "Victoria"
      : combateActual?.resultado === "perdido"
        ? "Derrota"
        : "Batalla en curso";
  const resultTone =
    combateActual?.resultado === "ganado"
      ? "text-emerald-200 border-emerald-400/30 bg-emerald-500/10"
      : combateActual?.resultado === "perdido"
        ? "text-red-200 border-red-400/30 bg-red-500/10"
        : "text-amber-200 border-amber-300/30 bg-amber-500/10";

  function handleAttack() {
    if (!combateActual || combateActual.finalizado) return;

    const attackName =
      pet.elemento === "Fuego"
        ? "Llamarada"
        : pet.elemento === "Tierra"
          ? "Impacto Rocoso"
          : "Vendaval";

    EventBus.emit(EVENT_BATTLE_ATTACK, {
      attackerName: pet.nombre,
      targetName: combateActual.rival.nombre,
      damage: pet.ataque,
      attackName,
      elementoJugador: pet.elemento,
      elementoRival: combateActual.rival.elemento,
      targetKind: "rival",
      targetHpAfter: Math.max(0, combateActual.rival.vida - pet.ataque),
      targetHpMax: combateActual.rival.vidaMax,
      isFinisher: combateActual.rival.vida - pet.ataque <= 0,
    });

    ejecutarTurno();
  }

  return (
    <div className="absolute z-50 bottom-10 left-0 w-full px-6 pointer-events-none flex flex-col justify-end">
      <div className="absolute -top-16 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center justify-center gap-1.5 pointer-events-none">
        <div className="min-w-[280px] rounded-lg border border-stone-800/60 bg-[#0d0f11]/85 px-5 py-2.5 text-center shadow-2xl backdrop-blur-sm">
          <h3 className="text-xs font-bold uppercase tracking-widest text-[#d4af37]">
            {title}
          </h3>
          <p className="text-[11px] font-medium tracking-wide text-gray-400">
            {details}
          </p>
        </div>
      </div>

      <div className="w-full flex justify-between items-end gap-4 pointer-events-auto">
        <div className="flex flex-col items-start gap-3">
          <div className="flex gap-4">
            <button
              type="button"
              onMouseEnter={playHover}
              onClick={() => {
                playClick();
                onToggleSettings?.();
              }}
              className="pointer-events-auto rounded-md border border-[#d4af37]/30 bg-[#1a1c1e] px-4 py-2 text-xs font-medium text-gray-300 shadow-md transition-all duration-200 hover:bg-[#25282a] hover:text-[#d4af37]"
            >
              Ajustes
            </button>
            <button
              type="button"
              onMouseEnter={playHover}
              onClick={() => {
                playClick();
                navigate("/menu");
              }}
              className="pointer-events-auto rounded-md border border-[#d4af37]/30 bg-[#1a1c1e] px-4 py-2 text-xs font-medium text-gray-300 shadow-md transition-all duration-200 hover:bg-[#25282a] hover:text-[#d4af37]"
            >
              Salir
            </button>
          </div>
        </div>

        <div className="pointer-events-auto flex w-[min(24rem,calc(100vw-18rem))] flex-col items-center gap-3">
          {combateActual?.finalizado && (
            <div className={`w-full rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur ${resultTone}`}>
              <div className="text-[0.62rem] uppercase tracking-[0.35em] opacity-80">
                Resultado final
              </div>
              <div className="mt-1 text-sm font-semibold uppercase tracking-[0.22em]">
                {resultLabel}
              </div>
              <div className="mt-1 text-xs text-slate-200/90">
                {combateActual.log.at(-1) ?? "La batalla ha concluido."}
              </div>
            </div>
          )}

          {combateActual?.finalizado ? (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex gap-4 bg-slate-900/80 p-4 rounded-xl border border-amber-500/50 shadow-2xl">
              <div className="px-6 py-2.5 text-xs font-bold uppercase tracking-widest text-[#d4af37]/80">
                Combate Finalizado
              </div>
            </div>
          ) : (
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex gap-4 bg-slate-900/80 p-4 rounded-xl border border-amber-500/50 shadow-2xl">
              <button
                type="button"
                onMouseEnter={playHover}
                onClick={() => {
                  playClick();
                  handleAttack();
                }}
                className="flex-1 whitespace-nowrap rounded-xl border border-red-500/25 bg-[#1e1315]/90 hover:bg-[#34161a] hover:border-red-400/60 px-6 py-3 text-sm font-bold uppercase tracking-wider text-red-200 shadow-md transition-all duration-200"
              >
                Atacar
              </button>
              <button
                type="button"
                onMouseEnter={playHover}
                onClick={() => {
                  playClick();
                  ejecutarTurno("defender");
                }}
                className="flex-1 whitespace-nowrap rounded-xl border border-sky-500/25 bg-[#111823]/90 hover:bg-[#152538] hover:border-sky-400/60 px-6 py-3 text-sm font-bold uppercase tracking-wider text-sky-200 shadow-md transition-all duration-200"
              >
                Defender
              </button>
              <button
                type="button"
                onMouseEnter={playHover}
                onClick={() => {
                  playClick();
                  ejecutarTurno("pasar");
                }}
                className="flex-1 whitespace-nowrap rounded-xl border border-amber-500/20 bg-[#1f1a14]/90 hover:bg-[#2f2416] hover:border-amber-400/60 px-6 py-3 text-sm font-bold uppercase tracking-wider text-amber-200 shadow-md transition-all duration-200"
              >
                Pasar
              </button>
            </div>
          )}

          <div className="w-full rounded-lg border border-stone-800 bg-black/70 px-6 py-2 text-white shadow-[inset_0_0_18px_rgba(0,0,0,0.7),0_12px_24px_rgba(0,0,0,0.35)]">
            <div className="mb-2 text-[0.62rem] uppercase tracking-[0.32em] text-amber-300">
              Bitácora de Batalla
            </div>
            <div className="h-24 overflow-y-auto pr-1">
              <AnimatePresence mode="popLayout">
                {logs.map((l, index) => (
                  <motion.div
                    key={`${index}-${l}`}
                    layout
                    initial={{ opacity: 0, x: 20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: "auto" }}
                    exit={{ opacity: 0, x: 20, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="mb-2 rounded border-l-2 border-amber-400/50 bg-slate-900/40 px-2 py-1 text-xs text-gray-200"
                  >
                    {l}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto w-[min(380px,34vw)]">
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-400/25 bg-black/60 p-4 shadow-2xl backdrop-blur">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.35em] text-emerald-300">
                Mascota activa
              </div>
              <div className="truncate text-sm text-slate-100">
                {pet.nombre}
              </div>
              <div className="text-xs text-slate-300">
                Nivel {pet.nivel} • {pet.especie}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-emerald-400/40 bg-emerald-500/20 text-emerald-200 text-xs font-bold">
              {pet.elemento.substring(0, 3).toUpperCase()}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-slate-600/40 bg-slate-950/60 p-3">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-slate-300">
              <span>Vida</span>
              <span>{pet.vida}/{pet.vidaMax}</span>
            </div>
            <div className="mt-2 relative h-5 overflow-hidden rounded-lg border border-slate-600/40 bg-slate-950/80">
              <motion.div
                className="absolute inset-y-0 left-0 hp-fill-red-dark opacity-40"
                style={{ width: `${activePetHpPercent}%` }}
                animate={{ width: `${activePetHpPercent}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
              <motion.div
                className="absolute inset-y-0 left-0 hp-fill-emerald shadow-lg"
                style={{ width: `${activePetHpPercent}%` }}
                animate={{ width: `${activePetHpPercent}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
              {activePetHpPercent > 0 && (
                <motion.div
                  className="absolute inset-y-0 left-0 hp-overlay-emerald blur-sm opacity-40"
                  style={{ width: `${activePetHpPercent}%` }}
                  animate={{ opacity: [0.3, 0.6, 0.3] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-red-400/25 bg-black/60 p-4 shadow-2xl backdrop-blur">
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-[0.35em] text-red-300">
                Rival
              </div>
              <div className="truncate text-sm text-slate-300">
                {combateActual?.rival.nombre ?? "Rival"}
              </div>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full border border-red-400/40 bg-red-500/20 text-red-200 text-xs font-bold">
              RVL
            </div>
          </div>

          <div className="mt-3 relative h-5 overflow-hidden rounded-lg border border-slate-600/40 bg-slate-950/60">
            <motion.div
              className="absolute inset-y-0 left-0 hp-fill-slate opacity-50"
              style={{ width: `${enemyChip}%` }}
              animate={{ width: `${enemyChip}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 left-0 hp-fill-red shadow-lg"
              style={{ width: `${enemyHpPercent}%` }}
              animate={{ width: `${enemyHpPercent}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            {enemyHp > 0 && (
              <motion.div
                className="absolute inset-y-0 left-0 hp-overlay-red blur-sm opacity-40"
                style={{ width: `${enemyHpPercent}%` }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
          <motion.div
            className="mt-2 text-xs text-red-200"
            animate={{ scale: enemyHpPercent < 30 ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 0.6, repeat: enemyHpPercent < 30 ? Infinity : 0 }}
          >
            HP {enemyHp}/{enemyHpMax}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
