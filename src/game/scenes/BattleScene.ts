import Phaser from "phaser";
import { EVENT_BATTLE_ATTACK, EventBus, type BattleAttackEvent } from "../EventBus";

type ElementPalette = {
  slash: number;
  glow: number;
  burst: number;
};

const ELEMENT_PALETTES: Record<string, ElementPalette> = {
  Fuego:  { slash: 0xfb923c, glow: 0xef4444, burst: 0xf97316 },
  Tierra: { slash: 0xa3e635, glow: 0x84cc16, burst: 0x65a30d },
  Viento: { slash: 0x67e8f9, glow: 0x38bdf8, burst: 0x0ea5e9 },
};

function getPalette(elemento?: string): ElementPalette {
  return ELEMENT_PALETTES[elemento ?? ""] ?? {
    slash: 0xd4af37,
    glow:  0xd4af37,
    burst: 0xfacc15,
  };
}

/** Mapea la especie de la mascota a la key de textura cargada en preload(). */
function speciesKey(especie: string): string {
  const s = especie.toLowerCase();
  if (s.includes("dragon") || s.includes("dragón") || s.includes("fenix") || s.includes("fénix") || s.includes("infernal") || s.includes("solar")) return "DRAGÓN";
  if (s.includes("leon")   || s.includes("león")  || s.includes("brote") || s.includes("elemental")) return "LEÓN";
  if (s.includes("gorila") || s.includes("golem")  || s.includes("granito") || s.includes("obsidiana") || s.includes("titán")) return "GORILA";
  if (s.includes("aguila") || s.includes("águila") || s.includes("grifo")  || s.includes("viento") || s.includes("tormentas") || s.includes("zephyr")) return "ÁGUILA";
  return "DRAGÓN"; // fallback
}

export default class BattleScene extends Phaser.Scene {
  ally!:  Phaser.GameObjects.Image;
  rival!: Phaser.GameObjects.Image;
  private attackHandler?: (event: BattleAttackEvent) => void;

  constructor() {
    super({ key: "BattleScene" });
  }

  // ── PRELOAD ─────────────────────────────────────────────────────────────────
  preload() {
    this.load.image("DRAGÓN",   "assets/dragon.png");
    this.load.image("GORILA",   "assets/gorila.png");
    this.load.image("ÁGUILA",   "assets/aguila.png");
    this.load.image("LEÓN",     "assets/leon.png");
    this.load.image("ENEMIGO",  "assets/enemigo.png");
  }

