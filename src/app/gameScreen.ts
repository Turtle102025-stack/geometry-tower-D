import type { Ticker } from 'pixi.js';
import { BOSSES, BOSS_INDEX } from '../data/bosses';
import { DIFFICULTIES, type DifficultyId } from '../data/difficulty';
import type { MapDef } from '../data/maps/types';
import { RANKS, TYPE_TIPS, specLabel, tipKeysForSpecs } from '../data/shapes';
import { getRound } from '../sim/rounds';
import { TOWER_LIST } from '../data/towers';
import type { TowerDef } from '../data/towers/types';
import { ABILITY_INFO } from '../sim/abilities';
import { DT } from '../sim/constants';
import { EV, type GameEvent } from '../sim/events';
import { Game, type GameMode, type GameSnapshot } from '../sim/game';
import { pathCap } from '../sim/towerStats';
import { MOD_KEYS, TARGETING_MODES, type Targeting, type Tower } from '../sim/types';
import { GameRenderer } from '../render/renderer';
import { clear, fmtMoney, fmtNum, h } from '../ui/dom';
import type { AppContext } from './context';

export interface GameScreenOptions {
  map: MapDef;
  difficulty: DifficultyId;
  mode: GameMode;
  snapshot?: GameSnapshot;
}

const TARGET_LABEL: Record<Targeting, string> = { first: 'First', last: 'Last', strong: 'Strong', close: 'Close' };
const DMG_LABEL: Record<string, string> = { sharp: 'Sharp', explosive: 'Explosive', cold: 'Cold', energy: 'Energy' };

export class GameScreen {
  readonly el: HTMLElement;
  game!: Game;
  private renderer!: GameRenderer;
  private speed = 1;
  private paused = false;
  private modalOpen = false;
  private acc = 0;
  private placing: TowerDef | null = null;
  private placeX = 0;
  private placeY = 0;
  private placeOk = false;
  private selected: Tower | null = null;
  private tab: 'shop' | 'sandbox' = 'shop';
  private panelKey = '';
  private hudCache = '';
  private fpsAcc = 0;
  private fpsFrames = 0;
  private fps = 60;
  private abilityKey = '';
  private seenTips = new Set<string>();

  // DOM
  private stage: HTMLElement;
  private sideBody: HTMLElement;
  private tabs: HTMLElement;
  private roundEl: HTMLElement;
  private livesEl: HTMLElement;
  private moneyEl: HTMLElement;
  private startBtn: HTMLButtonElement;
  private pauseBtn: HTMLButtonElement;
  private autoBox: HTMLInputElement;
  private abilityBar: HTMLElement;
  private confirmBar: HTMLElement;
  private toastEl: HTMLElement;
  private fpsEl: HTMLElement;
  private bossBar: HTMLElement;
  private bossName: HTMLElement;
  private bossFill: HTMLElement;
  private bossKey = '';
  private lastLives = 0;
  private shopButtons = new Map<string, HTMLButtonElement>();
  private statRefs: Record<string, HTMLElement> = {};
  private toastTimer = 0;

  // sandbox state
  private sbRank = 6;
  private sbMods = new Set<string>();
  private sbBoss = '';
  private sbCount = 10;

  constructor(
    private ctx: AppContext,
    private opts: GameScreenOptions,
  ) {
    this.roundEl = h('div', { class: 'stat round' });
    this.livesEl = h('div', { class: 'stat lives' });
    this.moneyEl = h('div', { class: 'stat money' });
    this.startBtn = h('button', { class: 'big-btn', onclick: () => this.onStartButton() }, 'START ROUND ▶');
    this.pauseBtn = h('button', { class: 'icon-btn', title: 'Pause (P)', onclick: () => this.togglePause() }, '❚❚');
    this.autoBox = h('input', { type: 'checkbox', checked: ctx.profile.settings.autoStart, onchange: () => this.setAutoStart(this.autoBox.checked) });
    this.fpsEl = h('div', { class: 'toggle', style: 'min-width:60px' });
    const top = h(
      'header',
      { class: 'topbar' },
      h('button', { class: 'icon-btn', title: 'Menu', onclick: () => this.openPauseMenu() }, '☰'),
      this.roundEl,
      this.livesEl,
      this.moneyEl,
      h('div', { class: 'spacer' }),
      this.fpsEl,
      h('label', { class: 'toggle', title: 'Start the next round automatically' }, this.autoBox, 'AUTO'),
      this.pauseBtn,
      this.startBtn,
    );
    this.stage = h('div', { class: 'stage' });
    this.abilityBar = h('div', { class: 'ability-bar' });
    this.confirmBar = h(
      'div',
      { class: 'confirm-bar hidden' },
      h('button', { class: 'ok', onclick: () => this.confirmPlace() }, '✔ PLACE'),
      h('button', { class: 'no', onclick: () => this.cancelPlacing() }, '✕'),
    );
    this.toastEl = h('div', { class: 'toast hidden' });
    this.bossName = h('div', { class: 'bname' });
    this.bossFill = h('div', { class: 'fill' });
    this.bossBar = h('div', { class: 'boss-bar hidden' }, this.bossName, h('div', { class: 'track' }, this.bossFill));
    this.stage.append(this.abilityBar, this.confirmBar, this.toastEl, this.bossBar);
    this.tabs = h('div', { class: 'side-tabs' });
    this.sideBody = h('div', { class: 'side-body' });
    const side = h('aside', { class: 'sidebar' }, this.tabs, this.sideBody);
    this.el = h('div', { class: 'game-screen' }, top, this.stage, side);
  }

