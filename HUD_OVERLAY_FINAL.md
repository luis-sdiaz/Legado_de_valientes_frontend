# src/components/HudOverlay.tsx — Contenido Final Completo

```tsx
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

type LogEntry = { id: string; text: string };

export default function HudOverlay() {
  const [playerHp, setPlayerHp] = useState(100);
  const [playerChip, setPlayerChip] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [enemyChip, setEnemyChip] = useState(100);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    function onDamage(e: any) {
      const detail = e.detail as { target: string; hp: number };
      if (detail.target === "enemy") {
        setEnemyHp(detail.hp);
        // chip effect: delay reduced bar
        setTimeout(() => setEnemyChip(detail.hp), 450);
        pushLog(`Enemigo recibió ${100 - detail.hp} daño`);
      }
      if (detail.target === "player") {
        setPlayerHp(detail.hp);
        setTimeout(() => setPlayerChip(detail.hp), 450);
        pushLog(`Jugador recibió ${100 - detail.hp} daño`);
      }
    }
    window.addEventListener("game-damage", onDamage as EventListener);
    return () =>
      window.removeEventListener("game-damage", onDamage as EventListener);
  }, []);

  useEffect(() => {
    // ensure audioManager exists (volumes loaded)
    // no-op
  }, []);

  function pushLog(text: string) {
    const entry: LogEntry = { id: Math.random().toString(36).slice(2), text };
    setLogs((s) => [entry, ...s].slice(0, 5));
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Health bars */}
      <div className="max-w-4xl mx-auto mt-8 flex justify-between px-8 pointer-events-auto gap-8">
        {/* Player Health */}
        <div className="flex-1 bg-gradient-to-br from-slate-700/90 to-slate-900/80 rounded-xl p-4 shadow-2xl border border-emerald-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-emerald-300">
              JUGADOR
            </div>
            <motion.div
              className="text-lg font-bold text-emerald-400"
              animate={{ scale: playerHp < 30 ? [1, 1.1, 1] : 1 }}
              transition={{
                duration: 0.6,
                repeat: playerHp < 30 ? Infinity : 0,
              }}
            >
              {playerHp}%
            </motion.div>
          </div>
          <div className="relative w-full h-6 bg-slate-950/60 rounded-lg overflow-hidden border border-slate-600/40">
            {/* Chip bar (red, delayed) */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-700 to-red-900 opacity-50"
              style={{ width: `${playerChip}%` }}
              animate={{ width: `${playerChip}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            {/* Main bar (green, fast) */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-400 via-emerald-500 to-emerald-600 shadow-lg"
              style={{ width: `${playerHp}%` }}
              animate={{ width: `${playerHp}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            {/* Glow effect */}
            {playerHp > 0 && (
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-300 to-transparent blur-sm opacity-40"
                style={{ width: `${playerHp}%` }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
        </div>

        {/* Enemy Health */}
        <div className="flex-1 bg-gradient-to-br from-slate-700/90 to-slate-900/80 rounded-xl p-4 shadow-2xl border border-red-500/20 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-3">
            <motion.div
              className="text-lg font-bold text-red-400"
              animate={{ scale: enemyHp < 30 ? [1, 1.1, 1] : 1 }}
              transition={{
                duration: 0.6,
                repeat: enemyHp < 30 ? Infinity : 0,
              }}
            >
              {enemyHp}%
            </motion.div>
            <div className="text-sm font-semibold text-red-300">ENEMIGO</div>
          </div>
          <div className="relative w-full h-6 bg-slate-950/60 rounded-lg overflow-hidden border border-slate-600/40">
            {/* Chip bar (darker red, delayed) */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-slate-800 to-slate-900 opacity-50 ml-auto"
              style={{ width: `${enemyChip}%` }}
              animate={{ width: `${enemyChip}%` }}
              transition={{ duration: 0.9, ease: "easeOut" }}
            />
            {/* Main bar (red, fast) */}
            <motion.div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 via-red-500 to-red-400 shadow-lg ml-auto"
              style={{ width: `${enemyHp}%` }}
              animate={{ width: `${enemyHp}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
            {/* Glow effect */}
            {enemyHp > 0 && (
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-300 to-transparent blur-sm opacity-40 ml-auto"
                style={{ width: `${enemyHp}%` }}
                animate={{ opacity: [0.3, 0.6, 0.3] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            )}
          </div>
        </div>
      </div>

      {/* Battle Log */}
      <div className="absolute right-8 top-32 w-72 pointer-events-auto">
        <div className="bg-slate-900/80 rounded-xl p-4 shadow-2xl border border-amber-500/20 backdrop-blur-sm">
          <div className="text-xs font-semibold text-amber-300 mb-3 uppercase tracking-wider">
            Registro de Batalla
          </div>
          <div className="space-y-2 max-h-24 overflow-hidden">
            <AnimatePresence mode="popLayout">
              {logs.map((l) => (
                <motion.div
                  key={l.id}
                  layout
                  initial={{ opacity: 0, x: 20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-xs text-gray-200 px-2 py-1 bg-slate-800/40 rounded border-l-2 border-amber-400/50"
                >
                  {l.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
```

## Características Implementadas

✅ **Chip Damage System**

- Barra principal (verde jugador / rojo enemigo) baja en **0.3s** (rápido)
- Barra chip (rojo) baja en **0.9s** (retrasada), simulando el efecto de "chip damage"
- Ambas barras usan gradientes y shadow para profundidad

✅ **Glow Effects Animados**

- Brillo pulsante en las barras (animación infinita, duración 2s)
- Gradiente de fade que simula luminiscencia

✅ **Battle Log (Registro de Batalla)**

- Máximo 5 eventos visibles
- Animación de entrada: fade in + slide from right
- Animación de salida suave
- Bordes de color (amber) para matching con tema game UI

✅ **Escalado de Alerta**

- HP bajo (<30%) dispara animación de escala en el número
- Efecto de pulsing: [1, 1.1, 1] para atención visual

✅ **Responsividad**

- `pointer-events-none` en contenedor root, `pointer-events-auto` solo en áreas interactivas
- Flex layout adaptable
- Máximo ancho contenido para legibilidad

✅ **Paleta de Colores**

- Jugador: Emerald 300/400/600 (verde natural)
- Enemigo: Red 300/400/600 (rojo amenazante)
- Fondo: Slate 700/800/900 con `backdrop-blur-sm`
- Bordes: Tones de borde con baja opacidad para sutil
