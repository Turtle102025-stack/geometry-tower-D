import { attack, stats, type TowerDef } from './types';

export const vector: TowerDef = {
  id: 'vector',
  name: 'Vector',
  role: 'Long-range sniper',
  desc: 'Direction and magnitude. Hits anything, anywhere on the map, instantly.',
  cost: 380,
  color: 0x8cff3a,
  radius: 20,
  unlockLevel: 3,
  base: () =>
    stats({
      range: 2000,
      attacks: [attack({ kind: 'hitscan', damage: 2, pierce: 1, interval: 1.5, style: 'arrow' })],
    }),
  paths: [
    {
      name: 'Magnitude',
      upgrades: [
        { name: 'Heavy Arrows', desc: 'Damage 2 → 4.', cost: 360, apply: (s) => { s.attacks[0].damage = 4; } },
        { name: 'Armor Piercing', desc: 'Arrows punch through Armored shapes.', cost: 460, apply: (s) => { s.attacks[0].pierceArmor = true; } },
        { name: 'Big Magnitude', desc: 'Damage 12, triple damage to bosses, fires faster.', cost: 2700, apply: (s) => { const a = s.attacks[0]; a.damage = 12; a.bossMul = 3; a.interval *= 0.8; } },
        { name: 'Infinite Magnitude', desc: 'Damage 40, quadruple damage to bosses, fires much faster. Bosses fear it.', cost: 7300, apply: (s) => { const a = s.attacks[0]; a.damage = 40; a.bossMul = 4; a.interval *= 0.7; a.style = 'bigarrow'; } },
      ],
    },
    {
      name: 'Components',
      upgrades: [
        { name: 'Night Sight', desc: 'Can see and target Ghost shapes.', cost: 300, apply: (s) => { s.detect = true; } },
        { name: 'Quick Bolt', desc: 'Fires 66% faster.', cost: 460, apply: (s) => { s.attacks[0].interval *= 0.6; } },
        { name: 'Split Vector', desc: 'Each hit splits into 4 smaller arrows.', cost: 1950, apply: (s) => { s.attacks[0].onHit = attack({ kind: 'dart', count: 4, damage: 1, pierce: 3, speed: 540, travel: 95, style: 'minarrow' }); } },
        { name: 'Vector Field', desc: 'Each hit explodes into a field of 10 arrows. Fires even faster.', cost: 6100, apply: (s) => { const a = s.attacks[0]; a.onHit = attack({ kind: 'dart', count: 10, damage: 2, pierce: 4, speed: 600, travel: 135, style: 'minarrow' }); a.interval *= 0.6; } },
      ],
    },
  ],
};
