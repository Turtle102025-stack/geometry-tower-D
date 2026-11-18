import { attack, stats, type TowerDef } from './types';

export const laserPointer: TowerDef = {
  id: 'laser',
  name: 'Laser Pointer',
  role: 'Energy beam',
  desc: 'A continuous energy beam. Melts Armored shapes and bosses.',
  cost: 750,
  color: 0xff4fd8,
  radius: 19,
  unlockLevel: 4,
  base: () =>
    stats({
      range: 145,
      attacks: [attack({ kind: 'beam', damage: 1, pierce: 1, interval: 0.2, dmgType: 'energy', armorBonus: 1, targets: 1 })],
    }),
  paths: [
    {
      name: 'Intensity',
      upgrades: [
        { name: 'Brighter Beam', desc: 'Pulses 33% faster.', cost: 420, apply: (s) => { s.attacks[0].interval *= 0.75; } },
        { name: 'Twin Beam', desc: 'Splits into two beams, each with its own target.', cost: 650, apply: (s) => { s.attacks[0].targets = 2; } },
        { name: 'Laser Show', desc: 'Four beams, +1 damage.', cost: 2150, apply: (s) => { const a = s.attacks[0]; a.targets = 4; a.damage += 1; } },
        { name: 'Prism Beam', desc: 'A prism splits the light into seven rainbow beams that hit hard.', cost: 7600, apply: (s) => { const a = s.attacks[0]; a.targets = 7; a.damage = 3; a.interval *= 0.8; s.range += 20; } },
      ],
    },
    {
      name: 'Focus',
      upgrades: [
        { name: 'Long Focus', desc: '+40 range.', cost: 300, apply: (s) => { s.range += 40; } },
        { name: 'Heat Build', desc: 'The longer the beam stays on a target, the hotter it burns (up to +4 damage).', cost: 760, apply: (s) => { const a = s.attacks[0]; a.ramp = 2; a.rampMax = 4; } },
        { name: 'Melt Down', desc: 'Bosses take 2.5× damage; heat builds up to +8.', cost: 1750, apply: (s) => { const a = s.attacks[0]; a.bossMul = 2.5; a.rampMax = 8; } },
        { name: 'Focal Point', desc: 'A white-hot point that keeps getting hotter (up to +14). Bosses take triple damage.', cost: 9200, apply: (s) => { const a = s.attacks[0]; a.ramp = 5; a.rampMax = 14; a.bossMul = 3; a.damage = 2; } },
      ],
    },
  ],
};
