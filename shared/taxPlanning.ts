import { z } from 'zod';

export type BracketSlice = {
  upTo: number;
  rate: number;
  incomeInBracket: number;
  taxInBracket: number;
};

export const TAX_PLANNING_MODES = [
  'recommended',
  'balanced',
  'tax-max',
  'home-max',
  'manual',
] as const;

export type TaxPlanningMode = (typeof TAX_PLANNING_MODES)[number];

export const TAX_PLANNING_PROVINCES = ['MB'] as const;
export type TaxPlanningProvince = (typeof TAX_PLANNING_PROVINCES)[number];

export const TAX_BUCKETS = ['fhsa', 'rrsp', 'spousalRrsp', 'tfsa'] as const;
export type TaxBucket = (typeof TAX_BUCKETS)[number];

export const TAX_PERSON_KEYS = ['personA', 'personB'] as const;
export type TaxPersonKey = (typeof TAX_PERSON_KEYS)[number];

export interface TaxPersonInput {
  name: string;
  employmentIncome: number;
  otherTaxableIncome: number;
  rrspDeductionLimit: number;
  fhsaRoom: number;
  tfsaRoom: number;
  currentYearRrspContributions: number;
  currentYearFhsaContributions: number;
  currentYearTfsaContributions: number;
  employerRrspMatchCap: number;
  employerRrspMatchRate: number;
  firstTimeHomeBuyerEligible: boolean;
  currentHbpBalance: number;
  currentPersonalRrspBalance: number;
  currentSpousalRrspBalance: number;
  currentFhsaBalance: number;
  currentTfsaBalance: number;
  recentHbpRrspContributions: number;
  monthsEmployedThisYear: number;
  employmentStartMonth: number | null;
  monthlySalary: number | null;
  currentYearTuitionPaid: number;
  tuitionCarryforwardFederal: number;
  tuitionCarryforwardProvincial: number;
  spousalRrspContributionsLastThreeYears: number;
}

export interface TaxHouseholdInput {
  targetPurchaseDate: string | null;
  targetHomePrice: number;
  desiredDownPayment: number;
  currentDownPaymentSavings: number;
  monthlyAvailableSavings: number;
  minimumCashReserve: number;
  bothRentingCurrently: boolean;
}

export interface TaxScenarioPersonOverrides {
  fhsa: number;
  rrsp: number;
  spousalRrsp: number;
  tfsa: number;
}

export interface TaxScenarioOverrides {
  personA: TaxScenarioPersonOverrides;
  personB: TaxScenarioPersonOverrides;
}

export interface TaxPlanInput {
  name: string;
  taxYear: number;
  province: TaxPlanningProvince;
  household: TaxHouseholdInput;
  personA: TaxPersonInput;
  personB: TaxPersonInput;
}

export interface TaxPlanScenarioInput {
  name: string;
  mode: TaxPlanningMode;
  overrides?: TaxScenarioOverrides | null;
}

export interface TaxWarning {
  code: string;
  severity: 'info' | 'warning';
  title: string;
  message: string;
}

export interface ContributionRecommendation {
  key: string;
  priority: number;
  bucket: TaxBucket;
  contributor: TaxPersonKey;
  annuitant?: TaxPersonKey;
  amount: number;
  estimatedTaxSavings: number;
  estimatedHomeFundsAdded: number;
  marginalRate: number;
  reason: string;
}

export interface HomeFundingProjection {
  monthsToPurchase: number;
  liquidSavingsAtPurchase: number;
  tfsaAccessible: number;
  fhsaAccessible: number;
  hbpAccessible: number;
  totalProjectedHomeFunds: number;
  targetDownPayment: number;
  shortfall: number;
}

export interface TaxCreditBreakdown {
  basicPersonalAmount: number;
  spousalAmount: number;
  canadaEmploymentAmount: number;
  cppEiCredit: number;
  tuitionOwn: number;
  tuitionTransferIn: number;
  totalCreditAmount: number;
  totalCreditValue: number;
}

export interface TaxPayrollBreakdown {
  cppBase: number;
  cppEnhanced: number;
  cpp2: number;
  ei: number;
  totalPremiums: number;
  totalDeduction: number;
}

