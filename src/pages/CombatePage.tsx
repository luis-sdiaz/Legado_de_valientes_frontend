import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import audioManager from "../game/audio/AudioManager";
import GameCanvas from "../components/GameCanvas";
import SettingsPanel from "../components/SettingsPanel";
import { useGameContext, type MascotaState } from "../context/GameContext";
import { obtenerMascotas, getMascotaXp, type Mascota as ApiMascota } from "../services/api";
import { EventBus, EVENT_BATTLE_ATTACK, type BattleAttackEvent } from "../game/EventBus";

type Difficulty = "Fácil" | "Medio" | "Difícil";
type DifficultyOption = { label: Difficulty; tone: "easy" | "medium" | "hard"; icon: string; subtitle: string };

const toMascotaState = (m: ApiMascota): MascotaState => ({
  id: String(m.id),
  nombre: m.nombre,
  especie: m.tipo !== undefined ? m.tipo : m.especie ?? "DRAGON",
  ataque: m.ataque,
  defensa: m.defensa,
  vida: m.vida ?? m.salud ?? 100,
  vidaMax: m.vidaMax ?? m.vidaMaxima ?? m.salud ?? 100,
  xp: getMascotaXp(m),
  nivel: m.nivel,
  elemento: m.elemento || "Neutro",
  estado: m.estado || "Listo",
  evolucionada: false,
});

