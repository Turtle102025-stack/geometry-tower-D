import { attack, deg, stats, type TowerDef } from './types';

export const pointPlotter: TowerDef = {
  id: 'plotter',
  name: 'Point Plotter',
  role: 'Rapid fire',
  desc: 'Plots points at a ridiculous rate. Weak hits, but lots of them.',
  cost: 350,
  color: 0x2ff3ff,
  radius: 19,
  unlockLevel: 1,
  base: () =>
    stats({
      range: 125,
      attacks: [attack({ kind: 'dart', damage: 1, pierce: 1, interval: 0.2, speed: 780, style: 'dot', radius: 5, spread: deg(4) })],
    }),
  paths: [
    {
      name: 'Density',
      upgrades: [
        { name: 'Faster Plotting', desc: 'Plots 33% faster.', cost: 230, apply: (s) => { s.attacks[0].interval *= 0.75; } },
        { name: 'Double Points', desc: 'Each point pierces one extra shape.', cost: 460, apply: (s) => { s.attacks[0].pierce += 1; } },
        { name: 'Scatter Plot', desc: 'Sprays three points per shot.', cost: 1650, apply: (s) => { const a = s.attacks[0]; a.count = 3; a.spread = deg(18); a.interval *= 0.9; } },
        { name: 'Point Cloud', desc: 'A storm of supercharged points. Melts crowds.', cost: 8600, apply: (s) => { const a = s.attacks[0]; a.interval = 0.05; a.count = 3; a.damage = 2; a.pierce += 1; a.style = 'bigdot'; a.speed = 900; } },
      ],
    },
    {
      name: 'Precision',
      upgrades: [
        { name: 'Long Axis', desc: 'Longer axes: +40 range.', cost: 200, apply: (s) => { s.range += 40; } },
        { name: 'Graph Scope', desc: 'Can see and target Ghost shapes.', cost: 360, apply: (s) => { s.detect = true; } },
        { name: 'Coordinate Lock', desc: '+1 damage, +1 pierce, and precise points crack Armored shapes.', cost: 1350, apply: (s) => { const a = s.attacks[0]; a.damage += 1; a.pierce += 1; a.pierceArmor = true; a.spread = 0; } },
        { name: 'Line of Best Fit', desc: 'Also fires a laser-straight line that cuts through everything in its way.', cost: 6200, apply: (s) => { s.attacks.push(attack({ kind: 'dart', damage: 4, pierce: 60, interval: 0.9, speed: 1500, radius: 12, travel: 1500, style: 'line', pierceArmor: true })); } },
      ],
    },
  ],
};
