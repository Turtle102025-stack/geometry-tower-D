import { attack, deg, stats, type TowerDef } from './types';

export const protractorBoat: TowerDef = {
  id: 'boat',
  name: 'Protractor Boat',
  role: 'Water only',
  desc: 'A protractor hull with triangle sails. Can only be placed on water.',
  cost: 500,
  color: 0xffb86b,
  radius: 20,
  water: true,
  unlockLevel: 8,
  base: () =>
    stats({
      range: 150,
      attacks: [attack({ kind: 'dart', damage: 1, pierce: 3, interval: 0.9, count: 2, spread: deg(8), speed: 620, style: 'boat' })],
    }),
  paths: [
    {
      name: 'Sails',
      upgrades: [
        { name: 'Faster Sails', desc: 'Fires 33% faster.', cost: 300, apply: (s) => { s.attacks[0].interval *= 0.75; } },
        { name: 'Twin Masts', desc: 'Four darts per volley.', cost: 560, apply: (s) => { const a = s.attacks[0]; a.count = 4; a.spread = deg(20); } },
        { name: 'Cannons', desc: 'Adds explosive cannonballs.', cost: 1950, apply: (s) => { s.attacks.push(attack({ kind: 'dart', damage: 2, pierce: 3, interval: 1.2, speed: 600, splash: 38, dmgType: 'explosive', style: 'cannon', radius: 7 })); } },
        { name: 'Grand Flagship', desc: 'Massive broadsides: eight darts per volley and rapid heavy cannons.', cost: 6600, apply: (s) => { const a = s.attacks[0]; a.count = 8; a.spread = deg(50); a.damage += 1; const c = s.attacks[1]; if (c) { c.interval *= 0.5; c.damage = 4; c.splash = 48; } } },
      ],
    },
    {
      name: 'Pi-rates',
      upgrades: [
        { name: 'Crow’s Nest', desc: '+40 range.', cost: 250, apply: (s) => { s.range += 40; } },
        { name: 'Spyglass', desc: 'Can see and target Ghost shapes.', cost: 350, apply: (s) => { s.detect = true; } },
        { name: 'Grapeshot', desc: '+3 pierce, +1 damage.', cost: 1650, apply: (s) => { const a = s.attacks[0]; a.pierce += 3; a.damage += 1; a.style = 'pi'; } },
        { name: 'Pi-rate Ship', desc: 'Ability: hook the strongest boss in range and drag it backwards. Darts hit bosses twice as hard.', cost: 6200, apply: (s) => { const a = s.attacks[0]; a.count += 2; a.bossMul = 2; a.style = 'pi'; s.ability = 'pirateHook'; s.abilityCooldown = 35; } },
      ],
    },
  ],
};
