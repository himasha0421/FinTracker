export const investmentTypeValues = [
  'etf',
  'crypto',
  'mutual_fund',
  'gic',
  'stock',
  'bond',
  'other',
  'land',
  'car',
  'fixed_deposit',
  'overseas_investment',
] as const;

export const investmentTypes = [
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Crypto' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'gic', label: 'GIC' },
  { value: 'stock', label: 'Stock' },
  { value: 'bond', label: 'Bond' },
  { value: 'other', label: 'Other' },
  { value: 'land', label: 'Land' },
  { value: 'car', label: 'Car' },
  { value: 'fixed_deposit', label: 'Fixed Deposit' },
  { value: 'overseas_investment', label: 'Overseas Investment' },
] as const;

export const assetTypeGroups = [
  {
    key: 'static',
    title: 'Static Assets',
    description: 'Land, property, and vehicles you hold long-term.',
    types: ['land', 'car'],
  },
  {
    key: 'overseas',
    title: 'Overseas Investments',
    description: 'Foreign holdings you want tracked separately.',
    types: ['overseas_investment'],
  },
  {
    key: 'overseas_liquid',
    title: 'Overseas Liquid Assets',
    description: 'Fixed deposits and other liquid positions abroad.',
    types: ['fixed_deposit'],
  },
] as const;

export const assetTypeSet: ReadonlySet<string> = new Set(
  assetTypeGroups.flatMap(group => [...group.types])
);

export const contributionAssetTypeSet: ReadonlySet<string> = new Set(['land', 'car']);
