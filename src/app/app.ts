import { Container, Graphics, Rectangle, Sprite, type Application, type Ticker } from 'pixi.js';
import { ACHIEVEMENTS } from '../data/achievements';
import { DIFFICULTIES, DIFFICULTY_ORDER, type DifficultyId } from '../data/difficulty';
import { MAP_LIST } from '../data/maps';
import type { MapDef } from '../data/maps/types';
import { RANKS } from '../data/shapes';
import type { TowerDef } from '../data/towers/types';
import { WORLD_H, WORLD_W } from '../sim/constants';
import type { Game, GameMode } from '../sim/game';
import { Path } from '../sim/path';
import { buildMapArt } from '../render/mapArt';
import { GameRenderer } from '../render/renderer';
import type { TextureBank } from '../render/textures';
import { deleteGame, defaultProfile, loadGame, saveGame, saveProfile, type Profile } from '../save/storage';
import { clear, fmtNum, h } from '../ui/dom';
import type { AppContext, AudioLike } from './context';
import { GameScreen } from './gameScreen';
import { Progress, xpProgress } from './progress';

/** Floating neon shapes behind the menus. */
class MenuBackdrop {
  readonly root = new Container();
  private items: { s: Sprite; vx: number; vy: number; vr: number }[] = [];

  constructor(
    private app: Application,
    tex: TextureBank,
  ) {
    const g = new Graphics();
    this.root.addChild(g);
    this.draw(g);
    const ranks = Object.keys(RANKS).map(Number);
    for (let i = 0; i < 46; i++) {
      const rank = ranks[i % ranks.length];
      const mods = i % 7 === 0 ? 2 : i % 11 === 0 ? 1 : i % 13 === 0 ? 8 : 0;
      const s = new Sprite(tex.shape(rank, mods));
      s.anchor.set(0.5);
      s.scale.set(0.8 + Math.random() * 1.6);
      s.alpha = 0.25 + Math.random() * 0.45;
      s.position.set(Math.random() * 1920, Math.random() * 1080);
      this.root.addChild(s);
      this.items.push({ s, vx: (Math.random() - 0.5) * 30, vy: -10 - Math.random() * 30, vr: (Math.random() - 0.5) * 1.2 });
    }
  }

  private draw(g: Graphics): void {
    g.clear();
    const w = Math.max(1920, this.app.screen.width);
    const hh = Math.max(1080, this.app.screen.height);
    g.rect(0, 0, w, hh).fill({ color: 0x060d1f });
    for (let x = 0; x <= w; x += 40) g.moveTo(x, 0).lineTo(x, hh);
    for (let y = 0; y <= hh; y += 40) g.moveTo(0, y).lineTo(w, y);
    g.stroke({ width: 1, color: 0x2ff3ff, alpha: 0.05 });
    for (let x = 0; x <= w; x += 200) g.moveTo(x, 0).lineTo(x, hh);
    for (let y = 0; y <= hh; y += 200) g.moveTo(0, y).lineTo(w, y);
    g.stroke({ width: 1, color: 0x2ff3ff, alpha: 0.1 });
  }

  update(dt: number): void {
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    for (const it of this.items) {
      it.s.x += it.vx * dt;
      it.s.y += it.vy * dt;
      it.s.rotation += it.vr * dt;
      if (it.s.y < -60) {
        it.s.y = H + 60;
        it.s.x = Math.random() * W;
      }
      if (it.s.x < -60) it.s.x = W + 60;
      if (it.s.x > W + 60) it.s.x = -60;
    }
  }
}

export class App implements AppContext {
  readonly profile: Profile;
  readonly progress: Progress;
  audio: AudioLike | null = null;
  private icons = new Map<string, string>();
  private thumbs = new Map<string, string>();
  private screen: { unmount(): void } | null = null;
  private backdrop: MenuBackdrop;
  private menuHost: HTMLElement | null = null;

  constructor(
    readonly root: HTMLElement,
    readonly pixi: Application,
    readonly tex: TextureBank,
    profile: Profile,
  ) {
    this.profile = profile;
    this.progress = new Progress(profile, () => this.saveProfile());
    this.backdrop = new MenuBackdrop(pixi, tex);
  }

