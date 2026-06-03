import Phaser from 'phaser'
import phaserConfig from './config'
import BattleScene from './scenes/BattleScene'
import BootScene from './scenes/BootScene'

export function createGame(parent?: string | HTMLElement, activePet?: any) {
  const cfg = { ...phaserConfig }
  if (parent) cfg.parent = parent as Phaser.Types.Core.GameConfig["parent"];
  cfg.scene = [BootScene, BattleScene]
  const game = new Phaser.Game(cfg)
  if (activePet) {
    game.registry.set('activePet', activePet);
  }
  return game
}

export function destroyGame(game?: Phaser.Game) {
  if (!game) return
  try {
    game.destroy(true)
  } catch (e) {
    // swallow errors during HMR
    // swallow errors during HMR
    console.warn('Error destroying Phaser game', e)
  }
}
