import { motion } from "framer-motion";
import type { ReactNode } from "react";
import audioManager from "../game/audio/AudioManager";

type MainMenuProps = {
  onPlay: () => void;
  onPets?: () => void;
  onProfile?: () => void;
  onExit?: () => void;
};

type MenuAction = {
  label: string;
  helper: string;
  onClick?: () => void;
  icon: ReactNode;
  badge: string;
  accent?: boolean;
  placement: string;
};

// --- Iconos con diseño estilizado ---
function SwordIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M14.5 3.5l6 6-2.5 2.5-6-6 2.5-2.5zM3.5 14.5l6-6 2.5 2.5-6 6-2.5-2.5zM11 10l3 3-6.5 6.5L4.5 16 11 10z" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M5 4h7a3 3 0 013 3v13a3 3 0 00-3-3H5V4zm14 0h-7a3 3 0 00-3 3v13a3 3 0 013-3h7V4z" />
    </svg>
  );
}

function TempleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M2 9h20L12 3 2 9zm2 2h16v2H4v-2zm2 4h2v6H6v-6zm5 0h2v6h-2v-6zm5 0h2v6h-2v-6zM3 21h18v-2H3v2z" />
    </svg>
  );
}

function ExitIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M10 17v-2h4V9h-4V7l-5 5 5 5zm2-15h8v20h-8v-2h6V4h-6V2z" />
    </svg>
  );
}