  // ───────────── AppContext ─────────────

  saveProfile(): void {
    saveProfile(this.profile);
  }

  icon(def: TowerDef): string {
    let url = this.icons.get(def.id);
    if (!url) {
      const art = GameRenderer.iconArt(def);
      const canvas = this.pixi.renderer.extract.canvas({ target: art, frame: new Rectangle(-28, -28, 56, 56), resolution: 2 }) as HTMLCanvasElement;
      url = canvas.toDataURL();
      art.destroy({ children: true });
      this.icons.set(def.id, url);
    }
    return url;
  }

  mapThumb(map: MapDef): string {
    let url = this.thumbs.get(map.id);
    if (!url) {
      const { root } = buildMapArt(map, map.paths.map((p) => new Path(p)));
      const canvas = this.pixi.renderer.extract.canvas({ target: root, frame: new Rectangle(0, 0, WORLD_W, WORLD_H), resolution: 0.3 }) as HTMLCanvasElement;
      url = canvas.toDataURL();
      root.destroy({ children: true });
      this.thumbs.set(map.id, url);
    }
    return url;
  }

  isTowerUnlocked(def: TowerDef): boolean {
    return this.progress.isTowerUnlocked(def);
  }

  onGameStart(g: Game): void {
    this.progress.gameStarted(g);
  }

  onRoundCleared(g: Game, round: number): void {
    this.progress.roundCleared(g, round);
  }

  onVictory(g: Game): void {
    this.progress.victory(g);
    deleteGame(g.map.id);
  }

  onDefeat(g: Game): void {
    this.progress.defeat(g);
    deleteGame(g.map.id);
  }

  saveSnapshot(g: Game): void {
    if (g.mode === 'normal') saveGame(g.snapshot());
  }

  deleteSnapshot(mapId: string): void {
    deleteGame(mapId);
  }

  lastXpGain(): number {
    return this.progress.lastGameXp();
  }

  drainUnlockMessages(): string[] {
    return this.progress.drainMessages();
  }

  exitToMenu(): void {
    this.showMainMenu();
  }

  // ───────────── screens ─────────────

  private swap(): void {
    if (this.screen) this.screen.unmount();
    this.screen = null;
    clear(this.root);
    this.pixi.stage.removeChildren();
  }

  private menuFrame = (t: Ticker) => this.backdrop.update(Math.min(0.1, t.deltaMS / 1000));

  /** Shows a DOM menu screen over the animated backdrop. */
  private menu(children: (HTMLElement | null)[]): HTMLElement {
    this.swap();
    const bg = h('div', { class: 'menu-bg' });
    const el = h('div', { class: 'menu-screen' }, bg, ...children);
    this.root.append(el);
    bg.append(this.pixi.canvas);
    this.pixi.resizeTo = bg;
    this.pixi.resize();
    this.pixi.stage.addChild(this.backdrop.root);
    this.pixi.ticker.add(this.menuFrame);
    this.menuHost = el;
    this.screen = {
      unmount: () => {
        this.pixi.ticker.remove(this.menuFrame);
        this.pixi.stage.removeChild(this.backdrop.root);
        el.remove();
        this.menuHost = null;
      },
    };
    return el;
  }

  private playerChip(): HTMLElement {
    const p = xpProgress(this.profile.xp);
    const bar = h('div', { class: 'xpbar' }, h('div', { style: `width:${Math.round((p.into / p.need) * 100)}%` }));
    return h('div', { class: 'player-chip' }, `LEVEL ${p.level}`, bar, `${fmtNum(p.into)} / ${fmtNum(p.need)} XP`);
  }

  showMainMenu(): void {
    const click = () => this.audio?.ui('click');
    this.menu([
      h('div', { class: 'logo' }, 'GEOMETRY', h('br'), 'TOWER ', h('span', { class: 'd' }, 'D')),
      h('div', { class: 'tagline' }, 'Break every side'),
      this.playerChip(),
      h(
        'div',
        { class: 'menu-buttons' },
        h('button', { class: 'primary', onclick: () => (click(), this.showMapSelect('normal')) }, 'PLAY'),
        h('button', { onclick: () => (click(), this.showMapSelect('sandbox')) }, 'SANDBOX'),
        h('button', { onclick: () => (click(), this.showAchievements()) }, 'ACHIEVEMENTS'),
        h('button', { onclick: () => (click(), this.showSettings()) }, 'SETTINGS'),
      ),
    ]);
  }