  // ── CREATE ──────────────────────────────────────────────────────────────────
  create() {
    this.cameras.main.setBackgroundColor("#06070a");
    this.drawArena();

    // Determine the active pet's texture key
    const activePet = this.registry.get("activePet");
    const petEspecie: string = activePet?.especie ?? "Dragón de Ceniza";
    const allyKey = speciesKey(petEspecie);

    // ── Ally sprite (left side, faces right) ───────────────────────────────
    this.ally = this.add
      .image(300, 420, allyKey)
      .setScale(0.35)
      .setOrigin(0.5, 1)   // anchor at feet
      .setFlipX(false);    // ally faces RIGHT toward rival

    // ── Rival sprite (right side, faces left) ────────────────────────────────
    this.rival = this.add
      .image(900, 380, "ENEMIGO")
      .setScale(0.35)
      .setOrigin(0.5, 1)
      .setFlipX(true);     // rival faces LEFT toward ally

    // ── Glow / outline rings ─────────────────────────────────────────────────
    const allyOutline = this.add.circle(300, 425, 60).setStrokeStyle(3, 0x60a5fa, 0.5);
    const allyGlow    = this.add.circle(300, 425, 82, 0x60a5fa, 0.10);

    const rivalOutline = this.add.circle(900, 385, 60).setStrokeStyle(3, 0xfda4af, 0.45);
    const rivalGlow    = this.add.circle(900, 385, 82, 0xef4444, 0.10);

    // ── Foot shadows ─────────────────────────────────────────────────────────
    const allyShadow  = this.add.ellipse(300, 430, 120, 28, 0x000000, 0.42);
    const rivalShadow = this.add.ellipse(900, 390, 130, 30, 0x000000, 0.45);

    // Specular highlight
    const allySpec  = this.add.circle(282, 388, 7, 0xffffff, 0.15);
    const rivalSpec = this.add.circle(882, 350, 7, 0xffffff, 0.12);

    // ── Idle breathing animation ─────────────────────────────────────────────
    this.tweens.add({
      targets: [this.ally, allyOutline, allyGlow, allySpec],
      y: "+=8",
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    this.tweens.add({
      targets: allyShadow,
      scaleX: 1.03,
      scaleY: 0.97,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: [this.rival, rivalOutline, rivalGlow, rivalSpec],
      y: "-=8",
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 140,
    });
    this.tweens.add({
      targets: rivalShadow,
      scaleX: 0.98,
      scaleY: 1.03,
      duration: 1100,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
      delay: 140,
    });

    // Subtle slow camera zoom
    this.tweens.add({
      targets: this.cameras.main,
      zoom: 1.02,
      duration: 8000,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // ── EventBus listener ────────────────────────────────────────────────────
    this.attackHandler = (event) => this.playAttackEffect(event);
    EventBus.on(EVENT_BATTLE_ATTACK, this.attackHandler, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.attackHandler) {
        EventBus.off(EVENT_BATTLE_ATTACK, this.attackHandler, this);
      }
    });
  }

  // ── ATTACK VFX ──────────────────────────────────────────────────────────────
  private playAttackEffect(event: BattleAttackEvent) {
    const playerPalette = getPalette(event.elementoJugador);
    const rivalPalette  = getPalette(event.elementoRival);
    const attackTint = event.targetKind === "rival" ? playerPalette.slash : rivalPalette.slash;
    const burstTint  = event.targetKind === "rival" ? playerPalette.burst : rivalPalette.burst;
    const rivalTarget = event.targetKind === "rival";

    this.cameras.main.shake(80, 0.004);

    const slash = this.add
      .rectangle(610, 360, 280, 16, attackTint, 0.8)
      .setRotation(-0.35)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: slash,
      alpha:  0,
      scaleX: 1.18,
      scaleY: 1.6,
      duration: 180,
      ease: "Quad.easeOut",
      onComplete: () => slash.destroy(),
    });

    this.tweens.add({
      targets: this.ally,
      x: this.ally.x + 18,
      y: this.ally.y - 8,
      duration: 90,
      yoyo: true,
      ease: "Sine.easeOut",
    });

    const hitTarget = rivalTarget ? this.rival : this.ally;
    const hitGlow   = this.add
      .circle(hitTarget.x, hitTarget.y, 118, attackTint, 0.18)
      .setBlendMode(Phaser.BlendModes.ADD);

    this.tweens.add({
      targets: hitTarget,
      x: hitTarget.x + (rivalTarget ? 12 : -12),
      y: hitTarget.y + 2,
      duration: 50,
      yoyo: true,
      repeat: 2,
      ease: "Sine.easeInOut",
    });

    this.tweens.add({
      targets: hitGlow,
      alpha:  0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 220,
      ease: "Quad.easeOut",
      onComplete: () => hitGlow.destroy(),
    });

    if (event.isFinisher) {
      this.cameras.main.flash(220, 255, 240, 190);

      const finisherBurst = this.add
        .circle(hitTarget.x, hitTarget.y, 18, burstTint, 0.65)
        .setBlendMode(Phaser.BlendModes.ADD);

      this.tweens.add({
        targets: finisherBurst,
        scaleX: 7,
        scaleY: 7,
        alpha:  0,
        duration: 420,
        ease: "Quad.easeOut",
        onComplete: () => finisherBurst.destroy(),
      });

      const endLabel = this.add
        .text(
          this.scale.width / 2,
          140,
          event.targetKind === "rival" ? "VICTORIA" : "DERROTA",
          {
            fontFamily: "Cinzel, serif",
            fontSize: "28px",
            color: event.targetKind === "rival" ? "#facc15" : "#f87171",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 6,
          }
        )
        .setOrigin(0.5)
        .setDepth(30)
        .setAlpha(0);

      this.tweens.add({
        targets: endLabel,
        alpha: 1,
        y: 120,
        duration: 180,
        ease: "Sine.easeOut",
        yoyo: true,
        hold: 300,
        onComplete: () => endLabel.destroy(),
      });
    }
  }

  // ── ARENA BACKGROUND ─────────────────────────────────────────────────────────
  private drawArena() {
    const { width, height } = this.scale;
    const g = this.add.graphics();

    g.fillStyle(0x07111a, 1);
    g.fillRect(0, 0, width, height);

    // Vignette
    const vignette = this.add.graphics();
    vignette.fillStyle(0x000000, 0.45);
    vignette.fillEllipse(width / 2, height / 2, width * 1.4, height * 1.1);
    vignette.setDepth(8);

    // Subtle grain
    const grain = this.add.graphics();
    for (let i = 0; i < 120; i++) {
      const x = Phaser.Math.Between(120, width - 120);
      const y = Phaser.Math.Between(120, height - 120);
      const a = Phaser.Math.FloatBetween(0.02, 0.08);
      grain.fillStyle(0xffffff, a);
      grain.fillRect(x, y, 1, 1);
    }
    grain.setDepth(9);

    // Base plate
    g.fillStyle(0x0f1720, 1);
    g.fillRoundedRect(104, 104, width - 208, height - 228, 88);

    // Arena oval
    g.fillStyle(0xcaa26a, 1);
    g.fillEllipse(width / 2, height / 2 + 36, 820, 334);

    g.lineStyle(10, 0x000000, 0.35);
    g.strokeEllipse(width / 2, height / 2 + 36, 820, 334);

    g.fillStyle(0x000000, 0.08);
    g.fillEllipse(width / 2, height / 2 + 36, 680, 240);

    g.lineStyle(2, 0xffffff, 0.02);
    g.strokeEllipse(width / 2, height / 2 + 36, 500, 192);
  }
}
