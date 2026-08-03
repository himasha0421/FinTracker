import { useQuery } from '@tanstack/react-query';
import { taxPlansListQuery } from '@/features/tax-planning/api';

const FALLBACK_LABELS = { personA: 'Partner A', personB: 'Partner B' } as const;

// Pulls the actual configured names (e.g. "Himasha"/"Thami") from the tax
// plan's personA/personB so labels stay consistent across Goals/Accounts/Tax
// Planning instead of showing a generic "Partner A/B" once a plan exists.
export function usePersonLabels() {
  const { data: bundles } = useQuery(taxPlansListQuery());
  const plan = bundles?.[0]?.plan;
  return {
    personA: plan?.personA?.name?.trim() || FALLBACK_LABELS.personA,
    personB: plan?.personB?.name?.trim() || FALLBACK_LABELS.personB,
  };
}
