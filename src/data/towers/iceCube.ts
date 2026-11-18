import { attack, stats, type TowerDef } from './types';

export const iceCube: TowerDef = {
  id: 'ice',
  name: 'Ice Cube',
  role: 'Freeze & slow',
  desc: 'Pulses frost that freezes nearby shapes in place. Crystal shapes shrug it off.',
  cost: 400,
  color: 0x9fe8ff,
  radius: 21,
  unlockLevel: 2,
  base: () =>
    stats({
      range: 85,
      attacks: [attack({ kind: 'pulse', damage: 0, pierce: 40, interval: 2.2, freeze: 1.1, dmgType: 'cold', ignoreLos: true })],
    }),
  paths: [
    {
      name: 'Deep Freeze',
      upgrades: [
        { name: 'Long Freeze', desc: 'Shapes stay frozen longer.', cost: 210, apply: (s) => { s.attacks[0].freeze = 1.7; } },
        { name: 'Wide Chill', desc: '+25 range.', cost: 320, apply: (s) => { s.range += 25; } },
        { name: 'Permafrost', desc: 'Shapes stay slowed for 3 seconds after they thaw.', cost: 880, apply: (s) => { const a = s.attacks[0]; a.slow = 3; a.slowMul = 0.55; } },
        { name: 'Absolute Zero', desc: 'Ability: freeze every shape on screen. Pulses faster and hit more shapes.', cost: 3700, apply: (s) => { const a = s.attacks[0]; a.interval *= 0.7; a.pierce += 40; s.ability = 'absoluteZero'; s.abilityCooldown = 45; } },
      ],
    },
    {
      name: 'Brittle',
      upgrades: [
        { name: 'Brittle Ice', desc: 'Frozen shapes take +1 damage from every hit.', cost: 290, apply: (s) => { s.attacks[0].brittle = 1; } },
        { name: 'Frostbite', desc: 'Pulses also deal 1 damage.', cost: 460, apply: (s) => { s.attacks[0].damage = 1; } },
        { name: 'Cryo Burst', desc: 'Pulses faster and hit harder.', cost: 1150, apply: (s) => { const a = s.attacks[0]; a.interval *= 0.75; a.damage += 1; } },
        { name: 'Shatter Point', desc: 'Frozen shapes explode into razor ice shards when destroyed. Brittle bonus +2.', cost: 4300, apply: (s) => { const a = s.attacks[0]; a.brittle = 2; a.shatter = attack({ kind: 'dart', count: 6, damage: 2, pierce: 3, speed: 520, travel: 120, style: 'shard', radius: 6 }); } },
      ],
    },
  ],
};
