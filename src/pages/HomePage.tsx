import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { isAxiosError } from "axios";
import { useRegisterPlayer } from "../api/hooks";
import { useGameContext } from "../context/GameContext";
import { api } from "../services/api";

const STORAGE_NAME_KEY = "ldv_player_name";
const STORAGE_EMAIL_KEY = "ldv_player_email";

export default function HomePage() {
  const navigate = useNavigate();
  const { patchJugador } = useGameContext();
  const [name, setName] = useState(
    () => localStorage.getItem(STORAGE_NAME_KEY) ?? "",
  );
  const [email, setEmail] = useState(
    () => localStorage.getItem(STORAGE_EMAIL_KEY) ?? "",
  );
  const [successInfo, setSuccessInfo] = useState<{ id: string; nombre: string } | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);

  const registerMutation = useRegisterPlayer({
    nombre: name.trim(),
    email: email.trim(),
  });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) return;
    setApiError(null);
    setSuccessInfo(null);

    registerMutation.mutate(undefined, {
      onSuccess: async (player) => {
        let oroFinal = player.monedas;
        if (player.monedas < 600) {
          try {
            const response = await api.put(`/api/jugadores/${player.id}`, {
              monedas: 600,
            });
            oroFinal = response.data.monedas;
          } catch (error) {
            console.error("No se pudo actualizar el oro inicial", error);
          }
        }

        localStorage.setItem(STORAGE_NAME_KEY, player.nombre);
        localStorage.setItem(STORAGE_EMAIL_KEY, trimmedEmail);
        localStorage.setItem("ldv_player_id", String(player.id));
        patchJugador({
          id: String(player.id),
          nombre: player.nombre,
          oro: oroFinal,
        });
        setSuccessInfo({ id: String(player.id), nombre: player.nombre });
        setTimeout(() => navigate("/menu"), 1800);
      },
      onError: (err) => {
        if (isAxiosError(err)) {
          const status = err.response?.status;
          if (status === 409) {
            setApiError("Ya existe un jugador con ese correo electrónico.");
          } else if (status === 400) {
            setApiError("Datos inválidos. Revisa el nombre y el correo.");
          } else {
            setApiError(`Error del servidor (${status ?? "sin conexión"}). Verifica el backend.`);
          }
        } else {
          setApiError("No se pudo registrar el jugador. Verifica el backend.");
        }
      },
    });
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#020713] text-cyan-50">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(21,184,255,0.22),transparent_34%),linear-gradient(180deg,#06142a_0%,#020713_58%,#01040a_100%)]" />
      <div className="absolute inset-0 opacity-25 bg-[linear-gradient(rgba(34,211,238,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(34,211,238,0.12)_1px,transparent_1px)] bg-size-[34px_34px]" />
      <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,transparent_0_5px,rgba(34,211,238,0.22)_6px,transparent_7px)] bg-size-[28px_24px]" />

      <motion.div
        initial={{ opacity: 0, y: 14, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="relative z-10 flex h-full w-full items-center justify-center px-4 py-6 sm:px-6"
      >
        <div className="relative w-full max-w-5xl">
          <div className="absolute -inset-3 rounded-[28px] border border-cyan-300/25 bg-cyan-400/5 shadow-[0_0_45px_rgba(34,211,238,0.22)]" />
          <div className="absolute -inset-1 rounded-3xl border border-blue-500/25" />

          <div className="relative overflow-hidden rounded-[22px] border border-cyan-200/35 bg-[#071528]/85 shadow-[inset_0_0_36px_rgba(34,211,238,0.08),0_28px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(125,211,252,0.28),transparent_34%),linear-gradient(90deg,rgba(8,47,73,0.82),rgba(12,74,110,0.42),rgba(8,47,73,0.82))]" />
            <div className="absolute inset-7 rounded-[18px] border border-cyan-300/25 shadow-[inset_0_0_24px_rgba(34,211,238,0.12)]" />
            <div className="absolute inset-x-9 top-7 h-1 bg-linear-to-r from-transparent via-cyan-300 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.9)]" />
            <div className="absolute inset-x-9 bottom-7 h-1 bg-linear-to-r from-transparent via-blue-400 to-transparent shadow-[0_0_18px_rgba(59,130,246,0.9)]" />
            <div className="absolute inset-y-9 left-7 w-1 bg-linear-to-b from-transparent via-cyan-300 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.85)]" />
            <div className="absolute inset-y-9 right-7 w-1 bg-linear-to-b from-transparent via-cyan-300 to-transparent shadow-[0_0_18px_rgba(34,211,238,0.85)]" />

            <div className="absolute left-5 top-5 h-20 w-20 border-l-2 border-t-2 border-cyan-300 shadow-[-8px_-8px_22px_rgba(34,211,238,0.25)]" />
            <div className="absolute right-5 top-5 h-20 w-20 border-r-2 border-t-2 border-cyan-300 shadow-[8px_-8px_22px_rgba(34,211,238,0.25)]" />
            <div className="absolute bottom-5 left-5 h-20 w-20 border-b-2 border-l-2 border-cyan-300 shadow-[-8px_8px_22px_rgba(34,211,238,0.25)]" />
            <div className="absolute bottom-5 right-5 h-20 w-20 border-b-2 border-r-2 border-cyan-300 shadow-[8px_8px_22px_rgba(34,211,238,0.25)]" />

            <div className="relative mx-auto grid min-h-140 w-full place-items-center px-8 py-16 text-center sm:px-10 lg:px-14">
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => navigate("/menu")}
                className="absolute right-10 top-10 z-20 grid h-10 w-10 place-items-center border border-cyan-300/30 bg-cyan-300/10 text-lg font-semibold text-cyan-100 transition hover:border-cyan-200 hover:bg-cyan-300/20"
              >
                x
              </button>

              <div className="w-full max-w-190">
                <div className="mx-auto mb-6 h-px max-w-2xl bg-linear-to-r from-transparent via-cyan-300/70 to-transparent" />
                <div className="mx-auto mb-6 inline-flex items-center gap-3 border border-cyan-300/30 bg-cyan-300/10 px-5 py-2 text-[0.68rem] font-black uppercase tracking-[0.45em] text-cyan-100 shadow-[0_0_22px_rgba(34,211,238,0.18)]">
                  REGISTRO
                </div>

                <h1 className="text-4xl font-black uppercase leading-tight tracking-[0.18em] text-transparent sm:text-5xl lg:text-[3.4rem] bg-[linear-gradient(180deg,#efffff_0%,#67e8f9_45%,#2563eb_100%)] bg-clip-text [text-shadow:0_0_28px_rgba(34,211,238,0.28)]">
                  LEGADO DE VALIENTES
                </h1>

                <p className="mx-auto mt-8 max-w-xl text-center text-sm leading-6 text-cyan-100/78 sm:text-base lg:translate-x-20">
                  Antes de entrar a la arena, define tu nombre y correo
                  electrónico, y deja lista tu ruta de progreso.
                </p>

                <form
                  onSubmit={handleSubmit}
                  className="mx-auto mt-9 w-full max-w-xl border border-cyan-300/20 bg-[#03111f]/45 p-5 text-center shadow-[inset_0_0_28px_rgba(34,211,238,0.08),0_0_32px_rgba(14,165,233,0.12)] backdrop-blur-md sm:p-6 lg:translate-x-20"
                >
                  <label className="mx-auto block w-fit border border-cyan-300/25 bg-cyan-300/10 px-4 py-1 text-center text-[0.68rem] font-black uppercase tracking-[0.32em] text-cyan-200/90">
                    Nombre del jugador
                  </label>
                  <div className="mt-3 border border-cyan-300/30 bg-black/35 p-1 shadow-[inset_0_0_24px_rgba(34,211,238,0.08),0_0_24px_rgba(34,211,238,0.1)]">
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-16 w-full border border-white/5 bg-[#06101f]/90 px-5 text-lg font-semibold tracking-[0.08em] text-cyan-50 outline-none transition placeholder:text-cyan-200/35 focus:border-cyan-300/70 focus:shadow-[0_0_22px_rgba(34,211,238,0.22)]"
                      placeholder="Ej: Juan"
                      required
                    />
                  </div>

                  <label className="mx-auto mt-4 block w-fit border border-cyan-300/25 bg-cyan-300/10 px-4 py-1 text-center text-[0.68rem] font-black uppercase tracking-[0.32em] text-cyan-200/90">
                    Correo electrónico
                  </label>
                  <div className="mt-3 border border-cyan-300/30 bg-black/35 p-1 shadow-[inset_0_0_24px_rgba(34,211,238,0.08),0_0_24px_rgba(34,211,238,0.1)]">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-16 w-full border border-white/5 bg-[#06101f]/90 px-5 text-lg font-semibold tracking-[0.08em] text-cyan-50 outline-none transition placeholder:text-cyan-200/35 focus:border-cyan-300/70 focus:shadow-[0_0_22px_rgba(34,211,238,0.22)]"
                      placeholder="tucorreo@ejemplo.com"
                      required
                    />
                  </div>

                  {apiError && (
                    <div
                      className="mt-5 border border-red-400/35 bg-red-500/10 px-4 py-3 text-sm text-red-100"
                      role="alert"
                    >
                      {apiError}
                    </div>
                  )}

                  {successInfo && (
                    <div
                      className="mt-5 border border-emerald-400/35 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100"
                      role="status"
                    >
                      ¡Bienvenido, <strong>{successInfo.nombre}</strong>! · ID de jugador:{" "}
                      <span className="font-mono font-bold">{successInfo.id}</span>
                      &nbsp;· Redirigiendo…
                    </div>
                  )}

                  <div className="mt-7 flex justify-center">
                    <button
                      type="submit"
                      disabled={registerMutation.isPending}
                      className="relative min-w-72 overflow-hidden border border-cyan-200/45 bg-[linear-gradient(180deg,rgba(14,165,233,0.28),rgba(30,64,175,0.36))] px-8 py-4 text-xs font-black uppercase tracking-[0.32em] text-cyan-50 shadow-[0_0_28px_rgba(34,211,238,0.24),inset_0_1px_0_rgba(255,255,255,0.18)] transition hover:border-cyan-100 hover:shadow-[0_0_36px_rgba(34,211,238,0.42),inset_0_1px_0_rgba(255,255,255,0.22)] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {registerMutation.isPending
                        ? "Registrando..."
                        : "Entrar a la arena"}
                    </button>
                  </div>
                </form>
                <div className="mx-auto mt-8 h-px max-w-2xl bg-linear-to-r from-transparent via-blue-400/70 to-transparent" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
