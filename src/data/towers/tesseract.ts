import { attack, stats, type TowerDef } from './types';

export const tesseract: TowerDef = {
  id: 'tesseract',
  name: 'Tesseract',
  role: 'Late-game powerhouse',
  desc: 'A four-dimensional cube. Fires energy at several shapes at once and sees ghosts.',
  cost: 4800,
  color: 0xc0a0ff,
  radius: 24,
  unlockLevel: 10,
  base: () =>
    stats({
      range: 175,
      detect: true,
      attacks: [attack({ kind: 'hitscan', damage: 3, pierce: 1, interval: 0.35, dmgType: 'energy', targets: 3, style: 'energy' })],
    }),
  paths: [
    {
      name: 'Dimensions',
      upgrades: [
        { name: 'Fourth Wall', desc: 'Hits 5 targets per pulse.', cost: 2600, apply: (s) => { s.attacks[0].targets = 5; } },
        { name: 'Hyperedges', desc: '+3 damage.', cost: 3600, apply: (s) => { s.attacks[0].damage += 3; } },
        { name: 'Cross Section', desc: '8 targets, +3 damage, faster pulses.', cost: 7200, apply: (s) => { const a = s.attacks[0]; a.targets = 8; a.damage += 3; a.interval *= 0.8; } },
        { name: 'Fifth Dimension', desc: 'Beams pour from every edge: 16 targets, 15 damage, double vs bosses.', cost: 24000, apply: (s) => { const a = s.attacks[0]; a.targets = 16; a.damage = 15; a.bossMul = 2; s.range += 25; } },
      ],
    },
    {
      name: 'Fold Space',
      upgrades: [
        { name: 'Bigger Fold', desc: '+40 range.', cost: 1500, apply: (s) => { s.range += 40; } },
        { name: 'Phase Shift', desc: 'Pulses 43% faster.', cost: 3000, apply: (s) => { s.attacks[0].interval *= 0.7; } },
        { name: 'Pocket Dimension', desc: 'Every 6 seconds, folds 8 shapes in range back along the path.', cost: 6500, apply: (s) => { s.attacks.push(attack({ kind: 'fold', damage: 0, interval: 6, foldAmount: 300, foldCount: 8, dmgType: 'energy', ignoreLos: true })); } },
        { name: 'Hyperfold', desc: 'Ability: send every non-boss shape in range back to the start. Folds are bigger and more frequent.', cost: 19000, apply: (s) => { const f = s.attacks[1]; if (f) { f.foldCount = 16; f.foldAmount = 450; f.interval = 4; } s.ability = 'hyperfold'; s.abilityCooldown = 50; } },
      ],
    },
  ],
};
