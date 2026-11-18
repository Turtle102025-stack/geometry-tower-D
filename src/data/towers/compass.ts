import { attack, stats, type TowerDef } from './types';

export const compass: TowerDef = {
  id: 'compass',
  name: 'Compass',
  role: '360° burst',
  desc: 'Spins and flings needles in every direction. Loves corners.',
  cost: 320,
  color: 0xff9a3d,
  radius: 20,
  unlockLevel: 1,
  base: () =>
    stats({
      range: 100,
      attacks: [attack({ kind: 'burst', damage: 1, pierce: 1, interval: 1.25, speed: 520, count: 8, travel: 110, style: 'needle', radius: 5 })],
    }),
  paths: [
    {
      name: 'Radius',
      upgrades: [
        { name: 'More Needles', desc: 'Fires 12 needles per spin.', cost: 210, apply: (s) => { s.attacks[0].count = 12; } },
        { name: 'Wide Arc', desc: '+25 range, needles fly further.', cost: 240, apply: (s) => { s.range += 25; s.attacks[0].travel += 25; } },
        { name: 'Needle Storm', desc: '16 needles, much faster spins, +1 pierce.', cost: 950, apply: (s) => { const a = s.attacks[0]; a.count = 16; a.interval *= 0.6; a.pierce += 1; } },
        { name: 'Perfect Circle', desc: 'A ring of spinning blades orbits the tower, shredding anything that touches it.', cost: 3900, apply: (s) => { s.attacks.push(attack({ kind: 'orbit', damage: 2, dmgType: 'sharp', pierceArmor: true, orbit: { blades: 6, radius: 74, spin: 3.4, bladeRadius: 13, rehit: 0.22 } })); s.attacks[0].count = 20; } },
      ],
    },
    {
      name: 'Hot Pivot',
      upgrades: [
        { name: 'Quick Spin', desc: 'Spins 33% faster.', cost: 230, apply: (s) => { s.attacks[0].interval *= 0.75; } },
        { name: 'Hot Needles', desc: 'Needles glow with energy: they can hurt Armored shapes.', cost: 400, apply: (s) => { const a = s.attacks[0]; a.dmgType = 'energy'; a.style = 'hotneedle'; } },
        { name: 'Swirl', desc: 'Needles swirl in a spiral: +4 needles, +2 pierce.', cost: 980, apply: (s) => { const a = s.attacks[0]; a.count += 4; a.pierce += 2; a.spin = 0.26; } },
        { name: 'Spirograph', desc: 'Endless looping spirals of searing needles.', cost: 4300, apply: (s) => { const a = s.attacks[0]; a.interval = 0.2; a.count = 12; a.spin = 0.45; a.damage = 2; a.travel += 40; a.speed = 600; } },
      ],
    },
  ],
};