  private back(): HTMLButtonElement {
    return h('button', { onclick: () => (this.audio?.ui('back'), this.showMainMenu()) }, '◀ BACK');
  }

  showMapSelect(mode: GameMode): void {
    const grid = h('div', { class: 'map-grid' });
    for (const map of MAP_LIST) {
      const unlocked = this.progress.isMapUnlocked(map) || mode === 'sandbox';
      const medals = this.profile.medals[map.id] ?? {};
      const save = mode === 'normal' ? loadGame(map.id) : null;
      const card = h(
        'button',
        { class: 'map-card' + (unlocked ? '' : ' locked'), onclick: () => unlocked && this.pickMap(map, mode) },
        h('img', { src: this.mapThumb(map), alt: map.name }),
        h(
          'div',
          { class: 'info' },
          h('div', { class: 'mname' }, map.name),
          h('div', { class: 'tier' }, `${map.tier} · ${map.paths.length > 1 ? `${map.paths.length} paths` : '1 path'}${map.water.length ? ' · water' : ''}${map.obstacles.length ? ' · blockers' : ''}`),
          mode === 'normal'
            ? h('div', { class: 'medals' }, ...DIFFICULTY_ORDER.map((d) => h('div', { class: `medal ${d}${medals[d] ? ' got' : ''}`, title: DIFFICULTIES[d].name }, d[0].toUpperCase())))
            : null,
          unlocked ? null : h('div', { class: 'lockmsg' }, `🔒 ${this.progress.mapUnlockText(map)}`),
          save ? h('div', { class: 'continue' }, `▶ Saved game: round ${save.completed + 1} (${DIFFICULTIES[save.difficulty].name})`) : null,
        ),
      );
      grid.append(card);
    }
    this.menu([h('div', { class: 'screen-head' }, this.back(), h('h1', {}, mode === 'sandbox' ? 'SANDBOX · PICK A MAP' : 'PICK A MAP')), grid]);
  }

  private pickMap(map: MapDef, mode: GameMode): void {
    this.audio?.ui('click');
    if (mode === 'sandbox') {
      this.startGame(map, 'medium', 'sandbox');
      return;
    }
    const save = loadGame(map.id);
    const close = () => modal.remove();
    const diffs = h(
      'div',
      { class: 'diff-row' },
      ...DIFFICULTY_ORDER.map((d) => {
        const def = DIFFICULTIES[d];
        return h(
          'button',
          {
            onclick: () => {
              close();
              deleteGame(map.id);
              this.startGame(map, d, 'normal');
            },
          },
          def.name.toUpperCase(),
          h('span', { class: 'small' }, `${def.rounds} rounds · ${def.lives} lives`),
          h('span', { class: 'small' }, d === 'easy' ? 'Cheaper towers' : d === 'hard' ? 'Pricier towers' : 'Standard prices'),
        );
      }),
    );
    const card = h(
      'div',
      { class: 'modal-card' },
      h('h2', {}, map.name.toUpperCase()),
      h('div', { class: 'sub' }, map.blurb),
      save
        ? h(
            'div',
            { class: 'btns', style: 'margin:0 0 14px' },
            h(
              'button',
              {
                style: 'border-color:var(--green)',
                onclick: () => {
                  close();
                  this.startGame(map, save.difficulty, 'normal', save);
                },
              },
              `CONTINUE · ROUND ${save.completed + 1} (${DIFFICULTIES[save.difficulty].name.toUpperCase()})`,
            ),
          )
        : null,
      save ? h('div', { class: 'sub' }, 'or start over:') : null,
      diffs,
      h('div', { class: 'btns' }, h('button', { onclick: close }, 'CANCEL')),
    );
    const modal = h('div', { class: 'modal', onclick: (e: Event) => e.target === modal && close() }, card);
    this.menuHost?.append(modal);
  }

