import { towerRange, findTargets, explode } from './combat';
import { EV } from './events';
import type { Game } from './game';
import { damageShape } from './shapesys';
import { MOD, type AbilityId, type Tower } from './types';
import { attack } from '../data/towers/types';

export const ABILITY_INFO: Record<AbilityId, { name: string; desc: string; index: number }> = {
  absoluteZero: { name: 'Absolute Zero', desc: 'Freeze every shape on screen. Bosses are heavily slowed.', index: 0 },
  rubOut: { name: 'Great Rub-Out', desc: 'A colossal eraser slam on the strongest target. Stuns bosses.', index: 1 },
  pirateHook: { name: 'Pi-rate Hook', desc: 'Hook the strongest boss in range and drag it backwards.', index: 2 },
  hyperfold: { name: 'Hyperfold', desc: 'Fold space: every non-boss shape in range is sent back to the start.', index: 3 },
};

const RUB_OUT = attack({ kind: 'lob', dmgType: 'explosive', damage: 40, pierce: 300, splash: 150, stun: 2.5, bossMul: 40 });
const HOOK = attack({ kind: 'hitscan', dmgType: 'energy', damage: 600 });

/** Triggers a tower's ability. Returns false (and keeps the cooldown) if it had nothing to hit. */
export function activateAbility(g: Game, t: Tower): boolean {
  const id = t.stats.ability;
  if (!id || t.abilityCd > 0) return false;
  const range = towerRange(t);
  let ok = false;
  switch (id) {
    case 'absoluteZero': {
      for (const s of g.shapes) {
        if (!s.alive) continue;
        if (s.kind > 0) {
          s.slow = Math.max(s.slow, 6);
          s.slowMul = Math.min(s.slowMul, 0.3);
        } else if (!(s.mods & MOD.CRYSTAL)) {
          s.freeze = Math.max(s.freeze, 4);
          s.brittle = Math.max(s.brittle, 1);
          s.frozenBy = t.id;
        }
      }
      ok = true;
      g.events.push(EV.ABILITY, t.x, t.y, ABILITY_INFO[id].index, 2000, 0, t.def.color);
      break;
    }
    case 'rubOut': {
      const tg = findTargets(g, t, { mode: 'strong', count: 1, range: range * 1.5, ignoreLos: true, seeAll: true });
      if (!tg.length) return false;
      const s = tg[0];
      explode(g, s.x, s.y, RUB_OUT.splash, RUB_OUT.damage, RUB_OUT.pierce, RUB_OUT, t);
      g.events.push(EV.ABILITY, s.x, s.y, ABILITY_INFO[id].index, RUB_OUT.splash, 0, t.def.color);
      ok = true;
      break;
    }
    case 'pirateHook': {
      const tg = findTargets(g, t, { mode: 'strong', count: 1, range: range * 1.6, bossOnly: true, ignoreLos: true, seeAll: true });
      if (!tg.length) return false;
      const s = tg[0];
      if (s.kind !== 5) s.back = Math.max(s.back, 5);
      damageShape(g, s, HOOK.damage, HOOK.dmgType, t, HOOK);
      g.events.push(EV.ABILITY, s.x, s.y, ABILITY_INFO[id].index, 60, 0, t.def.color);
      g.events.push(EV.TRACER, t.x, t.y, s.x, s.y, 2, t.def.color);
      ok = true;
      break;
    }
    case 'hyperfold': {
      const r = range * 1.4;
      for (const s of g.shapes) {
        if (!s.alive) continue;
        if ((s.x - t.x) ** 2 + (s.y - t.y) ** 2 > (r + s.radius) ** 2) continue;
        const ox = s.x;
        const oy = s.y;
        if (s.kind > 0) s.dist = Math.max(0, s.dist - 500);
        else s.dist = 0;
        g.events.push(EV.FOLD, ox, oy, ox, oy, 1, t.def.color);
      }
      g.events.push(EV.ABILITY, t.x, t.y, ABILITY_INFO[id].index, r, 0, t.def.color);
      ok = true;
      break;
    }
  }
  if (ok) t.abilityCd = t.stats.abilityCooldown;
  return ok;
}