  // ───────────────────────── lifecycle ─────────────────────────

  mount(parent: HTMLElement): void {
    parent.append(this.el);
    const { pixi } = this.ctx;
    this.stage.prepend(pixi.canvas);
    pixi.resizeTo = this.stage;
    pixi.resize();
    this.newGame(this.opts.snapshot);
    pixi.ticker.add(this.frame, this);
    this.stage.addEventListener('pointermove', this.onPointerMove);
    this.stage.addEventListener('pointerdown', this.onPointerDown);
    this.stage.addEventListener('pointerup', this.onPointerUp);
    this.stage.addEventListener('contextmenu', this.onContext);
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  unmount(): void {
    const { pixi } = this.ctx;
    pixi.ticker.remove(this.frame, this);
    this.stage.removeEventListener('pointermove', this.onPointerMove);
    this.stage.removeEventListener('pointerdown', this.onPointerDown);
    this.stage.removeEventListener('pointerup', this.onPointerUp);
    this.stage.removeEventListener('contextmenu', this.onContext);
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('resize', this.onResize);
    this.renderer.destroy();
    this.el.remove();
  }

  private newGame(snap?: GameSnapshot): void {
    if (this.renderer) this.renderer.destroy();
    const o = this.opts;
    this.game = snap
      ? Game.restore(snap, o.map)
      : new Game({ map: o.map, difficulty: o.difficulty, mode: o.mode, seed: (Math.random() * 1e9) | 0 });
    this.game.autoStart = this.ctx.profile.settings.autoStart;
    this.renderer = new GameRenderer(this.ctx.pixi, this.ctx.tex, this.game);
    this.renderer.setQuality(this.ctx.profile.settings.quality);
    this.renderer.shakeEnabled = this.ctx.profile.settings.shake;
    this.renderer.onEvent((e) => this.onGameEvent(e));
    this.selected = null;
    this.placing = null;
    this.speed = 1;
    this.paused = false;
    this.acc = 0;
    this.panelKey = '';
    this.buildTabs();
    this.renderSide();
    if (!snap) this.ctx.onGameStart(this.game);
  }

  private onResize = (): void => {
    this.ctx.pixi.resize();
    this.renderer.layout();
  };

  // ───────────────────────── frame loop ─────────────────────────

  private frame(ticker: Ticker): void {
    const dt = Math.min(0.1, ticker.deltaMS / 1000);
    const running = !this.paused && !this.modalOpen && this.game.state !== 'lost' && this.game.state !== 'won';
    if (running) {
      this.acc += dt * this.speed;
      let steps = 0;
      const max = 4 * this.speed;
      while (this.acc >= DT && steps < max) {
        this.game.step();
        this.acc -= DT;
        steps++;
      }
      if (steps >= max) this.acc = 0;
    }
    this.renderer.render(dt, running ? Math.min(1, this.acc / DT) : 1);
    this.updateHud();
    this.updateSide();
    this.updateAbilities();
    this.updateBossBar();
    this.fpsAcc += dt;
    this.fpsFrames++;
    if (this.fpsAcc >= 0.5) {
      this.fps = Math.round(this.fpsFrames / this.fpsAcc);
      this.fpsAcc = 0;
      this.fpsFrames = 0;
      this.fpsEl.textContent = this.ctx.profile.settings.showFps ? `${this.fps} FPS · ${this.game.shapes.length + this.game.projectiles.length}` : '';
    }
  }

  private updateBossBar(): void {
    let top: (typeof this.game.shapes)[number] | null = null;
    let count = 0;
    for (const s of this.game.shapes) {
      if (!s.alive || s.kind === 0) continue;
      count++;
      if (!top || s.kind > top.kind || (s.kind === top.kind && s.hp < top.hp)) top = s;
    }
    if (!top) {
      if (this.bossKey) {
        this.bossBar.classList.add('hidden');
        this.bossKey = '';
      }
      return;
    }
    const name = BOSSES[top.kind - 1].name.toUpperCase() + (count > 1 ? `  ×${count}` : '');
    if (name !== this.bossKey) {
      this.bossKey = name;
      this.bossName.textContent = name;
      this.bossBar.classList.remove('hidden');
    }
    this.bossFill.style.width = `${Math.max(0, (top.hp / top.maxHp) * 100).toFixed(1)}%`;
  }

  private updateHud(): void {
    const g = this.game;
    const roundShown = g.state === 'running' ? g.currentRound : g.completed === 0 ? 1 : g.state === 'won' ? g.completed : g.currentRound;
    const total = g.freeplay || g.mode === 'sandbox' ? '' : `/${g.finalRound}`;
    const key = `${roundShown}|${total}|${Math.floor(g.money)}|${g.lives}|${g.state}|${this.speed}|${this.paused}`;
    if (key === this.hudCache) return;
    this.hudCache = key;
    this.roundEl.textContent = `ROUND ${roundShown}${total}`;
    this.livesEl.textContent = g.mode === 'sandbox' ? '♥ ∞' : `♥ ${Math.max(0, g.lives)}`;
    if (g.lives < this.lastLives) {
      this.livesEl.classList.remove('bump');
      void this.livesEl.offsetWidth;
      this.livesEl.classList.add('bump');
    }
    this.lastLives = g.lives;
    this.stage.classList.toggle('danger', g.mode === 'normal' && g.lives > 0 && g.lives <= g.diff.lives * 0.25);
    this.moneyEl.textContent = fmtMoney(g.money);
    const b = this.startBtn;
    b.classList.toggle('running', g.state === 'running');
    b.classList.toggle('fast2', g.state === 'running' && this.speed === 2);
    b.classList.toggle('fast3', g.state === 'running' && this.speed === 3);
    if (g.state === 'running') b.textContent = this.speed === 1 ? '▶ 1×  SPEED UP' : this.speed === 2 ? '▶▶ 2×' : '▶▶▶ 3×';
    else b.textContent = 'START ROUND ▶';
    this.pauseBtn.textContent = this.paused ? '▶' : '❚❚';
  }

  // ───────────────────────── controls ─────────────────────────

  private onStartButton(): void {
    const g = this.game;
    if (g.state === 'idle') {
      g.startRound();
      this.ctx.audio?.ui('start');
    } else if (g.state === 'running') {
      this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1;
      this.ctx.audio?.ui('click');
    }
    if (this.paused) this.togglePause();
  }

  private togglePause(): void {
    this.paused = !this.paused;
    this.ctx.audio?.ui('click');
  }

  private setAutoStart(v: boolean): void {
    this.game.autoStart = v;
    this.ctx.profile.settings.autoStart = v;
    this.ctx.saveProfile();
    if (v && this.game.state === 'idle' && this.game.completed > 0) this.game.startRound();
  }

  private toast(msg: string): void {
    this.toastEl.textContent = msg;
    this.toastEl.classList.remove('hidden');
    this.toastEl.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => {
      this.toastEl.style.opacity = '0';
    }, 1400);
  }

