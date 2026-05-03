import type { TaxBucket, TaxPlanningMode } from '@shared/taxPlanning';

export const currencyFormatter = new Intl.NumberFormat('en-CA', {
  style: 'currency',
  currency: 'CAD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

export const decimalFormatter = new Intl.NumberFormat('en-CA', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function fieldLabelFromBucket(bucket: TaxBucket): string {
  switch (bucket) {
    case 'fhsa':
      return 'FHSA';
    case 'rrsp':
      return 'RRSP';
    case 'spousalRrsp':
      return 'Spousal RRSP';
    case 'tfsa':
    default:
      return 'TFSA';
  }
}

export function scenarioModeLabel(mode: TaxPlanningMode): string {
  switch (mode) {
    case 'tax-max':
      return 'Tax Max';
    case 'home-max':
      return 'Home Max';
    default:
      return mode.charAt(0).toUpperCase() + mode.slice(1);
  }
}
