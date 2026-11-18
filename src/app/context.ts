import type { Application } from 'pixi.js';
import type { TowerDef } from '../data/towers/types';
import type { GameEvent } from '../sim/events';
import type { Game } from '../sim/game';
import type { TextureBank } from '../render/textures';
import type { Profile } from '../save/storage';

export type UiSound = 'click' | 'start' | 'error' | 'buy' | 'back';

export interface AudioLike {
  event(e: GameEvent): void;
  ui(kind: UiSound): void;
  setVolume(v: number): void;
}

/** What screens need from the app shell. */
export interface AppContext {
  pixi: Application;
  tex: TextureBank;
  profile: Profile;
  audio: AudioLike | null;
  saveProfile(): void;
  icon(def: TowerDef): string;
  isTowerUnlocked(def: TowerDef): boolean;
  onGameStart(g: Game): void;
  onRoundCleared(g: Game, round: number): void;
  onVictory(g: Game): void;
  onDefeat(g: Game): void;
  saveSnapshot(g: Game): void;
  deleteSnapshot(mapId: string): void;
  exitToMenu(): void;
  lastXpGain(): number;
  drainUnlockMessages(): string[];
}