  private unlockToast(msgs: string[]): void {
    const el = h('div', { class: 'tip unlock' }, ...msgs.map((m) => h('div', {}, `🔓 ${m}`)));
    this.stage.append(el);
    this.ctx.audio?.ui('buy');
    setTimeout(() => el.classList.add('out'), 5000);
    setTimeout(() => el.remove(), 5600);
  }

  private banner(text: string, boss = false): void {
    const b = h('div', { class: 'banner' + (boss ? ' boss' : '') }, text);
    this.stage.append(b);
    setTimeout(() => b.remove(), 1700);
  }

  private onGameEvent(e: GameEvent): void {
    this.ctx.audio?.event(e);
    const g = this.game;
    switch (e.type) {
      case EV.ROUND_START: {
        this.showTypeTips(e.a);
        const bosses = g.roundBosses(e.a);
        if (bosses.length) this.banner(`⚠ ${bosses.map((b) => BOSSES[BOSS_INDEX[b] - 1].name.toUpperCase()).join(' + ')} INCOMING`, true);
        else this.banner(`ROUND ${e.a}`);
        break;
      }
      case EV.ROUND_END: {
        this.ctx.onRoundCleared(g, e.a);
        if (g.mode === 'normal' && g.state !== 'won') this.ctx.saveSnapshot(g);
        if (g.state !== 'won') {
          const msgs = this.ctx.drainUnlockMessages();
          if (msgs.length) {
            this.unlockToast(msgs);
            if (msgs.some((m) => m.startsWith('New tower'))) this.renderSide();
          }
        }
        break;
      }
      case EV.VICTORY:
        this.ctx.onVictory(g);
        setTimeout(() => this.showEnd(true), 900);
        break;
      case EV.GAME_OVER:
        this.ctx.onDefeat(g);
        setTimeout(() => this.showEnd(false), 700);
        break;
    }
  }

