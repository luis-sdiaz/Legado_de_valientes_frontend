import { Events } from "phaser";

export const EVENT_BATTLE_ATTACK = "battle:attack";

export type BattleAttackEvent = {
  attackerName: string;
  targetName: string;
  damage: number;
  attackName: string;
  elementoJugador: string;
  elementoRival: string;
  targetHpAfter?: number;
  targetHpMax?: number;
  targetKind: "rival" | "player";
  isFinisher?: boolean;
};

export const EventBus = new Events.EventEmitter();
