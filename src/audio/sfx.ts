import { EV, type GameEvent } from '../sim/events';
import type { AudioLike, UiSound } from '../app/context';
import type { Settings } from '../save/storage';

/**
 * Every sound is synthesized on the fly with the Web Audio API (no audio files).
 * Busy rounds can produce hundreds of events per second, so each sound type is
 * rate-limited and the total number of live voices is capped.
 */
export class Sfx implements AudioLike {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private noise!: AudioBuffer;
  private lastPlay = new Map<string, number>();
  private voices = 0;
  private maxVoices = 28;

  constructor(private settings: Settings) {
    const unlock = () => {
      this.ensure();
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
  }

  private ensure(): boolean {
    if (this.ctx) return true;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return false;
    const ctx = new AC();
    this.ctx = ctx;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 6;
    comp.attack.value = 0.003;
    comp.release.value = 0.15;
    this.master = ctx.createGain();
    this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
    this.master.connect(comp).connect(ctx.destination);
    this.dry = ctx.createGain();
    this.dry.connect(this.master);
    // short synthetic room reverb for a bit of space
    const conv = ctx.createConvolver();
    const len = Math.floor(ctx.sampleRate * 1.1);
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    conv.buffer = ir;
    this.wet = ctx.createGain();
    this.wet.gain.value = 0.18;
    this.wet.connect(conv).connect(this.master);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    return true;
  }

  setVolume(v: number): void {
    if (this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
  }

  /** Rate limit per sound key. */
  private gate(key: string, minGap: number): boolean {
    if (!this.ctx || this.settings.muted || this.settings.volume <= 0) return false;
    if (this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime;
    const last = this.lastPlay.get(key) ?? -1;
    if (now - last < minGap) return false;
    if (this.voices >= this.maxVoices) return false;
    this.lastPlay.set(key, now);
    return true;
  }

  private out(gain: number, reverb = 0.3): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.value = gain;
    g.connect(this.dry);
    if (reverb > 0) {
      const s = ctx.createGain();
      s.gain.value = reverb;
      g.connect(s).connect(this.wet);
    }
    return g;
  }

  private track(node: AudioScheduledSourceNode, end: number): void {
    this.voices++;
    node.onended = () => {
      this.voices--;
    };
    node.stop(end);
  }

  /** Pitched blip with an exponential pitch sweep and fast decay. */
  private tone(type: OscillatorType, f0: number, f1: number, dur: number, vol: number, at = 0, reverb = 0.3): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.out(1, reverb));
    o.start(t);
    this.track(o, t + dur + 0.02);
  }