  /** First time a shape type shows up (in this game), explain it briefly. */
  private showTypeTips(round: number): void {
    const keys = tipKeysForSpecs(getRound(round, this.game.seed).groups.map((gr) => gr.spec));
    const fresh = keys.filter((k) => !this.seenTips.has(k));
    if (round > 1) {
      for (let r = 1; r < round && r <= 80; r++) for (const k of tipKeysForSpecs(getRound(r, this.game.seed).groups.map((gr) => gr.spec))) this.seenTips.add(k);
    }
    const show = fresh.filter((k) => !this.seenTips.has(k));
    for (const k of keys) this.seenTips.add(k);
    if (!show.length) return;
    const el = h('div', { class: 'tip' }, ...show.map((k) => h('div', {}, TYPE_TIPS[k])));
    this.stage.append(el);
    setTimeout(() => el.classList.add('out'), 7000);
    setTimeout(() => el.remove(), 7600);
  }

  // ───────────────────────── input ─────────────────────────

  private onPointerMove = (ev: PointerEvent): void => {
    if (!this.placing) return;
    if (ev.pointerType === 'touch' && ev.buttons === 0) return;
    this.updatePlacement(ev.clientX, ev.clientY);
  };

  private onPointerDown = (ev: PointerEvent): void => {
    if ((ev.target as HTMLElement).closest('button')) return;
    if (this.placing && ev.pointerType === 'touch') this.updatePlacement(ev.clientX, ev.clientY);
  };

  private onPointerUp = (ev: PointerEvent): void => {
    if ((ev.target as HTMLElement).closest('button')) return;
    if (ev.button === 2) return;
    if (this.placing) {
      this.updatePlacement(ev.clientX, ev.clientY);
      if (ev.pointerType === 'touch') {
        this.confirmBar.classList.remove('hidden');
        return;
      }
      this.tryPlace(ev.shiftKey);
      return;
    }
    const p = this.renderer.toWorld(ev.clientX, ev.clientY);
    let best: Tower | null = null;
    let bestD = Infinity;
    for (const t of this.game.towers) {
      const d = Math.hypot(t.x - p.x, t.y - p.y);
      if (d < t.def.radius + 10 && d < bestD) {
        best = t;
        bestD = d;
      }
    }
    this.select(best);
  };

  private onContext = (ev: Event): void => {
    ev.preventDefault();
    if (this.placing) this.cancelPlacing();
    else this.select(null);
  };

  private onKey = (ev: KeyboardEvent): void => {
    if (this.modalOpen && ev.key !== 'Escape') return;
    if (ev.key === ' ') {
      ev.preventDefault();
      this.onStartButton();
    } else if (ev.key === 'Escape') {
      if (this.placing) this.cancelPlacing();
      else if (this.selected) this.select(null);
      else if (this.modalOpen) this.closeModal();
      else this.openPauseMenu();
    } else if (ev.key === 'p' || ev.key === 'P') this.togglePause();
    else if (ev.key >= '1' && ev.key <= '9') {
      const list = this.availableTowers();
      const def = list[+ev.key - 1];
      if (def) this.beginPlacing(def);
    } else if (ev.key === '0') {
      const def = this.availableTowers()[9];
      if (def) this.beginPlacing(def);
    } else if (this.selected && (ev.key === ',' || ev.key === '.')) {
      this.buyUpgrade(this.selected, ev.key === ',' ? 0 : 1);
    } else if (this.selected && (ev.key === 'Delete' || ev.key === 'Backspace')) {
      this.sellTower(this.selected);
    } else if (this.selected && (ev.key === 'Tab' || ev.key === 't')) {
      ev.preventDefault();
      const i = TARGETING_MODES.indexOf(this.selected.targeting);
      this.game.setTargeting(this.selected, TARGETING_MODES[(i + 1) % TARGETING_MODES.length]);
    }
  };

  private availableTowers(): TowerDef[] {
    return TOWER_LIST.filter((d) => this.ctx.isTowerUnlocked(d) || this.game.mode === 'sandbox');
  }

  private beginPlacing(def: TowerDef): void {
    if (!this.game.canAfford(this.game.towerPrice(def))) {
      this.toast('Not enough money');
      this.ctx.audio?.ui('error');
      return;
    }
    this.select(null);
    this.placing = def;
    this.placeOk = false;
    this.renderer.placement = { def, x: -999, y: -999, ok: false };
    this.confirmBar.classList.add('hidden');
    this.ctx.audio?.ui('click');
    this.refreshShopSelection();
  }

  private updatePlacement(cx: number, cy: number): void {
    if (!this.placing) return;
    const p = this.renderer.toWorld(cx, cy);
    this.placeX = p.x;
    this.placeY = p.y;
    const chk = this.game.checkPlacement(this.placing, p.x, p.y);
    this.placeOk = chk.ok && this.game.canAfford(this.game.towerPrice(this.placing));
    this.renderer.placement = { def: this.placing, x: p.x, y: p.y, ok: this.placeOk };
  }

