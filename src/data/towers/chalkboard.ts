import { stats, support, type TowerDef } from './types';

export const chalkboard: TowerDef = {
  id: 'chalkboard',
  name: 'Chalkboard',
  role: 'Boosts nearby towers',
  desc: 'Writes formulas that make every tower in range attack faster. Doesn’t attack.',
  cost: 900,
  color: 0x8fffc0,
  radius: 22,
  unlockLevel: 7,
  base: () => stats({ range: 120, support: support({ buffRate: 0.15 }) }),
  paths: [
    {
      name: 'Formulas',
      upgrades: [
        { name: 'Quick Maths', desc: 'Nearby towers attack 25% faster.', cost: 520, apply: (s) => { s.support!.buffRate = 0.25; } },
        { name: 'Long Division', desc: 'Nearby towers get +15% range.', cost: 720, apply: (s) => { s.support!.buffRange = 0.15; } },
        { name: 'Proof', desc: 'Nearby towers attack 35% faster and pierce one more shape.', cost: 2300, apply: (s) => { s.support!.buffRate = 0.35; s.support!.buffPierce = 1; } },
        { name: 'Grand Theorem', desc: 'Nearby towers attack 50% faster, +2 pierce and +1 damage.', cost: 7800, apply: (s) => { const p = s.support!; p.buffRate = 0.5; p.buffPierce = 2; p.buffDamage = 1; } },
      ],
    },
    {
      name: 'Lesson Plan',
      upgrades: [
        { name: 'Big Board', desc: '+30 range.', cost: 300, apply: (s) => { s.range += 30; } },
        { name: 'Discount', desc: 'Upgrades for towers in range cost 10% less.', cost: 650, apply: (s) => { s.support!.discount = 0.1; } },
        { name: 'Homework', desc: 'Towers in range can see Ghost shapes.', cost: 2000, apply: (s) => { s.support!.buffDetect = true; } },
        { name: 'Q.E.D.', desc: 'Towers in range see ghosts, deal +1 damage, get +10% range and 15% off upgrades.', cost: 6300, apply: (s) => { const p = s.support!; p.buffDetect = true; p.buffDamage = 1; p.buffRange = Math.max(p.buffRange, 0.1); p.discount = 0.15; } },
      ],
    },
  ],
};