export interface TaxPersonResult {
  name: string;
  totalIncome: number;
  taxableIncomeBefore: number;
  taxableIncomeAfter: number;
  estimatedTaxBefore: number;
  estimatedTaxAfter: number;
  estimatedTaxSavings: number;
  marginalRateAfter: number;
  contributions: TaxScenarioPersonOverrides;
  remainingRooms: {
    rrsp: number;
    fhsa: number;
    tfsa: number;
  };
  hbpCapacity: number;
  fhsaWithdrawalCapacity: number;
  tfsaEndingBalance: number;
  payroll: TaxPayrollBreakdown;
  federalCredits: TaxCreditBreakdown;
  provincialCredits: TaxCreditBreakdown;
  grossFederalTax: number;
  grossProvincialTax: number;
  netFederalTax: number;
  netProvincialTax: number;
  refundableCredits: number;
  federalBracketBreakdownBefore: BracketSlice[];
  federalBracketBreakdownAfter: BracketSlice[];
  provincialBracketBreakdownBefore: BracketSlice[];
  provincialBracketBreakdownAfter: BracketSlice[];
  bracketThresholdInsight: {
    federalNextThreshold: number;
    federalCurrentRate: number;
    federalLowerRate: number;
    additionalDeductionNeeded: number;
    taxSavingIfThresholdHit: number;
    combinedCurrentMarginalRate: number;
    combinedLowerMarginalRate: number;
  } | null;
}

export interface SpousalAmountBreakEven {
  federalBreakEven: number;
  provincialBreakEven: number;
  currentSpouseNetIncome: number;
  federalAmountLost: number;
  provincialAmountLost: number;
  marginalCostPer1k: number;
}

export interface TuitionTransferDetail {
  donor: TaxPersonKey;
  recipient: TaxPersonKey;
  recommendedFederalAmount: number;
  recommendedProvincialAmount: number;
  carryForwardFederal: number;
  carryForwardProvincial: number;
  taxSaved: number;
}

export interface TaxOptimizationSummary {
  totalContribution: number;
  deductibleContribution: number;
  estimatedTaxBefore: number;
  estimatedTaxAfter: number;
  estimatedTaxSavings: number;
  projectedRefundReduction: number;
  totalProjectedHomeFunds: number;
  fhsaUsed: number;
  hbpCapacityUsed: number;
  tfsaEndingBalance: number;
  shortfall: number;
  warningsCount: number;
  familyNetTaxBefore: number;
  familyNetTaxAfter: number;
  familyNetTaxDelta: number;
  totalRefundableCredits: number;
}

export interface TaxOptimizationResult {
  mode: TaxPlanningMode;
  summary: TaxOptimizationSummary;
  homeFunding: HomeFundingProjection;
  people: Record<TaxPersonKey, TaxPersonResult>;
  recommendations: ContributionRecommendation[];
  warnings: TaxWarning[];
  spousalBreakEven: SpousalAmountBreakEven;
  tuitionTransfer: TuitionTransferDetail | null;
}

export interface MultiYearProjection {
  byYear: Array<{
    taxYear: number;
    projected: boolean;
    result: TaxOptimizationResult;
    rrspRoomEndOfYear: { personA: number; personB: number };
    fhsaRoomEndOfYear: { personA: number; personB: number };
    tfsaRoomEndOfYear: { personA: number; personB: number };
    fhsaBalanceEndOfYear: { personA: number; personB: number };
  }>;
  cumulativeFamilyNetTax: number;
  projectedHomeFundsAtPurchase: number;
  shortfallAtPurchase: number;
}

export interface TaxPlanBundle {
  plan: {
    id: number;
    name: string;
    taxYear: number;
    province: TaxPlanningProvince;
    household: TaxHouseholdInput;
    personA: TaxPersonInput;
    personB: TaxPersonInput;
    createdAt: string;
    updatedAt: string;
  };
  scenarios: Array<{
    id: number;
    planId: number;
    name: string;
    mode: TaxPlanningMode;
    overrides: TaxScenarioOverrides | null;
    createdAt: string;
    updatedAt: string;
    result: TaxOptimizationResult;
    multiYear: MultiYearProjection;
  }>;
}

const nonNegativeNumber = z.coerce.number().finite().min(0);

export const taxPersonInputSchema = z.object({
  name: z.string().trim().min(1, 'Name is required'),
  employmentIncome: nonNegativeNumber,
  otherTaxableIncome: nonNegativeNumber,
  rrspDeductionLimit: nonNegativeNumber,
  fhsaRoom: nonNegativeNumber,
  tfsaRoom: nonNegativeNumber,
  currentYearRrspContributions: nonNegativeNumber,
  currentYearFhsaContributions: nonNegativeNumber,
  currentYearTfsaContributions: nonNegativeNumber,
  employerRrspMatchCap: nonNegativeNumber,
  employerRrspMatchRate: z.coerce.number().finite().min(0).max(1),
  firstTimeHomeBuyerEligible: z.coerce.boolean(),
  currentHbpBalance: nonNegativeNumber,
  currentPersonalRrspBalance: nonNegativeNumber,
  currentSpousalRrspBalance: nonNegativeNumber,
  currentFhsaBalance: nonNegativeNumber,
  currentTfsaBalance: nonNegativeNumber,
  recentHbpRrspContributions: nonNegativeNumber,
  monthsEmployedThisYear: z.coerce.number().finite().min(0).max(12).default(12),
  employmentStartMonth: z.coerce.number().int().min(1).max(12).nullable().default(null),
  monthlySalary: z.coerce.number().finite().min(0).nullable().default(null),
  currentYearTuitionPaid: nonNegativeNumber.default(0),
  tuitionCarryforwardFederal: nonNegativeNumber.default(0),
  tuitionCarryforwardProvincial: nonNegativeNumber.default(0),
  spousalRrspContributionsLastThreeYears: nonNegativeNumber.default(0),
});