  private tryPlace(keep: boolean): void {
    if (!this.placing) return;
    const def = this.placing;
    const chk = this.game.checkPlacement(def, this.placeX, this.placeY);
    if (!chk.ok) {
      this.toast(chk.reason ?? 'Can’t place here');
      this.ctx.audio?.ui('error');
      return;
    }
    const t = this.game.placeTower(def.id, this.placeX, this.placeY);
    if (!t) {
      this.toast('Not enough money');
      this.ctx.audio?.ui('error');
      return;
    }
    if (keep && this.game.canAfford(this.game.towerPrice(def))) {
      this.updatePlacement(-9999, -9999);
      return;
    }
    this.cancelPlacing();
    this.select(t);
  }

  private confirmPlace(): void {
    this.confirmBar.classList.add('hidden');
    this.tryPlace(false);
  }

  private cancelPlacing(): void {
    this.placing = null;
    this.renderer.placement = null;
    this.confirmBar.classList.add('hidden');
    this.refreshShopSelection();
  }

  private select(t: Tower | null): void {
    this.selected = t;
    this.renderer.selected = t;
    this.panelKey = '';
    if (t) this.ctx.audio?.ui('click');
    this.renderSide();
  }

  private buyUpgrade(t: Tower, path: 0 | 1): void {
    if (!this.game.canUpgrade(t, path)) return;
    if (!this.game.upgrade(t, path)) {
      this.toast('Not enough money');
      this.ctx.audio?.ui('error');
      return;
    }
    this.panelKey = '';
  }

  private sellTower(t: Tower): void {
    this.game.sell(t);
    this.select(null);
  }

  // ───────────────────────── sidebar ─────────────────────────

  private buildTabs(): void {
    clear(this.tabs);
    const mk = (id: 'shop' | 'sandbox', label: string) =>
      h(
        'button',
        {
          class: this.tab === id ? 'active' : '',
          onclick: () => {
            this.tab = id;
            this.select(null);
            this.buildTabs();
          },
        },
        label,
      );
    this.tabs.append(mk('shop', 'TOWERS'));
    if (this.game.mode === 'sandbox') this.tabs.append(mk('sandbox', 'SANDBOX'));
  }

  private renderSide(): void {
    clear(this.sideBody);
    this.shopButtons.clear();
    this.statRefs = {};
    if (this.selected) this.renderUpgradePanel(this.selected);
    else if (this.tab === 'sandbox') this.renderSandbox();
    else this.renderShop();
  }

  private renderShop(): void {
    const grid = h('div', { class: 'shop-grid' });
    const info = h('div', { class: 'tower-info' }, 'Pick a tower, then click the map to place it. Right-click or Esc cancels.');
    let idx = 0;
    for (const def of TOWER_LIST) {
      const unlocked = this.ctx.isTowerUnlocked(def) || this.game.mode === 'sandbox';
      const key = unlocked ? ++idx : 0;
      const btn = h(
        'button',
        {
          class: 'shop-item' + (unlocked ? '' : ' locked'),
          onclick: () => unlocked && this.beginPlacing(def),
          onpointerenter: () => {
            info.innerHTML = '';
            info.append(h('b', {}, def.name.toUpperCase()), ' — ', def.role, h('br'), def.desc);
          },
        },
        key && key <= 10 ? h('span', { class: 'key' }, String(key % 10)) : null,
        h('img', { src: this.ctx.icon(def), alt: '' }),
        h('div', { class: 'name' }, def.name),
        h('div', { class: 'price' }, fmtMoney(this.game.towerPrice(def))),
        unlocked ? null : h('div', { class: 'lock' }, `🔒 Level ${def.unlockLevel}`),
      );
      this.shopButtons.set(def.id, btn);
      grid.append(btn);
    }
    this.sideBody.append(h('div', { class: 'section-title' }, 'Towers'), grid, info);
    this.refreshShopSelection();
  }

  private refreshShopSelection(): void {
    for (const [id, b] of this.shopButtons) b.classList.toggle('selected', this.placing?.id === id);
  }

  private updateSide(): void {
    if (this.selected) {
      const t = this.selected;
      if (!this.game.towers.includes(t)) {
        this.select(null);
        return;
      }
      const key = this.upgradeKey(t);
      if (key !== this.panelKey) this.renderSide();
      const r = this.statRefs;
      if (r.kills) r.kills.textContent = fmtNum(t.kills);
      if (r.sides) r.sides.textContent = fmtNum(t.sides);
      if (r.income) r.income.textContent = fmtMoney(t.incomeEarned);
      if (r.sell) r.sell.textContent = `SELL  ${fmtMoney(this.game.sellValue(t))}`;
      return;
    }
    if (this.tab === 'shop') {
      for (const def of TOWER_LIST) {
        const b = this.shopButtons.get(def.id);
        if (b) b.classList.toggle('poor', !this.game.canAfford(this.game.towerPrice(def)));
      }
    }
  }

