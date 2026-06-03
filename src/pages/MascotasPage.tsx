import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Modal from "../components/Modal";
import RPGButton from "../components/RPGButton";
import { useGameContext, type MascotaState } from "../context/GameContext";
import { playerKeys } from "../api/hooks";
import { isAxiosError } from "axios";
import {
  crearMascota,
  entrenarMascota as entrenarMascotaApi,
  evolucionarMascota as evolucionarMascotaApi,
  seleccionarMascota as seleccionarMascotaApi,
  obtenerMascotas,
  getMascotaXp,
  type Mascota as ApiMascota,
  type TipoEntrenamiento,
} from "../services/api";

type SummonSpecies =
  | "Cachorro de Fénix"
  | "Brote Elemental"
  | "Guardian de la Selva"
  | "Ala Celestial";

const speciesMapping: Record<SummonSpecies, string> = {
  "Cachorro de Fénix": "DRAGON",
  "Brote Elemental": "LEON",
  "Guardian de la Selva": "GORILA",
  "Ala Celestial": "AGUILA",
};

const SPECIES_ICONS: Record<string, string> = {
  AGUILA: "/assets/aguila.png",
  DRAGON: "/assets/dragon.png",
  GORILA: "/assets/gorila.png",
  LEON: "/assets/leon.png",
};

function getSpeciesIcon(pet: ApiMascota): string {
  const raw = (pet as Record<string, unknown>).tipo ?? pet.especie ?? "";
  const key = String(raw).toUpperCase();
  return SPECIES_ICONS[key] ?? "/assets/aguila.png";
}

const mascotaKeys = {
  all: ["mascotas"] as const,
  byPlayer: (jugadorId: string) => ["mascotas", jugadorId] as const,
};

type MascotaConVida = {
  salud?: number;
  vida?: number;
  vidaActual?: number;
  vidaMax?: number;
  vidaMaxima?: number;
  hp?: number;
};

function getMascotaHealth(mascota: MascotaConVida) {
  return (
    mascota.salud ??
    mascota.vida ??
    mascota.vidaActual ??
    mascota.vidaMax ??
    mascota.vidaMaxima ??
    mascota.hp ??
    100
  );
}

function getStoredPlayerId() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("ldv_player_id") ?? null;
}

