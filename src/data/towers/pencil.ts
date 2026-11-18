import { attack, deg, stats, type TowerDef } from './types';

export const pencil: TowerDef = {
  id: 'pencil',
  name: 'Pencil',
  role: 'Basic shooter',
  desc: 'Reliable, cheap, sharp. Fires graphite darts at a single target.',
  cost: 200,
  color: 0xffd23f,
  radius: 20,
  unlockLevel: 1,
  base: () =>
    stats({
      range: 140,
      attacks: [attack({ kind: 'dart', damage: 1, pierce: 2, interval: 0.9, speed: 640, style: 'pencil', radius: 6 })],
    }),
  paths: [
    {
      name: 'Sharpen',
      upgrades: [
        { name: 'Fine Tip', desc: 'Darts punch through one more shape and reach a bit further.', cost: 120, apply: (s) => { s.attacks[0].pierce += 1; s.range += 12; } },
        { name: 'Graphite Core', desc: '+1 damage per dart.', cost: 190, apply: (s) => { s.attacks[0].damage += 1; } },
        { name: 'Steel Nib', desc: 'Steel-tipped darts: +4 pierce, +1 damage, and they crack Armored shapes.', cost: 700, apply: (s) => { const a = s.attacks[0]; a.pierce += 4; a.damage += 1; a.pierceArmor = true; a.speed = 820; a.style = 'steel'; } },
        { name: 'Diamond Point', desc: 'Diamond-tipped lances that tear through an entire line of shapes.', cost: 4300, apply: (s) => { const a = s.attacks[0]; a.damage = 6; a.pierce = 45; a.interval *= 0.65; a.speed = 1100; a.travel = 900; a.radius = 9; a.style = 'diamond'; s.range += 30; } },
      ],
    },
    {
      name: 'Colored Pencils',
      upgrades: [
        { name: 'Quick Draw', desc: 'Throws 25% faster.', cost: 110, apply: (s) => { s.attacks[0].interval *= 0.8; } },
        { name: 'Twin Pencils', desc: 'Fires two pencils at once.', cost: 240, apply: (s) => { const a = s.attacks[0]; a.count = 2; a.spread = deg(12); } },
        { name: 'Color Fan', desc: 'A fan of four colored pencils, a little faster.', cost: 600, apply: (s) => { const a = s.attacks[0]; a.count = 4; a.spread = deg(34); a.interval *= 0.85; a.style = 'color'; } },
        { name: 'Rainbow Volley', desc: 'Eight-pencil rainbow volleys at blistering speed. +1 damage.', cost: 3400, apply: (s) => { const a = s.attacks[0]; a.count = 8; a.spread = deg(70); a.interval *= 0.6; a.damage += 1; a.style = 'rainbow'; } },
      ],
    },
  ],
};