  private upgradeKey(t: Tower): string {
    const g = this.game;
    const affordA = g.canAfford(g.upgradePrice(t, 0));
    const affordB = g.canAfford(g.upgradePrice(t, 1));
    return `${t.id}|${t.tierA}|${t.tierB}|${t.targeting}|${affordA}|${affordB}|${t.buff.discount}`;
  }

  private renderUpgradePanel(t: Tower): void {
    const g = this.game;
    this.panelKey = this.upgradeKey(t);
    const def = t.def;
    const s = t.stats;
    const types = [...new Set(s.attacks.map((a) => a.dmgType))];
    const head = h(
      'div',
      { class: 'up-head' },
      h('img', { src: this.ctx.icon(def), alt: '' }),
      h('div', { class: 'title' }, h('div', { class: 'name' }, def.name.toUpperCase()), h('div', { class: 'tier' }, def.role)),
      h('button', { class: 'icon-btn', onclick: () => this.select(null) }, '✕'),
    );
    const badges = h(
      'div',
      { class: 'badges' },
      ...types.map((d) => h('span', { class: `badge ${d}` }, DMG_LABEL[d])),
      s.detect || t.buff.detect ? h('span', { class: 'badge detect' }, '👁 Sees ghosts') : null,
      s.support?.reveal ? h('span', { class: 'badge detect' }, 'Reveals ghosts') : null,
      t.buff.rate > 0 || t.buff.range > 0 || t.buff.damage > 0 || t.buff.pierce > 0 ? h('span', { class: 'badge' }, '⬆ Boosted') : null,
    );
    this.sideBody.append(head, badges);
    for (const path of [0, 1] as const) {
      const p = def.paths[path];
      const tier = path === 0 ? t.tierA : t.tierB;
      const other = path === 0 ? t.tierB : t.tierA;
      const cap = pathCap(other);
      const pips = h('div', { class: 'pips' });
      for (let i = 0; i < 4; i++) pips.append(h('div', { class: 'pip' + (i < tier ? ' on' : i >= cap ? ' capped' : '') }));
      const list = h('div', { class: 'up-list' });
      p.upgrades.forEach((u, i) => {
        list.append(
          h(
            'div',
            { class: 'up-row' + (i < tier ? ' owned' : i >= cap ? ' locked' : '') },
            h('span', { class: 'tier' }, `T${i + 1}`),
            u.name,
          ),
        );
      });
      const box = h('div', { class: 'path' }, h('div', { class: 'path-head' }, h('span', {}, p.name.toUpperCase()), pips), list);
      if (tier < 4) {
        const u = p.upgrades[tier];
        const price = g.upgradePrice(t, path);
        const legal = g.canUpgrade(t, path);
        const afford = g.canAfford(price);
        const btn = h(
          'button',
          { class: afford ? '' : 'poor', disabled: !legal, onclick: () => this.buyUpgrade(t, path) },
          legal ? `BUY  ${fmtMoney(price)}` : 'PATH CAPPED',
        );
        box.append(
          h(
            'div',
            { class: 'up-next' + (tier === 3 ? ' tier4' : '') },
            h('div', { class: 'n' }, `${tier === 3 ? '★ ' : ''}${u.name}`),
            h('div', { class: 'd' }, legal ? u.desc : 'Only one path can go past tier 2.'),
            btn,
          ),
        );
      } else {
        box.append(h('div', { class: 'up-next tier4' }, h('div', { class: 'n' }, '★ MAXED')));
      }
      this.sideBody.append(box);
    }
    if (s.attacks.length) {
      const row = h('div', { class: 'target-row' });
      for (const m of TARGETING_MODES) {
        row.append(
          h(
            'button',
            {
              class: t.targeting === m ? 'active' : '',
              onclick: () => {
                g.setTargeting(t, m);
                this.panelKey = '';
              },
            },
            TARGET_LABEL[m],
          ),
        );
      }
      this.sideBody.append(h('div', { class: 'section-title' }, 'Targeting'), row);
    }
    const kills = h('b', {}, fmtNum(t.kills));
    const sides = h('b', {}, fmtNum(t.sides));
    this.statRefs.kills = kills;
    this.statRefs.sides = sides;
    const grid = h('div', { class: 'stats-grid' }, h('div', {}, 'Destroyed ', kills), h('div', {}, 'Sides ', sides));
    if (s.income) {
      const inc = h('b', {}, fmtMoney(t.incomeEarned));
      this.statRefs.income = inc;
      grid.append(h('div', {}, 'Earned ', inc));
    }
    const main = s.attacks[0];
    if (main) {
      grid.append(
        h('div', {}, 'Damage ', h('b', {}, String(main.damage + t.buff.damage))),
        h('div', {}, 'Pierce ', h('b', {}, String(main.pierce + t.buff.pierce))),
        h('div', {}, 'Range ', h('b', {}, s.range >= 1000 ? '∞' : String(Math.round(s.range * (1 + t.buff.range))))),
        h('div', {}, 'Speed ', h('b', {}, `${(1 / main.interval).toFixed(1)}/s`)),
      );
    }
    this.sideBody.append(h('div', { class: 'section-title' }, 'Stats'), grid);
    const sell = h('button', { class: 'sell-btn', onclick: () => this.sellTower(t) }, `SELL  ${fmtMoney(g.sellValue(t))}`);
    this.statRefs.sell = sell;
    this.sideBody.append(sell);
  }