// --- MARCO ORNAMENTAL ESTILO RPG ---
function GameButtonFrame() {
  return (
    <svg
      className="absolute inset-0 h-full w-full pointer-events-none scale-[1.02] overflow-visible"
      preserveAspectRatio="none"
      viewBox="0 0 450 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Gradiente de metal dorado/bronce desgastado */}
        <linearGradient id="metalGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#9a3412" />
          <stop offset="30%" stopColor="#d97706" />
          <stop offset="50%" stopColor="#fef08a" />
          <stop offset="70%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#451a03" />
        </linearGradient>

        {/* SOLUCIÓN AL ERROR 1 (Línea 76): Reemplazados 'w' y 'h' por 'width' y 'height' */}
        <filter id="gothicShadow" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow
            dx="0"
            dy="4"
            stdDeviation="4"
            floodColor="#000"
            floodOpacity="0.8"
          />
        </filter>
      </defs>

      <g filter="url(#gothicShadow)">
        {/* Línea exterior del marco base */}
        <rect
          x="12"
          y="6"
          width="426"
          height="68"
          rx="6"
          stroke="url(#metalGold)"
          strokeWidth="1.5"
          strokeOpacity="0.8"
        />
        <rect
          x="15"
          y="9"
          width="420"
          height="62"
          rx="4"
          stroke="#1e293b"
          strokeWidth="1"
          strokeOpacity="0.5"
        />

        {/* Ornamentos Esquina Superior Izquierda y Pico Lateral */}
        <path
          d="M 12 25 L 2 40 L 12 55 L 20 40 Z"
          fill="url(#metalGold)"
          stroke="#1e2530"
          strokeWidth="1"
        />
        <path d="M 25 6 L 6 6 L 6 25 L 14 14 Z" fill="url(#metalGold)" />

        {/* Ornamentos Esquina Superior Derecha y Pico Lateral */}
        <path
          d="M 438 25 L 448 40 L 438 55 L 430 40 Z"
          fill="url(#metalGold)"
          stroke="#1e2530"
          strokeWidth="1"
        />
        <path d="M 425 6 L 444 6 L 444 25 L 436 14 Z" fill="url(#metalGold)" />

        {/* Esquinas Inferiores */}
        <path d="M 6 55 L 6 74 L 25 74 L 14 66 Z" fill="url(#metalGold)" />
        <path
          d="M 444 55 L 444 74 L 425 74 L 436 66 Z"
          fill="url(#metalGold)"
        />

        {/* Cresta/Gema Central Superior */}
        <path
          d="M 215 6 L 225 -2 L 235 6 L 225 14 Z"
          fill="url(#metalGold)"
          stroke="#451a03"
          strokeWidth="1"
        />
        <circle
          cx="225"
          cy="6"
          r="2.5"
          fill="#f59e0b"
          className="animate-pulse"
        />

        {/* Cresta Central Inferior */}
        <path
          d="M 218 74 L 225 68 L 232 74 L 225 80 Z"
          fill="url(#metalGold)"
          stroke="#451a03"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

type MenuButtonProps = {
  item: MenuAction;
  onHover: () => void;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

function MenuButton({
  item,
  onHover,
  onClick,
  disabled,
  className = "",
}: MenuButtonProps) {
  return (
    <motion.button
      type="button"
      onMouseEnter={onHover}
      onClick={onClick}
      disabled={disabled}
      whileHover={disabled ? {} : { scale: 1.03, y: -2 }}
      whileTap={disabled ? {} : { scale: 0.98 }}
      // SOLUCIÓN ADVERTENCIA 2: h-[76px] cambiado a h-19
      className={`group relative flex w-full items-center h-19 px-8 text-left transition-all duration-300 ${className}`}
    >
      {/* Fondo Interno del Botón */}
      {/* SOLUCIÓN ADVERTENCIAS 3 y 4: inset-[8px] a inset-2 | bg-gradient-to-r a bg-linear-to-r */}
      <div className="absolute inset-2 rounded-lg bg-linear-to-r from-neutral-950 via-stone-900 to-neutral-950 overflow-hidden z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(220,38,38,0.2),transparent_70%)] opacity-40 transition-opacity duration-500 group-hover:opacity-100" />
        {/* SOLUCIÓN ADVERTENCIA 5: bg-gradient-to-r cambiado a bg-linear-to-r */}
        <div className="absolute inset-0 bg-linear-to-r from-transparent via-amber-500/5 to-transparent -translate-x-full transition-transform duration-1000 group-hover:translate-x-full" />
      </div>

      {/* El Marco SVG */}
      <GameButtonFrame />

      {/* Destello de fondo detrás del ícono */}
      {/* SOLUCIÓN ADVERTENCIA 6: bg-gradient-to-b cambiado a bg-linear-to-b */}
      <div className="relative z-10 ml-6 translate-x-6 grid h-10 w-10 shrink-0 place-items-center rounded-md border border-amber-600/30 bg-linear-to-b from-amber-950/40 to-stone-950 text-amber-500/90 shadow-inner group-hover:border-amber-400/60 group-hover:text-amber-400 group-hover:shadow-[0_0_12px_rgba(245,158,11,0.2)] transition-all duration-300 sm:ml-8 sm:translate-x-8">
        {item.icon}
      </div>

      {/* Textos del Botón */}
      <div className="relative z-10 flex-1 translate-x-10 ml-5 select-none sm:translate-x-12">
        <div className="flex items-baseline gap-2">
          <h3 className="text-xl font-black uppercase tracking-wider text-stone-200 font-serif transition-colors duration-300 group-hover:text-white [text-shadow:0_2px_4px_rgba(0,0,0,0.9)]">
            {item.label}
          </h3>
          <span className="text-[9px] font-bold text-amber-600/70 group-hover:text-amber-400 transition-colors duration-300">
            // {item.badge}
          </span>
        </div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 transition-colors duration-300 group-hover:text-amber-500/80 mt-0.5">
          {item.helper}
        </p>
      </div>

      <div className="relative z-10 h-2 w-2 rounded-full bg-amber-600/30 border border-amber-700 opacity-0 group-hover:opacity-100 group-hover:bg-amber-400 group-hover:shadow-[0_0_8px_#f59e0b] transition-all duration-300 mr-2" />
    </motion.button>
  );
}

export default function MainMenu({
  onPlay,
  onPets,
  onProfile,
  onExit,
}: MainMenuProps) {
  const actions: MenuAction[] = [
    {
      label: "JUGAR",
      helper: "INICIAR PARTIDA",
      onClick: onPlay,
      icon: <SwordIcon />,
      badge: "01",
      accent: true,
      placement: "w-full max-w-[440px]",
    },
    {
      label: "COLECCIÓN",
      helper: "VER MASCOTAS",
      onClick: onPets,
      icon: <BookIcon />,
      badge: "02",
      placement: "w-full max-w-[440px]",
    },
    {
      label: "SANTUARIO",
      helper: "ABRIR PERFIL",
      onClick: onProfile,
      icon: <TempleIcon />,
      badge: "03",
      placement: "w-full max-w-[440px]",
    },
    {
      label: "SALIR",
      helper: "CERRAR SESIÓN",
      onClick: onExit,
      icon: <ExitIcon />,
      badge: "04",
      placement: "w-full max-w-[440px]",
    },
  ];

  return (
    <div className="relative flex h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#040406] px-6">
      {/* Viñeta Cinematográfica de Fondo Oscuro */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#111216,transparent_65%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_20%,rgba(0,0,0,0.9)_100%)] pointer-events-none" />

      {/* Aura Mística de Fondo para el Título Principal */}
      {/* SOLUCIÓN ADVERTENCIAS 7 y 8: w-[600px] a w-150 | h-[180px] a h-45 */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 w-150 h-45 bg-amber-600/5 blur-[100px] rounded-full pointer-events-none" />

      {/* Header del Menú */}
      <div className="absolute top-12 left-0 right-0 z-10 text-center select-none">
        <p className="text-[10px] font-bold uppercase tracking-[0.5em] text-amber-600/90 [text-shadow:0_0_8px_rgba(180,83,9,0.3)]">
          Principio del Menú
        </p>
        <h1 className="mt-1 text-7xl font-black uppercase tracking-[0.15em] text-stone-100 font-serif [text-shadow:0_4px_16px_rgba(0,0,0,0.95),0_0_25px_rgba(255,255,255,0.1)]">
          Legado
        </h1>
        {/* SOLUCIÓN ADVERTENCIA 9: bg-gradient-to-r cambiado a bg-linear-to-r */}
        <div className="mt-4 h-px w-48 bg-linear-to-r from-transparent via-amber-600/50 to-transparent mx-auto relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-1.5 w-1.5 rotate-45 border border-amber-500 bg-stone-950" />
        </div>
      </div>

      {/* Contenedor de Cuadros Estilo RPG */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        className="relative z-10 flex w-full flex-col items-center gap-5 mt-16"
      >
        {actions.map((item) => (
          <div
            key={item.label}
            className={`flex w-full justify-center ${item.placement || ""}`}
          >
            <MenuButton
              item={item}
              onHover={() => audioManager.playSfx("ui_hover")}
              onClick={() => {
                audioManager.playSfx("ui_click");
                item.onClick?.();
              }}
              disabled={!item.onClick}
            />
          </div>
        ))}
      </motion.div>

      {/* Footer */}
      <div className="absolute bottom-10 left-0 right-0 z-10 text-[10px] font-bold uppercase tracking-[0.6em] text-stone-600 text-center select-none">
        Arena Draco
      </div>
    </div>
  );
}
