import { useEffect, useRef } from "react";
import { createGame, destroyGame } from "../game/Game";
import { useGameContext } from "../context/GameContext";

export default function GameCanvas({ onLoaded }: { onLoaded?: () => void }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const onLoadedRef = useRef(onLoaded);
  const { mascotaActiva } = useGameContext();

  useEffect(() => {
    onLoadedRef.current = onLoaded;
  }, [onLoaded]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || gameRef.current) return;
    // create Phaser game inside container only once, passing active pet
    gameRef.current = createGame(container, mascotaActiva);
    onLoadedRef.current?.();

    return () => {
      destroyGame(gameRef.current || undefined);
      gameRef.current = null;
      if (container) {
        container.innerHTML = "";
      }
    };
  }, [mascotaActiva]);

  return (
    <div
      id="phaser-root"
      ref={containerRef}
      style={{ width: "100%", height: "100%", pointerEvents: "auto" }}
    />
  );
}