export default function CombatePage() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null);
  const { iniciarCombate, ejecutarTurno, mascotaActiva, setMascotaActiva, combateActual } = useGameContext();

  // ── Refs para acceso sincrónico y sin stale closures ────────────────────────
  const combateRef   = useRef(combateActual);
  const mascotaRef   = useRef(mascotaActiva);
  // isExecutingRef evita doble-click incluso antes del re-render de React
  const isExecutingRef = useRef(false);
  useEffect(() => { combateRef.current  = combateActual; }, [combateActual]);
  useEffect(() => { mascotaRef.current  = mascotaActiva; }, [mascotaActiva]);

  // ── Estado de efectos visuales en los HUDs ──────────────────────────────────
  const [rivalGlowing,  setRivalGlowing]  = useState(false); // rojo ataque
  const [rivalShaking,  setRivalShaking]  = useState(false);
  const [playerGlowing, setPlayerGlowing] = useState(false); // azul defensa
  const [playerShaking, setPlayerShaking] = useState(false);
  const [floatDmgRival,  setFloatDmgRival]  = useState<{ v: number; k: number } | null>(null);
  const [floatDmgPlayer, setFloatDmgPlayer] = useState<{ v: number; k: number } | null>(null);
  const [actionLabel, setActionLabel] = useState<{ text: string; kind: "defend" | "pass" } | null>(null);
  const floatKeyRef = useRef(0);

  // ── Backend de mascotas ──────────────────────────────────────────────────────
  const jugadorId = localStorage.getItem("ldv_player_id") ?? "";
  const { data: mascotasLista, isLoading: mascotasLoading, error: mascotasError } = useQuery<ApiMascota[]>({
    queryKey: ["mascotas", jugadorId],
    queryFn: () => obtenerMascotas(jugadorId),
    enabled: !!jugadorId,
  });

  useEffect(() => {
    if (!mascotaActiva && mascotasLista?.length) setMascotaActiva(toMascotaState(mascotasLista[0]));
  }, [mascotasLista, mascotaActiva, setMascotaActiva]);

  // ── Finisher: detecta fin de combate y lanza efecto Phaser ──────────────────
  const finalizerFiredRef = useRef(false);
  useEffect(() => {
    if (!combateActual?.finalizado || finalizerFiredRef.current) return;
    if (!mascotaActiva) return;
    finalizerFiredRef.current = true;
    const isWin = combateActual.resultado === "ganado";
    setTimeout(() => {
      EventBus.emit(EVENT_BATTLE_ATTACK, {
        attackerName:    isWin ? mascotaActiva.nombre       : combateActual.rival.nombre,
        targetName:      isWin ? combateActual.rival.nombre : mascotaActiva.nombre,
        damage:          isWin ? mascotaActiva.ataque        : combateActual.rival.ataque,
        attackName:      "Golpe Final",
        elementoJugador: mascotaActiva.elemento,
        elementoRival:   combateActual.rival.elemento ?? "Neutro",
        targetKind:      isWin ? "rival" : "player",
        isFinisher:      true,
      } as BattleAttackEvent);
    }, 250);
  }, [combateActual?.finalizado]);

  useEffect(() => {
    if (!combateActual?.finalizado) finalizerFiredRef.current = false;
  }, [combateActual?.id]);

  // ── Helpers de efectos ───────────────────────────────────────────────────────
  function emitPhaser(targetKind: "rival" | "player") {
    // Wrapped in try/catch: if Phaser scene isn't ready it must not block the UI state machine
    try {
      const m = mascotaRef.current;
      const c = combateRef.current;
      if (!m || !c) return;
      EventBus.emit(EVENT_BATTLE_ATTACK, {
        attackerName:    targetKind === "rival" ? m.nombre       : c.rival.nombre,
        targetName:      targetKind === "rival" ? c.rival.nombre : m.nombre,
        damage:          targetKind === "rival" ? m.ataque        : c.rival.ataque,
        attackName:      targetKind === "rival" ? "Ataque"        : "Contraataque",
        elementoJugador: m.elemento,
        elementoRival:   c.rival.elemento ?? "Neutro",
        targetKind,
        isFinisher:      false,
      } as BattleAttackEvent);
    } catch {
      // Phaser error ignored — UI effects continue regardless
    }
  }

  function showFloat(side: "rival" | "player", value: number) {
    floatKeyRef.current += 1;
    const k = floatKeyRef.current;
    if (side === "rival") {
      setFloatDmgRival({ v: value, k });
      setTimeout(() => setFloatDmgRival(null), 900);
    } else {
      setFloatDmgPlayer({ v: value, k });
      setTimeout(() => setFloatDmgPlayer(null), 900);
    }
  }

  function playHover() { audioManager.playSfx("ui_hover"); }
  function playClick() { audioManager.playSfx("ui_click"); }

  // ── Acción: ATACAR ───────────────────────────────────────────────────────────
  async function handleAtacar() {
    if (isExecutingRef.current) return;
    if (!combateActual || combateActual.finalizado || !mascotaActiva) return;

    const rivalAtq = combateActual.rival.ataque;
    const myAtq    = mascotaActiva.ataque;
    isExecutingRef.current = true;

    try {
      playClick();
      emitPhaser("rival");
      setRivalGlowing(true);
      setRivalShaking(true);
      showFloat("rival", myAtq);
      setTimeout(() => { setRivalGlowing(false); setRivalShaking(false); }, 480);

      await ejecutarTurno("atacar");
    } finally {
      // Siempre libera el lock, aunque emitPhaser u otro paso falle
      isExecutingRef.current = false;
    }

    // Contraataque del rival (efecto independiente, no bloquea botones)
    setTimeout(() => {
      if (combateRef.current && !combateRef.current.finalizado) {
        emitPhaser("player");
        setPlayerShaking(true);
        showFloat("player", rivalAtq);
        setTimeout(() => setPlayerShaking(false), 480);
      }
    }, 350);
  }

  // ── Acción: DEFENDER ─────────────────────────────────────────────────────────
  async function handleDefender() {
    if (isExecutingRef.current) return;
    if (!combateActual || combateActual.finalizado || !mascotaActiva) return;

    const rivalAtq = combateActual.rival.ataque;
    isExecutingRef.current = true;

    try {
      playClick();
      setPlayerGlowing(true);
      setActionLabel({ text: "DEFENSA", kind: "defend" });
      setTimeout(() => setActionLabel(null), 700);

      await ejecutarTurno("defender");
    } finally {
      isExecutingRef.current = false;
    }

    // Rival ataca con daño reducido (efecto independiente)
    setTimeout(() => {
      const reducedDmg = Math.max(1, Math.floor(rivalAtq * 0.5));
      emitPhaser("player");
      setPlayerShaking(true);
      showFloat("player", reducedDmg);
      setTimeout(() => { setPlayerShaking(false); setPlayerGlowing(false); }, 480);
    }, 400);
  }

  // ── Acción: PASAR TURNO ──────────────────────────────────────────────────────
  async function handlePasar() {
    if (isExecutingRef.current) return;
    if (!combateActual || combateActual.finalizado) return;

    const rivalAtq = combateActual.rival.ataque;
    isExecutingRef.current = true;

    try {
      playClick();
      setActionLabel({ text: "TURNO PASADO", kind: "pass" });
      setTimeout(() => setActionLabel(null), 600);

      await ejecutarTurno("pasar");
    } finally {
      isExecutingRef.current = false;
    }

    // El rival aprovecha y ataca (efecto independiente)
    setTimeout(() => {
      if (combateRef.current && !combateRef.current.finalizado) {
        emitPhaser("player");
        setPlayerShaking(true);
        showFloat("player", rivalAtq);
        setTimeout(() => setPlayerShaking(false), 480);
      }
    }, 280);
  }

  // ── Pantallas de estado ──────────────────────────────────────────────────────
  if (mascotasLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#020617] text-white">
        <div className="text-center">
          <div className="mb-4 text-2xl">Cargando tus mascotas...</div>
          <div className="h-2 w-32 mx-auto bg-amber-500/20 rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-amber-500 animate-pulse" />
          </div>
        </div>
      </div>
    );
  }
  if (mascotasError) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#020617] text-white">
        <div className="text-red-500 text-xl mb-4">Error al cargar las mascotas</div>
        <button onClick={() => navigate("/mascotas")} className="rounded-full border border-amber-500 px-6 py-2 text-amber-500 hover:bg-amber-500/10">
          Ir al Criadero
        </button>
      </div>
    );
  }
  if (!mascotasLista || mascotasLista.length === 0) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#020617] text-white">
        <div className="text-2xl mb-4">No tienes mascotas</div>
        <p className="mb-6 text-slate-400">Debes crear una mascota antes de combatir.</p>
        <button onClick={() => navigate("/mascotas")} className="rounded-full border border-amber-500 px-6 py-2 text-amber-500 hover:bg-amber-500/10">
          Crear Mascota
        </button>
      </div>
    );
  }
  if (!mascotaActiva) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-[#020617] text-white">
        <div className="text-2xl mb-4">Activando mascota...</div>
        <div className="h-2 w-32 mx-auto bg-amber-500/20 rounded-full overflow-hidden">
          <div className="h-full w-full bg-amber-500 animate-pulse" />
        </div>
      </div>
    );
  }

  const options: DifficultyOption[] = [
    { label: "Fácil",   tone: "easy",   icon: "✦", subtitle: "Ritmo de iniciación" },
    { label: "Medio",   tone: "medium", icon: "◈", subtitle: "Prueba de temple" },
    { label: "Difícil", tone: "hard",   icon: "☠", subtitle: "Juicio de los valientes" },
  ];

  async function selectDifficulty(opt: DifficultyOption) {
    playClick();
    setDifficulty(opt.label);
    await iniciarCombate(opt.label);
  }

  if (!difficulty) {
    const TONE_COLORS = {
      easy:   { border: "rgba(0,210,90,0.35)",  hover: "rgba(0,210,90,0.65)",  glow: "rgba(0,200,80,0.25)",  icon: "rgba(0,180,70,0.18)",  iconBorder: "rgba(0,220,100,0.45)", text: "#4ade80", strip: "#00dc64" },
      medium: { border: "rgba(0,160,255,0.35)", hover: "rgba(0,210,255,0.65)", glow: "rgba(0,150,255,0.25)", icon: "rgba(0,130,255,0.18)", iconBorder: "rgba(0,190,255,0.45)", text: "#60a5fa", strip: "#00c8ff" },
      hard:   { border: "rgba(220,40,40,0.35)", hover: "rgba(255,70,70,0.65)", glow: "rgba(200,40,40,0.25)", icon: "rgba(200,30,30,0.18)", iconBorder: "rgba(240,70,70,0.45)", text: "#f87171", strip: "#ff3a3a" },
    };
    return (
      <div style={{ position: "fixed", inset: 0, background: "#010712", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", fontFamily: "'Segoe UI', Roboto, sans-serif" }}>
        <style>{`
          /* Ambient radial glow */
          .hud-select-bg::before {
            content: ''; position: absolute; inset: 0; pointer-events: none;
            background: radial-gradient(ellipse 60% 50% at 50% 60%, rgba(0,140,255,0.09) 0%, transparent 70%);
          }
          /* Holographic rings */
          @keyframes ringBreath {
            0%, 100% { opacity: 0.35; }
            50%       { opacity: 0.85; box-shadow: 0 0 14px rgba(0,180,255,0.5); }
          }
          @keyframes centerGlow {
            0%, 100% { transform: translate(-50%,-50%) scale(1);   opacity: 0.7; }
            50%       { transform: translate(-50%,-50%) scale(1.5); opacity: 1;   }
          }
          /* Corner brackets */
          .hud-box::before, .hud-box::after,
          .hud-corner-tr::before, .hud-corner-bl::before {
            content: ''; position: absolute; width: 22px; height: 22px;
            border-color: rgba(0,212,255,0.95); border-style: solid;
          }
          .hud-box::before  { top: -1px; left: -1px;  border-width: 2px 0 0 2px; }
          .hud-box::after   { bottom: -1px; right: -1px; border-width: 0 2px 2px 0; }
          .hud-corner-tr::before { top: -1px; right: -1px; border-width: 2px 2px 0 0; }
          .hud-corner-bl::before { bottom: -1px; left: -1px; border-width: 0 0 2px 2px; }
          /* Scanlines */
          .hud-scanlines {
            position: absolute; inset: 0; pointer-events: none; border-radius: 4px;
            background: repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.04) 3px, rgba(0,0,0,0.04) 4px);
          }
          /* Dot pulse */
          @keyframes dotPulse {
            0%, 100% { opacity: 0.25; }
            50%       { opacity: 0.7;  }
          }
          /* Button hover strip */
          .diff-row { position: relative; overflow: hidden; }
          .diff-row::before {
            content: ''; position: absolute; left: 0; top: 0; bottom: 0;
            width: 3px; border-radius: 2px 0 0 2px;
            background: transparent; transition: background 0.2s;
          }
          .diff-row:hover::before { background: var(--strip-color); }
          .diff-row:hover { transform: translateX(5px); }
          .diff-row:active { transform: translateX(3px) scale(0.99); }
          /* HUD horizontal divider */
          .hud-divider {
            height: 1px;
            background: linear-gradient(to right, transparent, rgba(0,180,255,0.5) 30%, rgba(0,212,255,0.7) 50%, rgba(0,180,255,0.5) 70%, transparent);
            margin: 20px 0 28px;
          }
        `}</style>

        {/* Background glow */}
        <div className="hud-select-bg" style={{ position: "absolute", inset: 0, pointerEvents: "none" }} />

        {/* Holographic rings (bottom stage) */}
        <div style={{ position: "absolute", bottom: -80, left: "50%", transform: "translateX(-50%)", width: 700, height: 220, pointerEvents: "none" }}>
          {[
            { w: 100, h: 32,  delay: "0s",    color: "rgba(0,212,255,0.7)" },
            { w: 200, h: 64,  delay: "0.25s", color: "rgba(0,190,255,0.5)" },
            { w: 330, h: 106, delay: "0.5s",  color: "rgba(0,160,255,0.35)" },
            { w: 480, h: 155, delay: "0.75s", color: "rgba(0,130,255,0.22)" },
            { w: 640, h: 206, delay: "1s",    color: "rgba(0,100,255,0.14)" },
          ].map((r, i) => (
            <div key={i} style={{
              position: "absolute", left: "50%", top: "50%",
              transform: "translate(-50%,-50%)",
              width: r.w, height: r.h,
              border: `1px solid ${r.color}`,
              borderRadius: "50%",
              animation: `ringBreath 2.8s ease-in-out ${r.delay} infinite`,
            }} />
          ))}
          {/* Center glow dot */}
          <div style={{
            position: "absolute", left: "50%", top: "50%",
            transform: "translate(-50%,-50%)",
            width: 18, height: 18,
            background: "radial-gradient(circle, #00d4ff, transparent)",
            borderRadius: "50%",
            boxShadow: "0 0 20px rgba(0,212,255,0.9), 0 0 40px rgba(0,150,255,0.5)",
            animation: "centerGlow 2s ease-in-out infinite",
          }} />
          {/* Vertical light column */}
          <div style={{
            position: "absolute", left: "50%", top: 0, bottom: "50%",
            transform: "translateX(-50%)", width: 1,
            background: "linear-gradient(to top, rgba(0,212,255,0.6), transparent)",
            pointerEvents: "none",
          }} />
        </div>

        {/* Side dot grids */}
        {(["left", "right"] as const).map((side) => (
          <div key={side} style={{
            position: "absolute", top: "50%", transform: "translateY(-50%)",
            [side]: 40,
            display: "grid", gridTemplateColumns: "repeat(5, 8px)", gap: "10px",
            opacity: 0.8,
          }}>
            {Array.from({ length: 35 }).map((_, i) => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "rgba(0,180,255,0.7)",
                animation: `dotPulse 3s ease-in-out ${(i * 0.09) % 3}s infinite`,
              }} />
            ))}
          </div>
        ))}

        {/* Main HUD frame */}
        <div style={{ position: "relative", width: "min(780px, calc(100vw - 120px))", zIndex: 10 }}>

          {/* Glowing box */}
          <div className="hud-box" style={{
            background: "rgba(0,8,22,0.93)",
            border: "1px solid rgba(0,180,255,0.5)",
            borderRadius: 4,
            padding: "40px 48px",
            position: "relative",
            boxShadow: "0 0 0 1px rgba(0,180,255,0.08), 0 0 35px rgba(0,140,255,0.18), 0 0 80px rgba(0,80,200,0.1), inset 0 0 50px rgba(0,40,100,0.25)",
          }}>
            {/* Extra corner brackets */}
            <div className="hud-corner-tr" style={{ position: "absolute" }} />
            <div className="hud-corner-bl" style={{ position: "absolute" }} />
            {/* Scanlines */}
            <div className="hud-scanlines" />

            {/* Header */}
            <div style={{ textAlign: "center", marginBottom: 4, fontSize: 10, letterSpacing: "0.4em", color: "rgba(0,212,255,0.6)", textTransform: "uppercase" }}>
              Arena Draco · Sistema de Combate
            </div>
            <div style={{
              textAlign: "center", fontSize: "clamp(26px,3.5vw,42px)", fontWeight: 900,
              letterSpacing: "0.12em", textTransform: "uppercase", color: "#fff",
              textShadow: "0 0 20px rgba(0,212,255,0.55), 0 0 50px rgba(0,140,255,0.25)",
              marginBottom: 6,
            }}>
              Selecciona Dificultad
            </div>
            <div style={{ textAlign: "center", fontSize: 10, letterSpacing: "0.32em", color: "rgba(180,220,255,0.45)", textTransform: "uppercase" }}>
              Elige tu nivel · Invoca el enfrentamiento
            </div>

            <div className="hud-divider" />

            {/* Difficulty buttons */}
            {options.map((opt) => {
              const c = TONE_COLORS[opt.tone];
              return (
                <button
                  key={opt.label}
                  type="button"
                  onMouseEnter={playHover}
                  onClick={() => selectDifficulty(opt)}
                  className="diff-row"
                  style={{
                    "--strip-color": c.strip,
                    display: "flex", alignItems: "center", gap: 20,
                    width: "100%", padding: "16px 20px",
                    background: "rgba(0,18,45,0.5)",
                    border: `1px solid ${c.border}`,
                    borderRadius: 6, cursor: "pointer", marginBottom: 12,
                    transition: "all 0.18s ease",
                  } as React.CSSProperties}
                  onMouseOver={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,30,70,0.75)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = c.hover;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 0 22px ${c.glow}, inset 0 0 18px rgba(0,80,180,0.08)`;
                  }}
                  onMouseOut={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = "rgba(0,18,45,0.5)";
                    (e.currentTarget as HTMLButtonElement).style.borderColor = c.border;
                    (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 50, height: 50, borderRadius: 10, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 22, color: c.text,
                    background: c.icon, border: `1px solid ${c.iconBorder}`,
                    boxShadow: `0 0 12px ${c.glow}`,
                  }}>
                    {opt.icon}
                  </div>
                  {/* Text */}
                  <div style={{ textAlign: "left" }}>
                    <div style={{ fontSize: 17, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "#e2e8f0" }}>
                      {opt.label}
                    </div>
                    <div style={{ fontSize: 10, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(148,163,184,0.65)", marginTop: 3 }}>
                      {opt.subtitle}
                    </div>
                  </div>
                  {/* Right sigil */}
                  <div style={{ marginLeft: "auto", fontSize: 18, color: c.text, opacity: 0.4 }}>
                    {opt.tone === "hard" ? "☠" : opt.tone === "medium" ? "✶" : "✦"}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Vista de combate ─────────────────────────────────────────────────────────
  return (
    <div className="rpg-combat-page-container">
      <style>{`
        .rpg-combat-page-container {
          position: relative; width: 100vw; height: 100vh; background-color: #000;
          overflow: hidden; color: #fff; font-family: 'Segoe UI', Roboto, sans-serif; user-select: none;
        }
        .vignette-overlay {
          position: absolute; inset: 0; pointer-events: none; z-index: 1;
          background-image: radial-gradient(circle at center,
            rgba(255,255,255,0.01) 0%, rgba(7,10,18,0.4) 60%, rgba(7,10,18,0.9) 100%);
        }
        .ui-master-layer {
          position: absolute; inset: 0; z-index: 50; pointer-events: none; width: 100%; height: 100%;
        }
        .pointer-auto { pointer-events: auto; }

        /* Top bar */
        .top-left-actions { position: absolute; top: 16px; left: 16px; display: flex; gap: 8px; }
        .rpg-btn-sm {
          background: rgba(9,13,24,0.9); border: 1px solid rgba(245,158,11,0.3);
          color: #fef3c7; padding: 8px 16px; font-size: 11px; font-weight: 700;
          border-radius: 6px; cursor: pointer; transition: all 0.18s;
        }
        .rpg-btn-sm:hover { background: #1e1b4b; border-color: #f59e0b; color: #fff; }
        .rpg-btn-sm-exit  { border-color: rgba(71,85,105,0.5); color: #94a3b8; }
        .rpg-btn-sm-exit:hover { background: #1e293b; border-color: #cbd5e1; color: #fff; }

        /* Arena badge */
        .top-center-header { position: absolute; top: 16px; left: 50%; transform: translateX(-50%); }
        .arena-badge {
          border: 2px solid rgba(217,119,6,0.4);
          background: linear-gradient(to bottom, #0f172a, #020617);
          padding: 10px 32px; text-align: center; border-radius: 12px;
          box-shadow: 0 4px 25px rgba(0,0,0,0.8); backdrop-filter: blur(8px);
        }
        .arena-badge h3 { margin: 0; font-size: 12px; font-weight: 900; letter-spacing: 0.2em; color: #f59e0b; }
        .arena-badge p  { margin: 4px 0 0; font-size: 10px; color: rgba(254,243,199,0.7); }

        /* HUD panels */
        .hud-panel {
          position: absolute; bottom: 120px; width: 260px; padding: 16px;
          border-radius: 12px; backdrop-filter: blur(8px);
          background: linear-gradient(to bottom, rgba(15,23,42,0.95), rgba(2,6,23,0.95));
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .hud-player { left: 24px;  border: 2px solid rgba(16,185,129,0.4); }
        .hud-rival  { right: 24px; border: 2px solid rgba(220,38,38,0.4);  }
        .hud-header { display: flex; justify-content: space-between; align-items: flex-start; }
        .hud-kicker-player { font-size: 9px; font-weight: 900; color: #10b981; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
        .hud-kicker-rival  { font-size: 9px; font-weight: 900; color: #f43f5e; text-transform: uppercase; letter-spacing: 0.1em; margin: 0; }
        .hud-name { font-size: 16px; font-weight: 900; margin: 2px 0 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .hud-tag  { font-size: 9px; font-weight: 900; padding: 2px 6px; border-radius: 4px; background: #064e3b; border: 1px solid rgba(52,211,153,0.3); color: #a7f3d0; }
        .hud-rival .hud-tag { background: #7f1d1d; border-color: rgba(248,113,113,0.3); color: #fecdd3; }
        .hud-sub  { font-size: 10px; color: #94a3b8; margin: 2px 0 0; }
        .hp-container { margin-top: 12px; }
        .hp-bar-track { height: 10px; background: #020617; border-radius: 6px; overflow: hidden; border: 1px solid #111827; }
        .hp-bar-fill  { height: 100%; transition: width 0.4s ease-out; }
        .hp-fill-player { background: linear-gradient(to right, #059669, #34d399); }
        .hp-fill-rival  { background: linear-gradient(to right, #b91c1c, #f43f5e); }
        .hp-text-row { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; margin-top: 4px; }
        .hp-label           { color: #64748b; }
        .hp-values-player   { color: #34d399; }
        .hp-values-rival    { color: #f43f5e; }

        /* HUD: sacudida al recibir daño */
        @keyframes hudShake {
          0%, 100% { transform: translateX(0) }
          18%  { transform: translateX(-9px) }
          36%  { transform: translateX(9px)  }
          54%  { transform: translateX(-6px) }
          72%  { transform: translateX(5px)  }
          88%  { transform: translateX(-2px) }
        }
        .hud-panel.shaking { animation: hudShake 0.44s cubic-bezier(0.36,0.07,0.19,0.97); }

        /* HUD rival: brillo rojo cuando recibe ataque */
        @keyframes rivalHit {
          0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,0.7); border-color: rgba(220,38,38,0.4); }
          35%  { box-shadow: 0 0 0 3px rgba(239,68,68,0.6), 0 0 40px rgba(220,38,38,0.7); border-color: rgba(239,68,68,0.95); }
          70%  { box-shadow: 0 0 0 1px rgba(239,68,68,0.3), 0 0 18px rgba(220,38,38,0.4); border-color: rgba(239,68,68,0.6); }
        }
        .hud-rival.glowing { animation: rivalHit 0.5s ease-out; }

        /* HUD player: brillo azul al defender */
        @keyframes shieldGlow {
          0%, 100% { box-shadow: 0 10px 30px rgba(0,0,0,0.7); border-color: rgba(16,185,129,0.4); }
          30%  { box-shadow: 0 0 0 4px rgba(96,165,250,0.55), 0 0 45px rgba(59,130,246,0.75); border-color: rgba(96,165,250,0.95); }
          70%  { box-shadow: 0 0 0 2px rgba(96,165,250,0.3),  0 0 20px rgba(59,130,246,0.5);  border-color: rgba(96,165,250,0.6); }
        }
        .hud-player.glowing { animation: shieldGlow 0.75s ease-in-out; }

        /* Battle log */
        .battle-log-box {
          position: absolute; top: 150px; right: 24px; width: 260px;
          background: rgba(2,6,23,0.9); border: 1px solid rgba(217,119,6,0.25);
          border-radius: 12px; padding: 12px; backdrop-filter: blur(6px);
        }
        .log-title   { font-size: 9px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; color: rgba(245,158,11,0.8); margin: 0 0 8px; }
        .log-scroller { max-height: 120px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; scrollbar-width: none; }
        .log-scroller::-webkit-scrollbar { display: none; }
        .log-line { font-size: 11px; margin: 0; padding-left: 8px; border-left: 2px solid rgba(245,158,11,0.4); color: #d1d5db; line-height: 1.4; font-weight: 500; }

        /* Action bar */
        .action-bar-dock {
          position: absolute; bottom: 24px; left: 50%; transform: translateX(-50%);
          display: flex; align-items: center; gap: 16px;
          background: rgba(2,6,23,0.96); padding: 14px 28px; border-radius: 14px;
          border: 2px solid rgba(245,158,11,0.6);
          box-shadow: 0 0 40px rgba(0,0,0,0.9), inset 0 0 20px rgba(245,158,11,0.12);
          backdrop-filter: blur(10px);
        }
        .rpg-btn-action {
          position: relative; padding: 12px 24px; font-size: 11px; font-weight: 900;
          text-transform: uppercase; letter-spacing: 0.15em; border-radius: 6px; cursor: pointer;
          min-width: 130px; border: 1px solid transparent;
          box-shadow: 0 4px 12px rgba(0,0,0,0.5);
          transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .rpg-btn-action:not(:disabled):hover  { transform: translateY(-2px); }
        .rpg-btn-action:not(:disabled):active { transform: scale(0.87) translateY(3px); box-shadow: 0 1px 4px rgba(0,0,0,0.7); }
        .rpg-btn-action:disabled { opacity: 0.35; cursor: not-allowed; transform: none !important; }
        .btn-attack { background: linear-gradient(to bottom, #991b1b, #450a0a); color: #fee2e2; border-color: rgba(239,68,68,0.4); }
        .btn-attack:not(:disabled):hover { background: linear-gradient(to bottom, #b91c1c, #7f1d1d); border-color: #f87171; box-shadow: 0 0 24px rgba(239,68,68,0.5); }
        .btn-defend { background: linear-gradient(to bottom, #1e40af, #1e3a8a); color: #dbeafe; border-color: rgba(59,130,246,0.4); }
        .btn-defend:not(:disabled):hover { background: linear-gradient(to bottom, #2563eb, #1d4ed8); border-color: #60a5fa; box-shadow: 0 0 24px rgba(59,130,246,0.5); }
        .btn-pass   { background: linear-gradient(to bottom, #334155, #0f172a); color: #e2e8f0; border-color: rgba(148,163,184,0.3); }
        .btn-pass:not(:disabled):hover   { background: linear-gradient(to bottom, #475569, #1e293b); border-color: #94a3b8; box-shadow: 0 0 15px rgba(148,163,184,0.3); }

        /* Resultado final */
        .end-battle-box { display: flex; flex-direction: column; align-items: center; gap: 10px; min-width: 280px; text-align: center; }
        .end-title      { font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.15em; margin: 0; }
        .end-title.win  { color: #34d399; text-shadow: 0 0 12px rgba(16,185,129,0.5); }
        .end-title.lose { color: #f43f5e; text-shadow: 0 0 12px rgba(239,68,68,0.5); }
        .btn-back-menu  { background: linear-gradient(to bottom, #f59e0b, #b45309); color: #020617; border-color: #fbbf24; }
        .btn-back-menu:hover { background: linear-gradient(to bottom, #fbbf24, #d97706); box-shadow: 0 0 15px rgba(245,158,11,0.5); }

        /* Número de daño flotante */
        @keyframes floatUp {
          0%   { opacity: 1; transform: translateY(0)    scale(1.25); }
          30%  { opacity: 1; transform: translateY(-32px) scale(1.35); }
          100% { opacity: 0; transform: translateY(-95px) scale(0.9);  }
        }
        .float-dmg {
          position: absolute; font-size: 30px; font-weight: 900; pointer-events: none; z-index: 70;
          text-shadow: 0 2px 10px rgba(0,0,0,0.95), 0 0 14px currentColor;
          animation: floatUp 0.85s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
        }
        .float-dmg.rival-side  { right: 120px; bottom: 295px; color: #f87171; }
        .float-dmg.player-side { left:  120px; bottom: 295px; color: #fb923c; }

        /* Label de acción (DEFENSA / TURNO PASADO) */
        @keyframes labelPop {
          0%   { opacity: 0; transform: translate(-50%,-50%) scale(0.75); }
          20%  { opacity: 1; transform: translate(-50%,-58%) scale(1.12); }
          80%  { opacity: 1; transform: translate(-50%,-65%) scale(1.0);  }
          100% { opacity: 0; transform: translate(-50%,-76%) scale(0.9);  }
        }
        .action-label {
          position: absolute; top: 50%; left: 50%;
          font-size: 20px; font-weight: 900; letter-spacing: 0.18em;
          pointer-events: none; z-index: 70;
          animation: labelPop 0.75s cubic-bezier(0.22,1,0.36,1) forwards;
        }
        .action-label.defend { color: #93c5fd; text-shadow: 0 0 24px rgba(96,165,250,0.9), 0 2px 8px #000; }
        .action-label.pass   { color: #94a3b8;  text-shadow: 0 2px 10px rgba(0,0,0,0.9); }
      `}</style>

      <div className="vignette-overlay" />

      <div style={{ position: "relative", width: "100%", height: "100%" }}>
        {/* Canvas Phaser */}
        <div style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }}>
          <GameCanvas />
        </div>

        <div className="ui-master-layer">

          {/* Daño flotante rival */}
          {floatDmgRival && (
            <div key={floatDmgRival.k} className="float-dmg rival-side">-{floatDmgRival.v}</div>
          )}

          {/* Daño flotante jugador */}
          {floatDmgPlayer && (
            <div key={floatDmgPlayer.k} className="float-dmg player-side">-{floatDmgPlayer.v}</div>
          )}

          {/* Label de acción */}
          {actionLabel && (
            <div key={actionLabel.text} className={`action-label ${actionLabel.kind}`}>
              {actionLabel.text}
            </div>
          )}

          {/* Top left */}
          <div className="top-left-actions pointer-auto">
            <button type="button" onMouseEnter={playHover} onClick={() => { playClick(); setShowSettings((p) => !p); }} className="rpg-btn-sm">
              Ajustes
            </button>
            <button type="button" onMouseEnter={playHover} onClick={() => { playClick(); navigate("/menu"); }} className="rpg-btn-sm rpg-btn-sm-exit">
              Salir
            </button>
          </div>

          {/* Arena badge */}
          <div className="top-center-header">
            <div className="arena-badge">
              <h3>ARENA DRACO</h3>
              <p>{combateActual ? `${combateActual.rival.nombre} · ${combateActual.rival.dificultad}` : difficulty}</p>
            </div>
          </div>

          {/* HUD jugador */}
          <div className={`hud-panel hud-player pointer-auto${playerGlowing ? " glowing" : ""}${playerShaking ? " shaking" : ""}`}>
            <div className="hud-header">
              <div>
                <p className="hud-kicker-player">Tu mascota</p>
                <h4 className="hud-name">{mascotaActiva.nombre}</h4>
              </div>
              <span className="hud-tag">Nv.{mascotaActiva.nivel}</span>
            </div>
            <p className="hud-sub">{mascotaActiva.especie}</p>
            <div className="hp-container">
              <div className="hp-bar-track">
                <div className="hp-bar-fill hp-fill-player" style={{ width: `${Math.max(0, (mascotaActiva.vida / mascotaActiva.vidaMax) * 100)}%` }} />
              </div>
              <div className="hp-text-row">
                <span className="hp-label">HP</span>
                <span className="hp-values-player">{mascotaActiva.vida} / {mascotaActiva.vidaMax}</span>
              </div>
            </div>
          </div>

          {/* HUD rival */}
          <div className={`hud-panel hud-rival pointer-auto${rivalGlowing ? " glowing" : ""}${rivalShaking ? " shaking" : ""}`}>
            <div className="hud-header">
              <div>
                <p className="hud-kicker-rival">Rival Oscuro</p>
                <h4 className="hud-name">{combateActual?.rival.nombre ?? "Enemigo"}</h4>
              </div>
              <span className="hud-tag">RIVAL</span>
            </div>
            <p className="hud-sub">Fuerza Hostil</p>
            <div className="hp-container">
              <div className="hp-bar-track">
                <div className="hp-bar-fill hp-fill-rival" style={{ width: `${combateActual ? Math.max(0, (combateActual.rival.vida / combateActual.rival.vidaMax) * 100) : 0}%` }} />
              </div>
              <div className="hp-text-row">
                <span className="hp-label">HP</span>
                <span className="hp-values-rival">{combateActual?.rival.vida ?? "??"} / {combateActual?.rival.vidaMax ?? "??"}</span>
              </div>
            </div>
          </div>

          {/* Bitácora */}
          {combateActual && combateActual.log.length > 0 && (
            <div className="battle-log-box pointer-auto">
              <h5 className="log-title">Bitácora de Guerra</h5>
              <div className="log-scroller">
                {combateActual.log.slice(-10).map((line, i) => (
                  <p key={i} className="log-line">{line}</p>
                ))}
              </div>
            </div>
          )}

          {/* Barra de acciones */}
          <div className="action-bar-dock pointer-auto">
            {combateActual?.finalizado ? (
              <div className="end-battle-box">
                <p className={`end-title ${combateActual.resultado === "ganado" ? "win" : "lose"}`}>
                  {combateActual.resultado === "ganado" ? "¡Victoria!" : "Derrota"}
                </p>
                {combateActual.recompensas && (
                  <div style={{ display: "flex", gap: 16, fontSize: 12, fontWeight: 700, color: "#fef3c7", letterSpacing: "0.1em" }}>
                    <span>+{combateActual.recompensas.experiencia} XP</span>
                    <span>+{combateActual.recompensas.monedas} ORO</span>
                  </div>
                )}
                <button type="button" onMouseEnter={playHover} onClick={() => { playClick(); navigate("/menu"); }} className="rpg-btn-action btn-back-menu">
                  Regresar al menu
                </button>
              </div>
            ) : (
              <>
                <button type="button" onMouseEnter={playHover} onClick={handleAtacar}  className="rpg-btn-action btn-attack">ATACAR</button>
                <button type="button" onMouseEnter={playHover} onClick={handleDefender} className="rpg-btn-action btn-defend">DEFENDER</button>
                <button type="button" onMouseEnter={playHover} onClick={handlePasar}   className="rpg-btn-action btn-pass">PASAR</button>
              </>
            )}
          </div>

        </div>
      </div>

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}