  /** Filtered noise burst. */
  private hiss(filter: BiquadFilterType, f0: number, f1: number, dur: number, vol: number, q = 1, at = 0, reverb = 0.25): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + at;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const bq = ctx.createBiquadFilter();
    bq.type = filter;
    bq.Q.value = q;
    bq.frequency.setValueAtTime(f0, t);
    bq.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bq).connect(g).connect(this.out(1, reverb));
    src.start(t, Math.random() * 0.5);
    this.track(src, t + dur + 0.02);
  }

  private jitter(f: number, amt = 0.06): number {
    return f * (1 + (Math.random() - 0.5) * amt * 2);
  }

  event(e: GameEvent): void {
    if (!this.ctx) return;
    switch (e.type) {
      case EV.SIDE_BREAK:
        if (this.gate('pop', 0.016)) {
          const f = this.jitter(1500 - e.a * 110, 0.08);
          this.tone('triangle', f, f * 0.55, 0.07, 0.16, 0, 0.15);
          if (e.c === 1) this.hiss('bandpass', 4000, 2000, 0.06, 0.08, 2);
        }
        break;
      case EV.SHATTER:
        if (this.gate('shatter', 0.022)) {
          const f = this.jitter(2300, 0.1);
          this.tone('sine', f, f * 0.7, 0.13, 0.12, 0, 0.4);
          this.tone('sine', f * 1.51, f * 1.2, 0.09, 0.06, 0.005, 0.4);
          this.hiss('highpass', 6000, 3000, 0.08, 0.1, 0.7);
        }
        break;
      case EV.ARMOR_BREAK:
        if (this.gate('armor', 0.04)) {
          this.tone('square', 330, 180, 0.12, 0.07, 0, 0.3);
          this.tone('square', 517, 260, 0.1, 0.05, 0, 0.3);
          this.hiss('bandpass', 2500, 900, 0.12, 0.12, 3);
        }
        break;
      case EV.DEFLECT:
        if (this.gate('deflect', 0.05)) this.hiss('highpass', 7000, 5000, 0.025, 0.06, 0.5, 0, 0);
        break;
      case EV.IMMUNE:
        if (this.gate('immune', 0.07)) this.tone('sine', 260, 200, 0.06, 0.08, 0, 0.1);
        break;
      case EV.SHOT:
        if (e.c === 2) {
          if (this.gate('lob', 0.06)) this.tone('sine', 160, 70, 0.12, 0.16, 0, 0.1);
        } else if (e.c === 1) {
          if (this.gate('burst', 0.08)) this.hiss('bandpass', 1800, 600, 0.14, 0.09, 1.5);
        } else if (this.gate('dart', 0.035)) this.hiss('highpass', 5000, 2500, 0.03, 0.05, 0.6, 0, 0.05);
        break;
      case EV.TRACER:
        if (this.gate('zap', 0.05)) this.tone('sawtooth', 1800, 220, 0.09, 0.06, 0, 0.25);
        break;
      case EV.EXPLOSION:
        if (this.gate('boom', 0.045)) {
          const big = e.a > 60;
          this.hiss('lowpass', big ? 1600 : 2400, 120, big ? 0.45 : 0.25, big ? 0.35 : 0.22, 0.8);
          this.tone('sine', big ? 120 : 150, 40, big ? 0.35 : 0.2, big ? 0.3 : 0.2, 0, 0.2);
        }
        break;
      case EV.PULSE:
        if (this.gate('pulse', 0.12)) {
          for (let k = 0; k < 3; k++) this.tone('sine', this.jitter(2600 + k * 700, 0.03), 1800 + k * 400, 0.35, 0.03, k * 0.02, 0.8);
          this.hiss('highpass', 9000, 6000, 0.3, 0.04, 0.5);
        }
        break;
      case EV.FREEZE:
        if (this.gate('freeze', 0.1)) this.tone('sine', 3200, 2400, 0.12, 0.025, 0, 0.6);
        break;
      case EV.BOSS_DEATH:
        if (this.gate('bossdeath', 0.2)) {
          this.hiss('lowpass', 3000, 60, 1.4, 0.5, 0.7, 0, 0.5);
          this.tone('sine', 90, 28, 1.1, 0.5, 0, 0.3);
          for (let k = 0; k < 8; k++) this.tone('sine', this.jitter(1800 + k * 260, 0.1), 900, 0.25, 0.05, 0.05 + k * 0.04, 0.6);
        }
        break;
      case EV.LEAK:
        if (this.gate('leak', 0.18)) {
          this.tone('sawtooth', 140, 90, 0.22, 0.1, 0, 0.1);
          this.tone('sawtooth', 147, 92, 0.22, 0.08, 0, 0.1);
        }
        break;
      case EV.ROUND_START:
        if (this.gate('roundstart', 0.3)) [523, 659, 784].forEach((f, i) => this.tone('triangle', f, f, 0.14, 0.12, i * 0.07, 0.4));
        break;
      case EV.ROUND_END:
        if (this.gate('roundend', 0.3)) {
          [784, 1047].forEach((f, i) => this.tone('sine', f, f, 0.22, 0.12, i * 0.09, 0.5));
          this.coin(0.2);
        }
        break;
      case EV.INCOME:
        if (this.gate('income', 0.1)) this.coin(0);
        break;
      case EV.PLACE:
        this.tone('sine', 220, 110, 0.12, 0.2, 0, 0.2);
        this.hiss('bandpass', 1200, 500, 0.08, 0.1, 2);
        break;
      case EV.UPGRADE:
        if (e.b >= 4) {
          [392, 523, 659, 784, 1047].forEach((f, i) => this.tone('triangle', f, f, 0.4, 0.1, i * 0.05, 0.7));
          this.hiss('highpass', 4000, 9000, 0.6, 0.08, 0.5, 0, 0.6);
        } else [523, 784].forEach((f, i) => this.tone('triangle', f * (1 + e.b * 0.06), f * (1 + e.b * 0.06), 0.15, 0.12, i * 0.06, 0.4));
        break;
      case EV.SELL:
        this.coin(0);
        this.coin(0.08);
        break;
      case EV.ABILITY:
        this.hiss('bandpass', 300, 5000, 0.6, 0.25, 1, 0, 0.6);
        [262, 330, 392, 523].forEach((f) => this.tone('sawtooth', f, f * 1.01, 0.7, 0.05, 0, 0.8));
        break;
      case EV.REGROW:
        if (this.gate('regrow', 0.1)) this.tone('sine', 600, 900, 0.08, 0.04, 0, 0.2);
        break;
      case EV.VICTORY:
        [523, 659, 784, 1047, 1319].forEach((f, i) => this.tone('triangle', f, f, 0.5, 0.13, i * 0.12, 0.8));
        break;
      case EV.GAME_OVER:
        [392, 330, 262, 196].forEach((f, i) => this.tone('sawtooth', f, f * 0.97, 0.45, 0.08, i * 0.18, 0.8));
        break;
    }
  }

  private coin(at: number): void {
    this.tone('square', 1319, 1319, 0.06, 0.05, at, 0.3);
    this.tone('square', 1760, 1760, 0.12, 0.05, at + 0.06, 0.3);
  }

  ui(kind: UiSound): void {
    if (!this.ensure() || !this.gate('ui-' + kind, 0.03)) return;
    switch (kind) {
      case 'click':
        this.tone('sine', 1200, 900, 0.04, 0.08, 0, 0.1);
        break;
      case 'back':
        this.tone('sine', 800, 500, 0.06, 0.08, 0, 0.1);
        break;
      case 'start':
        this.tone('triangle', 440, 880, 0.12, 0.12, 0, 0.3);
        break;
      case 'buy':
        this.coin(0);
        break;
      case 'error':
        this.tone('square', 180, 160, 0.08, 0.06, 0, 0);
        this.tone('square', 180, 160, 0.08, 0.06, 0.1, 0);
        break;
    }
  }
}
