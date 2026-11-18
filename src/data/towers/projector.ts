import { attack, stats, support, type TowerDef } from './types';

export const projector: TowerDef = {
  id: 'projector',
  name: 'Projector',
  role: 'Ghost detection',
  desc: 'Shines light on Ghost shapes in range so every tower can target them.',
  cost: 450,
  color: 0xffe9a8,
  radius: 20,
  unlockLevel: 5,
  base: () => stats({ range: 150, support: support({ reveal: true }) }),
  paths: [
    {
      name: 'Brightness',
      upgrades: [
        { name: 'Wide Lens', desc: '+40 range.', cost: 230, apply: (s) => { s.range += 40; } },
        { name: 'Bright Bulb', desc: '+40 more range.', cost: 380, apply: (s) => { s.range += 40; } },
        { name: 'Exposure', desc: 'Ghosts in range lose their ghost power for good.', cost: 1600, apply: (s) => { s.support!.stripGhost = true; } },
        { name: 'Floodlight', desc: 'Lights up the whole map: every Ghost anywhere becomes visible and loses its ghost power.', cost: 4300, apply: (s) => { s.support!.stripGhost = true; s.support!.global = true; } },
      ],
    },
    {
      name: 'Highlight',
      upgrades: [
        { name: 'Laser Dot', desc: 'Adds a small energy shot.', cost: 350, apply: (s) => { s.attacks.push(attack({ kind: 'dart', damage: 1, pierce: 1, interval: 0.8, dmgType: 'energy', speed: 700, style: 'energy' })); } },
        { name: 'Highlighter', desc: 'Shapes in range take +1 damage from every hit.', cost: 950, apply: (s) => { s.support!.highlight = 1; } },
        { name: 'Overexposed', desc: 'Highlight bonus +2, and the Laser Dot fires faster.', cost: 2300, apply: (s) => { s.support!.highlight = 2; if (s.attacks[0]) s.attacks[0].interval *= 0.5; } },
        { name: 'Spotlight', desc: 'Shapes in range take double damage from everything.', cost: 6500, apply: (s) => { s.support!.spotlight = 2; } },
      ],
    },
  ],
};
