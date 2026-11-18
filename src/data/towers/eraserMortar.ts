import { attack, stats, type TowerDef } from './types';

export const eraserMortar: TowerDef = {
  id: 'eraser',
  name: 'Eraser Mortar',
  role: 'Explosive splash',
  desc: 'Lobs erasers that rub out whole clusters. Shadow shapes are drawn in permanent marker — erasers can’t touch them.',
  cost: 560,
  color: 0xff7eb6,
  radius: 22,
  unlockLevel: 1,
  base: () =>
    stats({
      range: 160,
      attacks: [attack({ kind: 'lob', damage: 1, pierce: 18, interval: 1.5, speed: 430, splash: 42, dmgType: 'explosive', style: 'shell' })],
    }),
  paths: [
    {
      name: 'Big Eraser',
      upgrades: [
        { name: 'Heavy Eraser', desc: 'Bigger blasts that hit more shapes.', cost: 360, apply: (s) => { const a = s.attacks[0]; a.splash += 12; a.pierce += 10; } },
        { name: 'Hard Rubber', desc: '+1 damage per blast.', cost: 650, apply: (s) => { s.attacks[0].damage += 1; } },
        { name: 'Industrial Eraser', desc: 'Huge blasts: +2 damage and a short stun.', cost: 1550, apply: (s) => { const a = s.attacks[0]; a.splash += 16; a.damage += 2; a.stun = 0.5; } },
        { name: 'The Great Rub-Out', desc: 'Ability: a colossal eraser slam that wipes an area and stuns bosses. Blasts get even bigger.', cost: 5600, apply: (s) => { const a = s.attacks[0]; a.damage += 2; a.splash += 12; s.ability = 'rubOut'; s.abilityCooldown = 40; } },
      ],
    },
    {
      name: 'Shavings',
      upgrades: [
        { name: 'Fast Reload', desc: 'Throws 33% faster.', cost: 310, apply: (s) => { s.attacks[0].interval *= 0.75; } },
        { name: 'Long Throw', desc: '+45 range.', cost: 270, apply: (s) => { s.range += 45; } },
        { name: 'Cluster Crumbs', desc: 'Each blast scatters six exploding crumbs.', cost: 1250, apply: (s) => { s.attacks[0].cluster = { count: 6, radius: 24, damage: 1, pierce: 8, spread: 46, chain: 1 }; } },
        { name: 'Crumb Barrage', desc: 'Crumbs explode into more crumbs. Fires much faster.', cost: 4900, apply: (s) => { const a = s.attacks[0]; a.cluster = { count: 8, radius: 30, damage: 2, pierce: 12, spread: 62, chain: 2 }; a.interval *= 0.6; } },
      ],
    },
  ],
};