  private renderSandbox(): void {
    const g = this.game;
    const body = this.sideBody;
    body.append(h('div', { class: 'section-title' }, 'Shape'));
    const ranks = h('div', { class: 'sb-row' });
    for (const r of Object.values(RANKS)) {
      ranks.append(
        h(
          'button',
          {
            class: !this.sbBoss && this.sbRank === r.sides ? 'active' : '',
            style: `color:#${r.color.toString(16).padStart(6, '0')}`,
            onclick: () => {
              this.sbRank = r.sides;
              this.sbBoss = '';
              this.renderSide();
            },
          },
          r.name,
        ),
      );
    }
    body.append(ranks, h('div', { class: 'section-title' }, 'Modifiers'));
    const mods = h('div', { class: 'sb-row' });
    for (const m of MOD_KEYS) {
      mods.append(
        h(
          'button',
          {
            class: this.sbMods.has(m) ? 'active' : '',
            onclick: () => {
              if (this.sbMods.has(m)) this.sbMods.delete(m);
              else this.sbMods.add(m);
              this.renderSide();
            },
          },
          m,
        ),
      );
    }
    body.append(mods, h('div', { class: 'section-title' }, 'Bosses'));
    const bosses = h('div', { class: 'sb-row' });
    for (const b of BOSSES) {
      bosses.append(
        h(
          'button',
          {
            class: this.sbBoss === b.key ? 'active' : '',
            onclick: () => {
              this.sbBoss = this.sbBoss === b.key ? '' : b.key;
              this.renderSide();
            },
          },
          b.name,
        ),
      );
    }
    const count = h('input', { type: 'number', min: 1, max: 500, value: this.sbCount, onchange: () => (this.sbCount = Math.max(1, Math.min(500, +count.value || 1))) });
    const spec = this.sbBoss || [RANKS[this.sbRank].key, ...[...this.sbMods]].join('.');
    body.append(
      bosses,
      h('div', { class: 'section-title' }, 'Spawn'),
      h('div', { class: 'tower-info', style: 'min-height:0;margin:0 0 6px' }, specLabel(spec)),
      h(
        'div',
        { class: 'sb-row' },
        count,
        h('button', { onclick: () => g.sandboxSpawn(spec, this.sbCount, this.sbBoss ? 1.2 : 0.2) }, 'SPAWN'),
        h('button', { onclick: () => g.sandboxSpawn(spec, this.sbCount, 0.02) }, 'BURST'),
      ),
    );
    const roundIn = h('input', { type: 'number', min: 1, max: 200, value: g.currentRound });
    body.append(
      h('div', { class: 'section-title' }, 'Rounds'),
      h(
        'div',
        { class: 'sb-row' },
        roundIn,
        h(
          'button',
          {
            onclick: () => {
              g.sandboxSetRound(Math.max(1, +roundIn.value || 1));
              this.hudCache = '';
            },
          },
          'SET NEXT',
        ),
      ),
      h('div', { class: 'section-title' }, 'Field'),
      h('div', { class: 'sb-row' }, h('button', { onclick: () => g.sandboxClear() }, 'CLEAR SHAPES'), h('button', { onclick: () => this.sellAll() }, 'SELL ALL TOWERS')),
    );
  }

  private sellAll(): void {
    for (const t of [...this.game.towers]) this.game.sell(t);
    this.select(null);
  }

  private updateAbilities(): void {
    const list = this.game.towers.filter((t) => t.stats.ability);
    const key = list.map((t) => `${t.id}:${t.stats.ability}`).join(',');
    if (key !== this.abilityKey) {
      this.abilityKey = key;
      clear(this.abilityBar);
      for (const t of list) {
        const info = ABILITY_INFO[t.stats.ability!];
        const cd = h('div', { class: 'cd' });
        const b = h('button', { title: info.desc, onclick: () => this.game.useAbility(t) || this.toast('Nothing to hit') }, cd, info.name.toUpperCase());
        (b as HTMLElement & { _t?: Tower; _cd?: HTMLElement })._t = t;
        (b as HTMLElement & { _t?: Tower; _cd?: HTMLElement })._cd = cd;
        this.abilityBar.append(b);
      }
    }
    for (const el of Array.from(this.abilityBar.children) as (HTMLButtonElement & { _t?: Tower; _cd?: HTMLElement })[]) {
      const t = el._t!;
      const f = t.stats.abilityCooldown > 0 ? t.abilityCd / t.stats.abilityCooldown : 0;
      el._cd!.style.width = `${f * 100}%`;
      el.disabled = f > 0;
    }
  }

