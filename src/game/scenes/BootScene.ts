import Phaser from "phaser";
import { imageAssets, audioAssets } from "../assets";

export default class BootScene extends Phaser.Scene {
  private finished = false;
  private missingAssets: string[] = [];
  private lastProgress = -1;

  constructor() {
    super({ key: "BootScene" });
  }

  preload() {
    console.log("[BootScene] preload start");
    const { width, height } = this.cameras.main;

    const progressBox = this.add
      .rectangle(width / 2, height / 2, 420, 18, 0x000000, 0.35)
      .setOrigin(0.5);

    const progressBar = this.add
      .rectangle(width / 2 - 200, height / 2, 0, 10, 0xffffff, 0.9)
      .setOrigin(0, 0.5);

    const expectedPaths = [
      ...imageAssets.map((asset) => asset.path),
      ...audioAssets.map((asset) => asset.path),
    ];

    // Log assets
    console.log(
      `[BootScene] Loading ${imageAssets.length} images + ${audioAssets.length} audio`
    );

    // Load images
    for (const img of imageAssets) {
      this.load.image(img.key, img.path);
    }

    // Load audio
    for (const aud of audioAssets) {
      // If you want broader browser support later, you can pass an array of sources
      this.load.audio(aud.key, aud.path);
    }

    // Progress bar
    this.load.on("progress", (value: number) => {
      const pct = Math.floor(value * 100);
      if (pct !== this.lastProgress) {
        this.lastProgress = pct;
        console.log(`[BootScene] progress ${pct}%`);
      }
      progressBar.width = 400 * value;
    });

    // If a file fails, generate placeholders for images (do NOT mess with counters)
    this.load.on("loaderror", (file: Phaser.Loader.File) => {
      console.error(
        `[BootScene] ❌ Load error: ${file?.src} (type=${file?.type}, key=${file?.key})`
      );

      if (file?.src) {
        this.missingAssets.push(file.src);
      }

      if (file?.type === "image") {
        const key = file.key as string;
        const meta = imageAssets.find((i) => i.key === key);
        const w = meta?.width ?? 160;
        const h = meta?.height ?? 160;

        console.warn(`[BootScene] Generating placeholder texture for "${key}"`);

        const g = this.add.graphics();

        let bgColor = 0x1e293b;
        let accentColor = 0x64748b;

        if (key.includes("dragon")) {
          bgColor = 0x450a0a;
          accentColor = 0xef4444;
        } else if (key.includes("gorila")) {
          bgColor = 0x064e3b;
          accentColor = 0x10b981;
        } else if (key.includes("aguila")) {
          bgColor = 0x0c4a6e;
          accentColor = 0x0ea5e9;
        } else if (key.includes("leon")) {
          bgColor = 0x78350f;
          accentColor = 0xf59e0b;
        } else if (key.includes("hero")) {
          bgColor = 0x1e3a8a;
          accentColor = 0x3b82f6;
        } else if (key.includes("enemy")) {
          bgColor = 0x581c87;
          accentColor = 0xa855f7;
        }

        // Draw card/texture body
        g.fillStyle(bgColor, 1);
        g.fillRoundedRect(0, 0, w, h, 28);
        g.lineStyle(6, accentColor, 0.85);
        g.strokeRoundedRect(0, 0, w, h, 28);

        // Draw interior decorative glowing core
        g.fillStyle(accentColor, 0.12);
        g.fillCircle(w / 2, h / 2, Math.min(w, h) * 0.38);

        // Draw an interior emblem/crest
        g.fillStyle(accentColor, 0.7);
        g.fillCircle(w / 2, h / 2 - 16, 24);
        g.fillStyle(0xffffff, 0.95);
        g.fillCircle(w / 2, h / 2 - 16, 8);

        // Render into texture (removing pre-existing error texture first)
        if (this.textures.exists(key)) {
          this.textures.remove(key);
        }
        g.generateTexture(key, w, h);
        g.destroy();
      }

      // For audio errors we just warn; game can still run without SFX/music
    });

    // IMPORTANT: only transition once
    this.load.once("complete", () => {
      console.log("[BootScene] load complete");
      this.finish(progressBar, progressBox, expectedPaths);
    });

    // Safety timeout: if loader gets stuck, continue anyway
    this.time.delayedCall(3500, () => {
      if (!this.finished) {
        console.warn("[BootScene] ⏱️ Timeout: forcing transition");
        this.finish(progressBar, progressBox, expectedPaths);
      }
    });
  }

  private finish(
    progressBar: Phaser.GameObjects.GameObject,
    progressBox: Phaser.GameObjects.GameObject,
    expectedPaths: string[]
  ) {
    if (this.finished) return;
    this.finished = true;

    progressBar.destroy();
    progressBox.destroy();

    if (this.missingAssets.length > 0) {
      console.warn(
        `[BootScene] Missing assets detected (${this.missingAssets.length}). Expected files under public/assets/:`
      );
      console.warn(expectedPaths);
      console.warn(
        "[BootScene] Placeholders generated for missing images; continuing to start."
      );
    }

    console.log("[BootScene] Transitioning to BattleScene");
    this.scene.start("BattleScene");
  }
}