  startGame(map: MapDef, difficulty: DifficultyId, mode: GameMode, snapshot?: ReturnType<typeof loadGame>): void {
    this.swap();
    const screen = new GameScreen(this, { map, difficulty, mode, snapshot: snapshot ?? undefined });
    screen.mount(this.root);
    this.screen = screen;
  }

  showSettings(): void {
    const st = this.profile.settings;
    const save = () => {
      this.saveProfile();
      this.audio?.setVolume(st.muted ? 0 : st.volume);
    };
    const seg = (opts: string[], cur: () => string, set: (v: string) => void) => {
      const wrap = h('div', { class: 'seg' });
      const draw = () => {
        clear(wrap);
        for (const o of opts)
          wrap.append(
            h(
              'button',
              {
                class: cur() === o ? 'active' : '',
                onclick: () => {
                  set(o);
                  save();
                  draw();
                  this.audio?.ui('click');
                },
              },
              o.toUpperCase(),
            ),
          );
      };
      draw();
      return wrap;
    };
    const vol = h('input', {
      type: 'range',
      min: 0,
      max: 100,
      value: Math.round(st.volume * 100),
      oninput: () => {
        st.volume = +vol.value / 100;
        save();
      },
      onchange: () => this.audio?.ui('click'),
    });
    const resetBtn = h('button', {
      style: 'border-color:var(--pink)',
      onclick: () => {
        if (resetBtn.dataset.armed) {
          const fresh = defaultProfile();
          Object.assign(this.profile, fresh);
          for (const m of MAP_LIST) deleteGame(m.id);
          this.saveProfile();
          this.showSettings();
        } else {
          resetBtn.dataset.armed = '1';
          resetBtn.textContent = 'CLICK AGAIN TO ERASE EVERYTHING';
        }
      },
    }, 'RESET PROGRESS');
    this.menu([
      h('div', { class: 'screen-head', style: 'width:min(460px,92vw)' }, this.back(), h('h1', {}, 'SETTINGS')),
      h(
        'div',
        { class: 'settings-list' },
        h('div', { class: 'setting' }, 'Volume', vol),
        h('div', { class: 'setting' }, 'Sound', seg(['on', 'off'], () => (st.muted ? 'off' : 'on'), (v) => (st.muted = v === 'off'))),
        h('div', { class: 'setting' }, 'Effects quality', seg(['low', 'medium', 'high'], () => st.quality, (v) => (st.quality = v as Profile['settings']['quality']))),
        h('div', { class: 'setting' }, 'Screen shake', seg(['on', 'off'], () => (st.shake ? 'on' : 'off'), (v) => (st.shake = v === 'on'))),
        h('div', { class: 'setting' }, 'Show FPS', seg(['on', 'off'], () => (st.showFps ? 'on' : 'off'), (v) => (st.showFps = v === 'on'))),
        h('div', { class: 'setting' }, 'Progress', resetBtn),
      ),
    ]);
  }

  showAchievements(): void {
    const list = h('div', { class: 'ach-list' });
    for (const a of ACHIEVEMENTS) {
      const done = this.profile.achievements.includes(a.id);
      const maps = MAP_LIST.filter((m) => m.unlock === a.id).map((m) => m.name);
      list.append(
        h(
          'div',
          { class: 'ach' + (done ? ' done' : '') },
          h('div', { class: 'ic' }, done ? a.icon : '🔒'),
          h('div', {}, h('div', { class: 't' }, a.name), h('div', { class: 'd' }, a.desc + (maps.length ? ` Unlocks map: ${maps.join(', ')}.` : ''))),
        ),
      );
    }
    const t = this.profile.totals;
    this.menu([
      h('div', { class: 'screen-head', style: 'width:min(700px,100%)' }, this.back(), h('h1', {}, 'ACHIEVEMENTS')),
      this.playerChip(),
      h('div', { class: 'player-chip' }, `Shapes destroyed: ${fmtNum(t.shapes)} · Wins: ${t.wins} · Best round: ${t.bestRound}`),
      list,
    ]);
  }
}
