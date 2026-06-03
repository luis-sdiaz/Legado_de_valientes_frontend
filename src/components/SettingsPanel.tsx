import { useEffect, useState } from "react";
import audioManager from "../game/audio/AudioManager";
import Modal from "./Modal";

export default function SettingsPanel({ onClose }: { onClose?: () => void }) {
  function getInitialVolumes() {
    const defaults = { master: 1, music: 0.6, sfx: 1 };
    const saved = localStorage.getItem("audio_volumes");
    if (!saved) return defaults;
    try {
      const v = JSON.parse(saved);
      return {
        master: typeof v.master === "number" ? v.master : defaults.master,
        music: typeof v.music === "number" ? v.music : defaults.music,
        sfx: typeof v.sfx === "number" ? v.sfx : defaults.sfx,
      };
    } catch (err) {
      console.warn("SettingsPanel: failed to parse audio_volumes", err);
      return defaults;
    }
  }

  const initial = getInitialVolumes();
  const [master, setMaster] = useState<number>(initial.master);
  const [music, setMusic] = useState<number>(initial.music);
  const [sfx, setSfx] = useState<number>(initial.sfx);

  // apply initial volumes to audio manager once on mount
  useEffect(() => {
    audioManager.setMasterVolume(initial.master);
    audioManager.setMusicVolume(initial.music);
    audioManager.setSfxVolume(initial.sfx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // persist when volumes change
  useEffect(() => {
    const payload = { master, music, sfx };
    try {
      localStorage.setItem("audio_volumes", JSON.stringify(payload));
    } catch (err) {
      console.warn("SettingsPanel: failed to save audio_volumes", err);
    }
  }, [master, music, sfx]);

  function onChangeMaster(v: number) {
    setMaster(v);
    audioManager.setMasterVolume(v);
  }
  function onChangeMusic(v: number) {
    setMusic(v);
    audioManager.setMusicVolume(v);
  }
  function onChangeSfx(v: number) {
    setSfx(v);
    audioManager.setSfxVolume(v);
  }

  return (
    <Modal onClose={onClose}>
      <div className="p-6 sm:p-7">
        <div className="pr-10">
          <div className="page-kicker">Ajustes</div>
          <h2 className="mt-4 page-title text-[clamp(1.8rem,3vw,2.6rem)]">
            Audio del juego
          </h2>
          <p className="mt-3 page-copy text-sm">
            Ajusta el volumen sin mover el foco de la pantalla principal.
          </p>
        </div>

        <div className="mt-6 content-stack text-sm text-gray-200">
          <div className="field-row">
            <div className="flex items-center justify-between gap-3">
              <label className="field-label">Volumen maestro</label>
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs text-gray-300">
                {Math.round(master * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={master}
              onChange={(e) => onChangeMaster(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div className="field-row">
            <div className="flex items-center justify-between gap-3">
              <label className="field-label">Música</label>
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs text-gray-300">
                {Math.round(music * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={music}
              onChange={(e) => onChangeMusic(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>

          <div className="field-row">
            <div className="flex items-center justify-between gap-3">
              <label className="field-label">Efectos de sonido</label>
              <span className="rounded-full border border-white/10 bg-black/30 px-2 py-1 text-xs text-gray-300">
                {Math.round(sfx * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={sfx}
              onChange={(e) => onChangeSfx(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
            />
          </div>
        </div>

        <div className="mt-6 border-t border-white/8 pt-4 text-center text-xs text-gray-400">
          Los cambios se guardan automáticamente
        </div>
      </div>
    </Modal>
  );
}
