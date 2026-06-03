import Phaser from 'phaser'

export const GAME_WIDTH = 1280
export const GAME_HEIGHT = 720
export const GAME_SCALE = {
  mode: Phaser.Scale.FIT,
  autoCenter: Phaser.Scale.CENTER_BOTH,
}

export const phaserConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  parent: 'phaser-root',
  backgroundColor: '#0b1020',
  pixelArt: true,
  roundPixels: true,
  antialias: false,
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scale: GAME_SCALE,
}

export default phaserConfig