export const taxHouseholdInputSchema = z.object({
  targetPurchaseDate: z
    .union([z.string().datetime({ offset: true }), z.string().date(), z.null()])
    .optional()
    .transform(value => value ?? null),
  targetHomePrice: nonNegativeNumber,
  desiredDownPayment: nonNegativeNumber,
  currentDownPaymentSavings: nonNegativeNumber,
  monthlyAvailableSavings: nonNegativeNumber,
  minimumCashReserve: nonNegativeNumber,
  bothRentingCurrently: z.coerce.boolean().default(true),
});

export const taxScenarioPersonOverridesSchema = z.object({
  fhsa: nonNegativeNumber,
  rrsp: nonNegativeNumber,
  spousalRrsp: nonNegativeNumber,
  tfsa: nonNegativeNumber,
});

export const taxScenarioOverridesSchema = z.object({
  personA: taxScenarioPersonOverridesSchema,
  personB: taxScenarioPersonOverridesSchema,
});

export const taxPlanInputSchema = z.object({
  name: z.string().trim().min(1, 'Plan name is required'),
  taxYear: z.coerce.number().int().min(2024).max(2100),
  province: z.enum(TAX_PLANNING_PROVINCES),
  household: taxHouseholdInputSchema,
  personA: taxPersonInputSchema,
  personB: taxPersonInputSchema,
});

export const taxPlanScenarioInputSchema = z.object({
  name: z.string().trim().min(1, 'Scenario name is required'),
  mode: z.enum(TAX_PLANNING_MODES),
  overrides: taxScenarioOverridesSchema.nullish(),
});

export function buildEmptyScenarioOverrides(): TaxScenarioOverrides {
  return {
    personA: { fhsa: 0, rrsp: 0, spousalRrsp: 0, tfsa: 0 },
    personB: { fhsa: 0, rrsp: 0, spousalRrsp: 0, tfsa: 0 },
  };
}

export function buildDefaultTaxPlanInput(): TaxPlanInput {
  return {
    name: 'Winnipeg Couple Plan',
    taxYear: 2026,
    province: 'MB',
    household: {
      targetPurchaseDate: '2028-06-01',
      targetHomePrice: 450000,
      desiredDownPayment: 90000,
      currentDownPaymentSavings: 25000,
      monthlyAvailableSavings: 2500,
      minimumCashReserve: 10000,
      bothRentingCurrently: true,
    },
    personA: {
      name: 'Partner A',
      employmentIncome: 72800,
      otherTaxableIncome: 0,
      rrspDeductionLimit: 13104,
      fhsaRoom: 8000,
      tfsaRoom: 7000,
      currentYearRrspContributions: 0,
      currentYearFhsaContributions: 0,
      currentYearTfsaContributions: 0,
      employerRrspMatchCap: 0,
      employerRrspMatchRate: 0,
      firstTimeHomeBuyerEligible: true,
      currentHbpBalance: 0,
      currentPersonalRrspBalance: 0,
      currentSpousalRrspBalance: 0,
      currentFhsaBalance: 0,
      currentTfsaBalance: 0,
      recentHbpRrspContributions: 0,
      monthsEmployedThisYear: 12,
      employmentStartMonth: 1,
      monthlySalary: null,
      currentYearTuitionPaid: 0,
      tuitionCarryforwardFederal: 0,
      tuitionCarryforwardProvincial: 0,
      spousalRrspContributionsLastThreeYears: 0,
    },
    personB: {
      name: 'Partner B',
      employmentIncome: 40500,
      otherTaxableIncome: 0,
      rrspDeductionLimit: 0,
      fhsaRoom: 8000,
      tfsaRoom: 7000,
      currentYearRrspContributions: 0,
      currentYearFhsaContributions: 0,
      currentYearTfsaContributions: 0,
      employerRrspMatchCap: 0,
      employerRrspMatchRate: 0,
      firstTimeHomeBuyerEligible: true,
      currentHbpBalance: 0,
      currentPersonalRrspBalance: 0,
      currentSpousalRrspBalance: 0,
      currentFhsaBalance: 0,
      currentTfsaBalance: 0,
      recentHbpRrspContributions: 0,
      monthsEmployedThisYear: 9,
      employmentStartMonth: 4,
      monthlySalary: 4500,
      currentYearTuitionPaid: 3000,
      tuitionCarryforwardFederal: 6000,
      tuitionCarryforwardProvincial: 6000,
      spousalRrspContributionsLastThreeYears: 0,
    },
  };
}

export function normalizeIsoDate(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return date.toISOString();
}