  // ───────────────────────── modals ─────────────────────────

  private modal(card: HTMLElement): HTMLElement {
    this.closeModal();
    this.modalOpen = true;
    const m = h('div', { class: 'modal' }, card);
    m.dataset.modal = '1';
    this.stage.append(m);
    return m;
  }

  private closeModal(): void {
    this.modalOpen = false;
    this.stage.querySelectorAll('[data-modal]').forEach((m) => m.remove());
  }

  private openPauseMenu(): void {
    const st = this.ctx.profile.settings;
    const sound = h('button', {
      onclick: () => {
        st.muted = !st.muted;
        this.ctx.saveProfile();
        this.ctx.audio?.setVolume(st.muted ? 0 : st.volume);
        sound.textContent = st.muted ? '🔇 SOUND OFF' : '🔊 SOUND ON';
      },
    }, st.muted ? '🔇 SOUND OFF' : '🔊 SOUND ON');
    const quality = h('button', {
      onclick: () => {
        st.quality = st.quality === 'high' ? 'medium' : st.quality === 'medium' ? 'low' : 'high';
        this.ctx.saveProfile();
        this.renderer.setQuality(st.quality);
        quality.textContent = `EFFECTS: ${st.quality.toUpperCase()}`;
      },
    }, `EFFECTS: ${st.quality.toUpperCase()}`);
    const card = h(
      'div',
      { class: 'modal-card' },
      h('h2', {}, 'PAUSED'),
      h('div', { class: 'sub' }, `${this.opts.map.name} · ${this.game.mode === 'sandbox' ? 'Sandbox' : DIFFICULTIES[this.game.diff.id].name}`),
      h(
        'div',
        { class: 'btns' },
        h('button', { onclick: () => this.closeModal() }, 'RESUME'),
        sound,
        quality,
        h('button', { onclick: () => this.restart() }, 'RESTART'),
        h('button', { onclick: () => this.ctx.exitToMenu() }, 'QUIT TO MENU'),
      ),
      h('div', { class: 'sub', style: 'margin-top:12px;font-size:13px' }, 'Space: start / speed · P: pause · 1-0: towers · , . : upgrade · T: targeting · Del: sell'),
    );
    this.modal(card);
  }

  private restart(): void {
    this.closeModal();
    this.ctx.deleteSnapshot(this.opts.map.id);
    this.newGame();
  }

  private showEnd(win: boolean): void {
    const g = this.game;
    const st = g.stats;
    const best = [...g.towers].sort((a, b) => b.sides - a.sides)[0];
    const stats = h(
      'div',
      { class: 'end-stats' },
      h('div', {}, 'Rounds ', h('b', {}, String(g.completed))),
      h('div', {}, 'Shapes destroyed ', h('b', {}, fmtNum(st.shapesDestroyed))),
      h('div', {}, 'Sides broken ', h('b', {}, fmtNum(st.sidesBroken))),
      h('div', {}, 'Bosses ', h('b', {}, fmtNum(st.bossesKilled))),
      h('div', {}, 'Money earned ', h('b', {}, fmtMoney(st.moneyEarned))),
      h('div', {}, 'Lives lost ', h('b', {}, fmtNum(st.livesLost))),
      h('div', {}, 'Towers built ', h('b', {}, fmtNum(st.towersPlaced))),
      h('div', {}, 'MVP ', h('b', {}, best ? best.def.name : '—')),
    );
    const xp = this.ctx.lastXpGain();
    const btns = h('div', { class: 'btns' });
    if (win) {
      btns.append(
        h(
          'button',
          {
            onclick: () => {
              g.continueFreeplay();
              this.closeModal();
              this.ctx.saveSnapshot(g);
            },
          },
          'CONTINUE IN FREEPLAY',
        ),
      );
    }
    btns.append(h('button', { onclick: () => this.restart() }, win ? 'PLAY AGAIN' : 'RETRY'), h('button', { onclick: () => this.ctx.exitToMenu() }, 'MAIN MENU'));
    const card = h(
      'div',
      { class: 'modal-card' },
      h('h2', { class: win ? 'win' : 'lose' }, win ? 'VICTORY' : 'SHATTERED'),
      h('div', { class: 'sub' }, win ? `${this.opts.map.name} cleared on ${g.diff.name}!` : `Your defenses broke on round ${g.currentRound}.`),
      stats,
      xp > 0 ? h('div', { class: 'sub', style: 'margin-top:12px;color:var(--cyan)' }, `+${fmtNum(xp)} XP`) : null,
      ...this.ctx.drainUnlockMessages().map((m) => h('div', { class: 'sub', style: 'color:var(--gold)' }, `🔓 ${m}`)),
      btns,
    );
    this.modal(card);
  }
}
