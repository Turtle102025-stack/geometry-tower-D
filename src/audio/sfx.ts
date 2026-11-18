import type { GameEvent } from '../sim/events';
import type { AudioLike, UiSound } from '../app/context';
import type { Settings } from '../save/storage';

/** Placeholder until the Web Audio synth lands (Phase 6). */
export class Sfx implements AudioLike {
  constructor(private settings: Settings) {}
  event(_e: GameEvent): void {}
  ui(_k: UiSound): void {}
  setVolume(_v: number): void {
    void this.settings;
  }
}
