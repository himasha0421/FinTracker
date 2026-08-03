import { z } from 'zod';
import { TAX_PERSON_KEYS, type TaxPersonKey } from './taxPlanning';

export const GOAL_TYPES = ['generic', 'home-purchase'] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

// Intentionally only 3 values, unlike taxPlanning's TAX_BUCKETS (which also has
// 'spousalRrsp'): an account is physically an RRSP regardless of whose deduction
// it counts toward, so account-level tagging doesn't need a spousal distinction.
export const ACCOUNT_REGISTERED_TYPES = ['tfsa', 'fhsa', 'rrsp'] as const;
export type AccountRegisteredType = (typeof ACCOUNT_REGISTERED_TYPES)[number];

export interface HomePurchaseContributor {
  personKey: TaxPersonKey;
  monthlyTargetAmount: number;
}

export interface HomePurchaseGoalDetails {
  targetHomePrice: number;
  downPaymentPercent: number;
  closingCostsEstimate: number;
  contributors: HomePurchaseContributor[];
}

const nonNegativeNumber = z.coerce.number().finite().min(0);

const homePurchaseContributorSchema = z.object({
  personKey: z.enum(TAX_PERSON_KEYS),
  monthlyTargetAmount: nonNegativeNumber,
});

export const homePurchaseGoalDetailsSchema = z
  .object({
    targetHomePrice: nonNegativeNumber,
    downPaymentPercent: z.coerce.number().finite().gt(0).max(100),
    closingCostsEstimate: nonNegativeNumber,
    contributors: z.array(homePurchaseContributorSchema),
  })
  .superRefine((value, ctx) => {
    if (value.contributors.length !== TAX_PERSON_KEYS.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contributors'],
        message: `contributors must have exactly ${TAX_PERSON_KEYS.length} entries, one per person`,
      });
      return;
    }
    const seen = new Set<string>();
    for (const contributor of value.contributors) {
      seen.add(contributor.personKey);
    }
    for (const personKey of TAX_PERSON_KEYS) {
      if (!seen.has(personKey)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['contributors'],
          message: `contributors is missing an entry for ${personKey}`,
        });
      }
    }
    if (seen.size !== TAX_PERSON_KEYS.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contributors'],
        message: 'contributors must not repeat the same personKey',
      });
    }
  });

export interface GoalBucketBreakdown {
  registeredType: AccountRegisteredType | 'unregistered';
  ownerPersonKey: TaxPersonKey | 'unassigned';
  totalBalance: number;
}

// Minimal structural shape rather than importing `Account` from './schema',
// since schema.ts imports HomePurchaseGoalDetails from this module — avoids a
// circular value import between the two shared modules.
interface BucketBreakdownAccountInput {
  balance: string | number;
  registeredType: string | null;
  ownerPersonKey: string | null;
}

export function computeBucketBreakdown(
  accounts: BucketBreakdownAccountInput[]
): GoalBucketBreakdown[] {
  const groups = new Map<string, GoalBucketBreakdown>();
  for (const account of accounts) {
    const registeredType = (account.registeredType as AccountRegisteredType | null) ?? 'unregistered';
    const ownerPersonKey = (account.ownerPersonKey as TaxPersonKey | null) ?? 'unassigned';
    const key = `${registeredType}:${ownerPersonKey}`;
    const balance = Number(account.balance);
    const existing = groups.get(key);
    if (existing) {
      existing.totalBalance += balance;
    } else {
      groups.set(key, { registeredType, ownerPersonKey, totalBalance: balance });
    }
  }
  return Array.from(groups.values());
}
