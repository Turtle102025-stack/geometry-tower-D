import { income, stats, type TowerDef } from './types';

export const goldenRatio: TowerDef = {
  id: 'golden',
  name: 'Golden Ratio',
  role: 'Income',
  desc: 'A spinning golden spiral that pays out at the end of every round. Doesn’t attack.',
  cost: 1000,
  color: 0xffd23f,
  radius: 20,
  unlockLevel: 6,
  base: () => stats({ range: 40, income: income({ perRound: 90 }) }),
  paths: [
    {
      name: 'Compound',
      upgrades: [
        { name: 'Bigger Spiral', desc: '+$50 per round.', cost: 600, apply: (s) => { s.income!.perRound += 50; } },
        { name: 'Golden Mean', desc: '+$80 more per round.', cost: 950, apply: (s) => { s.income!.perRound += 80; } },
        { name: 'Phi Engine', desc: '+$200 more per round.', cost: 2600, apply: (s) => { s.income!.perRound += 200; } },
        { name: 'Fibonacci Fortune', desc: '$600 per round, growing 8% every round you own it (up to triple).', cost: 8500, apply: (s) => { const i = s.income!; i.perRound = 600; i.growth = 0.08; i.growthCap = 3; } },
      ],
    },
    {
      name: 'Vault',
      upgrades: [
        { name: 'Coin Purse', desc: 'Also pays 2% interest on your cash each round (max $100).', cost: 400, apply: (s) => { const i = s.income!; i.interest = 0.02; i.interestCap = 100; } },
        { name: 'Bank', desc: '4% interest (max $300).', cost: 950, apply: (s) => { const i = s.income!; i.interest = 0.04; i.interestCap = 300; } },
        { name: 'Vault', desc: '6% interest (max $900).', cost: 2500, apply: (s) => { const i = s.income!; i.interest = 0.06; i.interestCap = 900; } },
        { name: 'Golden Vault', desc: '8% interest (max $2,500) and +$200 per round.', cost: 7200, apply: (s) => { const i = s.income!; i.interest = 0.08; i.interestCap = 2500; i.perRound += 200; } },
      ],
    },
  ],
};