export default function MascotasPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { jugador, setMascotaActiva, mascotaActiva, patchJugador, refrescarJugador } = useGameContext();
  const [showCreate, setShowCreate] = useState(false);
  const [summonName, setSummonName] = useState("");
  const [summonSpecies, setSummonSpecies] =
    useState<SummonSpecies>("Cachorro de Fénix");
  const [summonError, setSummonError] = useState("");
  const storedPlayerId = getStoredPlayerId();
  const jugadorId =
    storedPlayerId ?? (jugador.id !== "player-123" ? jugador.id : "");
  const canInvoke = jugador.oro >= 300;

  const mascotasQuery = useQuery<ApiMascota[]>({
    queryKey: mascotaKeys.byPlayer(jugadorId),
    queryFn: () => obtenerMascotas(jugadorId),
    enabled: !!jugadorId,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (payload: {
      jugadorId: string;
      nombre: string;
      tipo: string;
    }) => crearMascota(payload.jugadorId, payload.nombre, payload.tipo),
    onSuccess: async (result) => {
      // Actualizar el contexto con las monedas y cantidad de mascotas que devuelve el backend
      patchJugador({
        oro: result.jugador.monedas,
        cantidadMascotas: result.jugador.cantidadMascotas ?? 0,
      });
      // Refrescar la lista de mascotas y el perfil del jugador en caché
      await queryClient.invalidateQueries({ queryKey: mascotaKeys.byPlayer(jugadorId) });
      await queryClient.invalidateQueries({ queryKey: playerKeys.byId(jugadorId) });
      setSummonName("");
      setSummonSpecies("Cachorro de Fénix");
      setSummonError("");
      setShowCreate(false);
    },
    onError: (error: Error) => {
      setSummonError(error?.message || "Error al invocar la criatura");
    },
  });

  const [trainModalPet, setTrainModalPet] = useState<ApiMascota | null>(null);
  const [trainError, setTrainError] = useState("");
  const [trainLoading, setTrainLoading] = useState(false);

  function openTrainModal(pet: ApiMascota) {
    setTrainError("");
    setTrainModalPet(pet);
  }

  function closeTrainModal() {
    setTrainModalPet(null);
    setTrainError("");
    setTrainSuccess("");
    setTrainLevelUp(false);
  }

  const [trainSuccess, setTrainSuccess] = useState("");
  const [trainLevelUp, setTrainLevelUp] = useState(false);

  async function handleTrain(tipo: TipoEntrenamiento) {
    if (!trainModalPet) return;
    setTrainLoading(true);
    setTrainError("");
    setTrainSuccess("");
    setTrainLevelUp(false);
    const petId = String(trainModalPet.id);
    const nivelAnterior = trainModalPet.nivel;
    try {
      const resp = await entrenarMascotaApi(petId, tipo, jugadorId || undefined);
      // Actualizar monedas del jugador en el contexto
      patchJugador({ oro: resp.monedasRestantes });
      // Escribir la mascota actualizada directamente en el cache para actualización inmediata de la UI
      queryClient.setQueryData<ApiMascota[]>(
        mascotaKeys.byPlayer(jugadorId),
        (old) => old?.map((m) => String(m.id) === petId ? resp.mascota : m) ?? [],
      );
      // Invalidar mascotas y todas las queries del jugador para que PerfilPage
      // reciba datos frescos (XP, nivel, monedas) al navegar tras el entrenamiento.
      void queryClient.invalidateQueries({ queryKey: mascotaKeys.byPlayer(jugadorId) });
      void queryClient.invalidateQueries({ queryKey: playerKeys.byId(jugadorId) });
      void queryClient.invalidateQueries({ queryKey: ["progreso", jugadorId] });
      void queryClient.invalidateQueries({ queryKey: ["estadisticas", jugadorId] });
      // Refrescar contexto global inmediatamente (single source of truth)
      void refrescarJugador();
      // Actualizar trainModalPet con los datos frescos del backend ANTES de calcular el mensaje
      // para que los stats del modal reflejen el nuevo nivel/XP sin desfase.
      setTrainModalPet(resp.mascota);
      const subioDeNivel = (resp.mascota.nivel ?? 0) > (nivelAnterior ?? 0);
      if (subioDeNivel) {
        setTrainLevelUp(true);
        setTrainSuccess(`¡SUBIDA DE NIVEL! ${resp.mascota.nombre} alcanzó el Nivel ${resp.mascota.nivel} 🎉`);
      } else {
        const labels: Record<TipoEntrenamiento, string> = {
          ATAQUE: "Ataque +2", DEFENSA: "Defensa +2", VELOCIDAD: "Velocidad +1",
        };
        setTrainSuccess(`¡${labels[tipo]}! XP +5 · Monedas restantes: ${resp.monedasRestantes}`);
      }
    } catch (err) {
      if (isAxiosError(err)) {
        const msg = err.response?.data;
        const text = typeof msg === "string" ? msg : JSON.stringify(msg ?? "");
        if (err.response?.status === 400 && text.toLowerCase().includes("moneda")) {
          setTrainError("No tienes suficientes monedas (necesitas 20).");
        } else {
          setTrainError(`Error ${err.response?.status ?? ""}: ${text || "Verifica el backend."}`);
        }
      } else {
        setTrainError("Error al entrenar la mascota. Verifica el backend.");
      }
    } finally {
      setTrainLoading(false);
    }
  }

  const evolucionarMutation = useMutation({
    mutationFn: async (mascotaId: string) => evolucionarMascotaApi(mascotaId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: mascotaKeys.byPlayer(jugadorId),
      });
    },
  });

  function openSummonModal() {
    if (!canInvoke) {
      setSummonError("Oro insuficiente para invocar una nueva criatura.");
      return;
    }
    setSummonError("");
    setShowCreate(true);
  }

  function handleSummonSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    const trimmedName = summonName.trim();
    if (!trimmedName) {
      setSummonError("Debes asignar un nombre a tu criatura.");
      return;
    }
    if (!canInvoke) {
      setSummonError("Oro insuficiente para invocar una nueva criatura.");
      return;
    }
    createMutation.mutate({
      jugadorId,
      nombre: trimmedName,
      tipo: speciesMapping[summonSpecies],
    });
  }

  const mascotasApi = mascotasQuery.data ?? [];
  const isLoading = mascotasQuery.isLoading || mascotasQuery.isFetching;

  const toMascotaState = (apiMascota: ApiMascota): MascotaState => ({
    id: String(apiMascota.id),
    nombre: apiMascota.nombre,
    especie: apiMascota.tipo !== undefined ? apiMascota.tipo : apiMascota.especie ?? "DRAGON",
    ataque: apiMascota.ataque,
    defensa: apiMascota.defensa,
    vida: apiMascota.vida ?? apiMascota.salud ?? 100,
    vidaMax:
      apiMascota.vidaMax ?? apiMascota.vidaMaxima ?? apiMascota.salud ?? 100,
    xp: getMascotaXp(apiMascota),
    nivel: apiMascota.nivel,
    elemento: apiMascota.elemento || "Neutro",
    estado: apiMascota.estado || "Listo",
    evolucionada: false,
  });

  return (
    <div className="page-shell relative overflow-hidden bg-[#070A12] text-slate-100 menu-bg">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.04)_0%,rgba(7,10,18,0.08)_28%,rgba(7,10,18,0.95)_74%,rgba(7,10,18,1)_100%)]" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 page-shell-inner content-stack"
      >
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="content-stack">
            <div className="page-kicker">Criadero de Mascotas</div>
            <h1 className="page-title uppercase">{jugador.nombre}</h1>
            <div className="text-xs uppercase tracking-[0.32em] text-amber-200/80">
              Oro {jugador.oro} • Nivel {jugador.nivel}
            </div>
          </div>
          <div className="page-actions">
            <RPGButton onClick={openSummonModal} disabled={!canInvoke}>
              Pacto Rúnico
            </RPGButton>
            <Link
              to="/menu"
              className="pointer-events-auto inline-flex items-center justify-center rounded-full px-5 py-2 btn-rpg organic"
            >
              Volver al menu
            </Link>
          </div>
        </div>

        {!canInvoke && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            Oro insuficiente para invocar una nueva criatura. Necesitas 300 de
            oro.
          </div>
        )}

        {mascotasQuery.isError && (
          <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            No se pudieron cargar tus mascotas. Verifica el backend.
          </div>
        )}

        {isLoading ? (
          <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-6 text-sm text-slate-300">
            Cargando colección de mascotas...
          </div>
        ) : mascotasApi.length === 0 ? (
          <div className="rounded-2xl border border-amber-300/15 bg-black/30 px-4 py-6 text-sm text-slate-300">
            No tienes mascotas aún, invoca una en el Pacto Rúnico.
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {mascotasApi.map((pet) => {
            const petId = String(pet.id);
            const isActive = mascotaActiva?.id === petId;
            const health = getMascotaHealth(pet);
            const petXp = (pet as Record<string, unknown>).experiencia as number ?? pet.xp ?? 0;
            const canEvolve = pet.nivel >= 3 && petXp >= 30;
            const evolveTooltip = !canEvolve
              ? `Requiere nivel 3 y 30 XP (actual: nv.${pet.nivel}, ${petXp} XP)`
              : "¡Lista para evolucionar!";

            return (
              <motion.div
                key={petId}
                whileHover={{ y: -6 }}
                transition={{ duration: 0.2 }}
                className={`relative overflow-hidden content-panel p-5 shadow-[0_24px_70px_rgba(0,0,0,0.42)] transition-all ${
                  isActive
                    ? "ring-1 ring-[#d4af37]/70 shadow-[0_0_0_1px_rgba(212,175,55,0.35),0_24px_70px_rgba(0,0,0,0.42)]"
                    : ""
                }`}
              >
                <div className="relative flex items-start gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-3xl border border-white/5 panel-slate">
                    <img
                      src={getSpeciesIcon(pet)}
                      alt={pet.especie ?? "mascota"}
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-lg font-black uppercase tracking-[0.08em] text-slate-100">
                          {pet.nombre}
                        </div>
                        <div className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-400">
                          {pet.especie}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <div className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-[0.65rem] uppercase tracking-[0.35em] text-amber-200">
                          {pet.elemento ?? "Sin elemento"}
                        </div>
                        {isActive && (
                          <div className="rounded-full border border-[#d4af37]/50 bg-[#d4af37]/10 px-2 py-1 text-[0.62rem] uppercase tracking-[0.35em] text-[#f6d98a]">
                            Activa
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 space-y-3">
                      <div>
                        <div className="text-xs uppercase tracking-[0.25em] text-slate-400">
                          Vida
                        </div>
                        <div className="mt-2 h-3 w-full overflow-hidden rounded-full border border-white/5 bg-slate-800">
                          <div
                            className="hp-fill-emerald h-full"
                            style={{
                              width: `${Math.max(0, Math.min(100, health))}%`,
                            }}
                          />
                        </div>
                      </div>
                      <div className="mt-1 grid grid-cols-6 gap-2 text-xs">
                        <div className="rounded-xl border border-white/5 bg-black/25 px-2 py-2 text-center">
                          <div className="text-slate-300">ATQ</div>
                          <div className="font-semibold text-amber-300">
                            {pet.ataque}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-black/25 px-2 py-2 text-center">
                          <div className="text-slate-300">DEF</div>
                          <div className="font-semibold text-sky-300">
                            {pet.defensa}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-black/25 px-2 py-2 text-center">
                          <div className="text-slate-300">VEL</div>
                          <div className="font-semibold text-violet-300">
                            {pet.velocidad ?? "—"}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-black/25 px-2 py-2 text-center">
                          <div className="text-slate-300">VIDA</div>
                          <div className="font-semibold text-fuchsia-300">
                            {health}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-black/25 px-2 py-2 text-center">
                          <div className="text-slate-300">XP</div>
                          <div className="font-semibold text-emerald-300">
                            {getMascotaXp(pet)}
                          </div>
                        </div>
                        <div className="rounded-xl border border-white/5 bg-black/25 px-2 py-2 text-center">
                          <div className="text-slate-300">NVL</div>
                          <div className="font-semibold text-rose-300">
                            {pet.nivel}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                <div className="relative mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="text-xs uppercase tracking-[0.2em] text-slate-400">
                    {pet.estado}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const selected = toMascotaState(pet);
                        setMascotaActiva(selected);
                        try {
                          await seleccionarMascotaApi(petId);
                        } catch {
                          // estado local ya actualizado; el backend puede no tener este endpoint
                        }
                        navigate("/combate");
                      }}
                      className={`px-3 py-1 rounded-md btn-rpg organic text-[0.72rem] transition-all ${isActive ? "brightness-110" : ""}`}
                    >
                      {isActive ? "En combate" : "Elegir para Combate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => openTrainModal(pet)}
                      disabled={jugador.oro < 20}
                      className="px-3 py-1 rounded-md btn-rpg organic text-[0.72rem] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      Entrenar
                    </button>
                    <button
                      type="button"
                      title={evolveTooltip}
                      onClick={() => evolucionarMutation.mutate(petId)}
                      disabled={!canEvolve || evolucionarMutation.isPending}
                      className="px-3 py-1 rounded-md btn-rpg organic text-[0.72rem] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      {evolucionarMutation.isPending &&
                      evolucionarMutation.variables === petId
                        ? "Evolucionando..."
                        : "Evolucionar"}
                    </button>
                  </div>
                </div>

                {/* ── Atributos únicos del Dragón ─────────────────────────────
                    Solo se renderiza si tipo === DRAGON y el backend envía los valores.
                    Estilo "ligero" para no saturar la tarjeta: fuente pequeña, opacidad reducida. */}
                {(pet.tipo ?? pet.especie)?.toUpperCase() === "DRAGON" &&
                  (pet.temperaturaFuego != null || pet.alcanceVuelo != null) && (
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-white/5 pt-2.5 opacity-75">
                    <span className="text-[0.6rem] uppercase tracking-[0.35em] text-slate-500">
                      Especial
                    </span>
                    {pet.temperaturaFuego != null && (
                      <span className="flex items-center gap-1 text-[0.65rem]">
                        <span className="text-[0.75rem] opacity-60" aria-hidden="true">🔥</span>
                        <span className="text-orange-300/75">{pet.temperaturaFuego}</span>
                        <span className="text-slate-500">temp</span>
                      </span>
                    )}
                    {pet.alcanceVuelo != null && (
                      <span className="flex items-center gap-1 text-[0.65rem]">
                        <span className="text-[0.75rem] opacity-60" aria-hidden="true">🪽</span>
                        <span className="text-sky-300/75">{pet.alcanceVuelo}</span>
                        <span className="text-slate-500">alc</span>
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {trainModalPet && (
        <Modal onClose={closeTrainModal}>
          <div className="flex flex-col items-center gap-5 p-2">
            <h2 className="rune-title text-[1.6rem] uppercase">Entrenamiento</h2>

            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-white/10 panel-slate">
              <img
                src={getSpeciesIcon(trainModalPet)}
                alt={trainModalPet.especie ?? "mascota"}
                className="h-full w-full object-cover"
              />
            </div>

            <div className="text-center">
              <div className="text-lg font-black uppercase tracking-[0.08em] text-slate-100">
                {trainModalPet.nombre}
              </div>
              <div className="mt-1 text-xs uppercase tracking-[0.28em] text-slate-400">
                {String((trainModalPet as Record<string, unknown>).tipo ?? trainModalPet.especie ?? "")}
              </div>
            </div>

            {/* Stats actuales */}
            <div className="grid w-full grid-cols-5 gap-2 text-xs">
              {[
                { label: "ATQ",  value: trainModalPet.ataque,              color: "text-amber-300"  },
                { label: "DEF",  value: trainModalPet.defensa,             color: "text-sky-300"    },
                { label: "VEL",  value: trainModalPet.velocidad ?? "—",    color: "text-violet-300" },
                { label: "NVL",  value: trainModalPet.nivel,               color: "text-fuchsia-300"},
                { label: "XP",   value: getMascotaXp(trainModalPet),        color: "text-emerald-300"},
              ].map(({ label, value, color }) => (
                <div key={label} className="rounded-xl border border-white/5 bg-black/25 px-2 py-2 text-center">
                  <div className="text-slate-400">{label}</div>
                  <div className={`font-semibold ${color}`}>{value}</div>
                </div>
              ))}
            </div>

            {/* Oro disponible */}
            <div className={`text-sm ${jugador.oro < 20 ? "text-red-300" : "text-amber-200"}`}>
              Oro disponible:{" "}
              <span className="font-bold">{jugador.oro}</span>
              &nbsp;&mdash;&nbsp;Costo por entrenamiento:{" "}
              <span className="font-bold">20</span>
            </div>

            {trainError && (
              <div className="w-full rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-center text-sm text-red-200">
                {trainError}
              </div>
            )}

            {trainSuccess && (
              <div
                className={`w-full rounded-xl border px-3 py-2 text-center text-sm font-semibold transition-all ${
                  trainLevelUp
                    ? "border-amber-400/50 bg-amber-500/15 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.18)]"
                    : "border-emerald-400/25 bg-emerald-500/10 text-emerald-200"
                }`}
              >
                {trainSuccess}
              </div>
            )}

            {/* Tres botones de entrenamiento */}
            <div className="grid w-full grid-cols-3 gap-2">
              {(
                [
                  { tipo: "ATAQUE"   as const, label: "Ataque",   bonus: "+2",  cls: "border-amber-400/40 bg-amber-500/10 text-amber-200 hover:bg-amber-500/20"   },
                  { tipo: "DEFENSA"  as const, label: "Defensa",  bonus: "+2",  cls: "border-sky-400/40   bg-sky-500/10   text-sky-200   hover:bg-sky-500/20"     },
                  { tipo: "VELOCIDAD"as const, label: "Velocidad",bonus: "+1",  cls: "border-violet-400/40 bg-violet-500/10 text-violet-200 hover:bg-violet-500/20"},
                ] as const
              ).map(({ tipo, label, bonus, cls }) => (
                <button
                  key={tipo}
                  type="button"
                  disabled={trainLoading || jugador.oro < 20}
                  onClick={() => handleTrain(tipo)}
                  title={jugador.oro < 20 ? "Necesitas al menos 20 monedas" : `Entrenar ${label} (${bonus})`}
                  className={`rounded-xl border px-3 py-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-45 ${cls}`}
                >
                  {trainLoading ? "…" : (
                    <>
                      <div className="font-bold uppercase tracking-wide">{label}</div>
                      <div className="mt-0.5 opacity-70">{bonus} · costo 20</div>
                    </>
                  )}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={closeTrainModal}
              className="btn-rpg organic px-4 py-2 text-sm"
            >
              Cerrar
            </button>
          </div>
        </Modal>
      )}

      {showCreate && (
        <Modal onClose={() => setShowCreate(false)}>
          <div className="text-center">
            <h2 className="rune-title mb-2 text-[2rem] uppercase">
              Pacto Rúnico
            </h2>
            <p className="mb-4 text-sm text-slate-300">
              Forja una nueva criatura y vincúlala a tu criadero.
            </p>
            <form className="space-y-3" onSubmit={handleSummonSubmit}>
              <label className="block text-left text-xs uppercase tracking-[0.25em] text-slate-400">
                Nombre
              </label>
              <input
                className="input-modern"
                placeholder="Nombre de la criatura"
                value={summonName}
                onChange={(e) => setSummonName(e.target.value)}
              />
              <label className="block text-left text-xs uppercase tracking-[0.25em] text-slate-400">
                Especie base
              </label>
              <select
                className="input-modern"
                value={summonSpecies}
                onChange={(e) =>
                  setSummonSpecies(e.target.value as SummonSpecies)
                }
              >
                <option value="Cachorro de Fénix">Cachorro de Fénix</option>
                <option value="Brote Elemental">Brote Elemental</option>
                <option value="Guardian de la Selva">
                  Guardian de la Selva
                </option>
                <option value="Ala Celestial">Ala Celestial</option>
              </select>
              {summonError && (
                <div className="rounded-xl border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-100">
                  {summonError}
                </div>
              )}
              <div className="mt-4 flex justify-center gap-3">
                <RPGButton type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Invocando..." : "Invocar"}
                </RPGButton>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="btn-rpg organic"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}
    </div>
  );
}
