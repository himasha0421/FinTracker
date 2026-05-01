export type TaxBracket = {
  upTo: number;
  rate: number;
};

export type TaxCreditRules = {
  federalLowestRate: number;
  federalBpaBase: number;
  federalBpaSupplement: number;
  federalBpaPhaseOutStart: number;
  federalBpaPhaseOutEnd: number;
  federalSpousalAmountMax: number;
  federalCanadaEmploymentAmount: number;
  federalTuitionTransferCap: number;
  provincialLowestRate: number;
  provincialBpa: number;
  provincialSpousalAmountMax: number;
  provincialTuitionTransferCap: number;
};

export type PayrollRules = {
  cppRate: number;
  cppYmpe: number;
  cppBasicExemption: number;
  cppCreditPortion: number;
  cpp2Rate: number;
  cpp2Yampe: number;
  eiRate: number;
  eiMie: number;
};

export type RefundableRules = {
  mbRentersCreditPerEligibleAdult: number;
  mbRentersPhaseOutStart: number;
  mbRentersPhaseOutEnd: number;
};

export type TaxRuleSet = {
  taxYear: number;
  province: 'MB';
  projected: boolean;
  fhsaAnnualLimit: number;
  fhsaCarryforwardCap: number;
  fhsaLifetimeLimit: number;
  tfsaAnnualLimit: number;
  hbpWithdrawalLimit: number;
  rrspContributionDollarCap: number;
  rrspEarnedIncomeRate: number;
  federalBrackets: TaxBracket[];
  provincialBrackets: TaxBracket[];
  credits: TaxCreditRules;
  payroll: PayrollRules;
  refundable: RefundableRules;
};

export const TAX_RULES_2026_MB: TaxRuleSet = {
  taxYear: 2026,
  province: 'MB',
  projected: false,
  fhsaAnnualLimit: 8000,
  fhsaCarryforwardCap: 8000,
  fhsaLifetimeLimit: 40000,
  tfsaAnnualLimit: 7000,
  hbpWithdrawalLimit: 60000,
  rrspContributionDollarCap: 33810,
  rrspEarnedIncomeRate: 0.18,
  federalBrackets: [
    { upTo: 58523, rate: 0.14 },
    { upTo: 117045, rate: 0.205 },
    { upTo: 181440, rate: 0.26 },
    { upTo: 258482, rate: 0.2929 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.33 },
  ],
  provincialBrackets: [
    { upTo: 47000, rate: 0.108 },
    { upTo: 100000, rate: 0.1275 },
    { upTo: Number.POSITIVE_INFINITY, rate: 0.174 },
  ],
  credits: {
    federalLowestRate: 0.14,
    federalBpaBase: 14829,
    federalBpaSupplement: 1623,
    federalBpaPhaseOutStart: 181440,
    federalBpaPhaseOutEnd: 258482,
    federalSpousalAmountMax: 16452,
    federalCanadaEmploymentAmount: 1503,
    federalTuitionTransferCap: 5000,
    provincialLowestRate: 0.108,
    provincialBpa: 15780,
    provincialSpousalAmountMax: 15780,
    provincialTuitionTransferCap: 5000,
  },
  payroll: {
    cppRate: 0.0595,
    cppYmpe: 71300,
    cppBasicExemption: 3500,
    cppCreditPortion: 0.0495,
    cpp2Rate: 0.04,
    cpp2Yampe: 81100,
    eiRate: 0.0164,
    eiMie: 65700,
  },
  refundable: {
    mbRentersCreditPerEligibleAdult: 625,
    mbRentersPhaseOutStart: 40000,
    mbRentersPhaseOutEnd: 56500,
  },
};

const FEDERAL_INDEXATION_PER_YEAR = 0.02;

function indexBrackets(brackets: TaxBracket[], factor: number): TaxBracket[] {
  return brackets.map(bracket =>
    bracket.upTo === Number.POSITIVE_INFINITY
      ? bracket
      : { upTo: Math.round(bracket.upTo * factor), rate: bracket.rate }
  );
}

function projectRuleSet(targetYear: number): TaxRuleSet {
  const yearsAhead = targetYear - TAX_RULES_2026_MB.taxYear;
  if (yearsAhead <= 0) return TAX_RULES_2026_MB;
  const factor = Math.pow(1 + FEDERAL_INDEXATION_PER_YEAR, yearsAhead);
  const base = TAX_RULES_2026_MB;
  return {
    ...base,
    taxYear: targetYear,
    projected: true,
    federalBrackets: indexBrackets(base.federalBrackets, factor),
    provincialBrackets: base.provincialBrackets,
    credits: {
      ...base.credits,
      federalBpaBase: Math.round(base.credits.federalBpaBase * factor),
      federalBpaSupplement: Math.round(base.credits.federalBpaSupplement * factor),
      federalBpaPhaseOutStart: Math.round(base.credits.federalBpaPhaseOutStart * factor),
      federalBpaPhaseOutEnd: Math.round(base.credits.federalBpaPhaseOutEnd * factor),
      federalSpousalAmountMax: Math.round(base.credits.federalSpousalAmountMax * factor),
      federalCanadaEmploymentAmount: Math.round(base.credits.federalCanadaEmploymentAmount * factor),
    },
  };
}

export function getTaxRuleSet(taxYear: number, province: string): TaxRuleSet {
  if (province !== 'MB') {
    throw new Error(`Unsupported tax rule set for province ${province}`);
  }
  if (taxYear === 2026) return TAX_RULES_2026_MB;
  if (taxYear > 2026 && taxYear <= 2030) return projectRuleSet(taxYear);
  throw new Error(`Unsupported tax year ${taxYear} for province ${province}`);
}
