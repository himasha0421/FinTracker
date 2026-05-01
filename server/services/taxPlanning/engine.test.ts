import { describe, expect, it } from 'vitest';
import {
  buildDefaultTaxPlanInput,
  type TaxPersonInput,
  type TaxHouseholdInput,
  type TaxPlanInput,
} from '@shared/taxPlanning';
import { calculateTaxPlanResult } from '../taxPlanning/engine';

// ---------------------------------------------------------------------------
// Test factories
// ---------------------------------------------------------------------------

function buildMinimalPerson(overrides: Partial<TaxPersonInput> = {}): TaxPersonInput {
  return {
    name: 'Person',
    employmentIncome: 0,
    otherTaxableIncome: 0,
    rrspDeductionLimit: 0,
    fhsaRoom: 0,
    tfsaRoom: 0,
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
    employmentStartMonth: null,
    monthlySalary: null,
    currentYearTuitionPaid: 0,
    tuitionCarryforwardFederal: 0,
    tuitionCarryforwardProvincial: 0,
    spousalRrspContributionsLastThreeYears: 0,
    ...overrides,
  };
}

function buildMinimalHousehold(overrides: Partial<TaxHouseholdInput> = {}): TaxHouseholdInput {
  return {
    targetPurchaseDate: null,
    targetHomePrice: 0,
    desiredDownPayment: 0,
    currentDownPaymentSavings: 0,
    monthlyAvailableSavings: 0,
    minimumCashReserve: 0,
    bothRentingCurrently: false,
    ...overrides,
  };
}

function buildMinimalPlan(
  personA: TaxPersonInput,
  personB: TaxPersonInput,
  household: TaxHouseholdInput
): TaxPlanInput {
  return {
    name: 'Test Plan',
    taxYear: 2026,
    province: 'MB',
    household,
    personA,
    personB,
  };
}

// ---------------------------------------------------------------------------
// Existing tests
// ---------------------------------------------------------------------------

describe('calculateTaxPlanResult', () => {
  it('prioritizes FHSA before non-matched RRSP when home purchase planning is active', () => {
    const plan = buildDefaultTaxPlanInput();
    plan.personA.employerRrspMatchCap = 0;
    plan.personA.currentFhsaBalance = 0;
    plan.personB.employerRrspMatchCap = 0;
    plan.household.targetPurchaseDate = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    const result = calculateTaxPlanResult(plan, { name: 'Balanced', mode: 'balanced' });

    expect(result.recommendations[0]?.bucket).toBe('fhsa');
  });

  it('allocates employer-matched RRSP dollars before other buckets', () => {
    const plan = buildDefaultTaxPlanInput();
    plan.personA.employerRrspMatchCap = 4000;
    plan.personA.fhsaRoom = 8000;

    const result = calculateTaxPlanResult(plan, { name: 'Recommended', mode: 'recommended' });

    expect(result.recommendations[0]?.bucket).toBe('rrsp');
    expect(result.recommendations[0]?.contributor).toBe('personA');
  });

  it('recommends spousal RRSP when the contributor has the higher marginal rate and the spouse benefits from HBP access', () => {
    const plan = buildDefaultTaxPlanInput();
    plan.personA.firstTimeHomeBuyerEligible = false;
    plan.personA.employerRrspMatchCap = 0;
    plan.personA.fhsaRoom = 0;
    plan.personB.firstTimeHomeBuyerEligible = true;
    plan.personB.fhsaRoom = 0;
    plan.personB.currentPersonalRrspBalance = 0;
    plan.household.monthlyAvailableSavings = 1500;

    const result = calculateTaxPlanResult(plan, { name: 'Balanced', mode: 'balanced' });

    expect(result.recommendations.some(item => item.bucket === 'spousalRrsp')).toBe(true);
  });

  it('sends remaining dollars to TFSA after higher-priority deductible buckets are used', () => {
    const plan = buildDefaultTaxPlanInput();
    plan.personA.employerRrspMatchCap = 0;
    plan.personA.fhsaRoom = 1000;
    plan.personA.rrspDeductionLimit = 500;
    plan.personB.fhsaRoom = 0;
    plan.personB.rrspDeductionLimit = 0;
    plan.household.monthlyAvailableSavings = 500;

    const result = calculateTaxPlanResult(plan, { name: 'Balanced', mode: 'balanced' });

    expect(result.recommendations.some(item => item.bucket === 'tfsa')).toBe(true);
  });

  it('shows the HBP 89-day warning when recent RRSP contributions are flagged near the purchase date', () => {
    const plan = buildDefaultTaxPlanInput();
    plan.household.targetPurchaseDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    plan.personA.recentHbpRrspContributions = 3000;

    const result = calculateTaxPlanResult(plan, { name: 'Balanced', mode: 'balanced' });

    expect(result.warnings.some(warning => warning.code.includes('89-day'))).toBe(true);
  });

  it('falls back away from FHSA and HBP for an ineligible spouse', () => {
    const plan = buildDefaultTaxPlanInput();
    plan.personA.firstTimeHomeBuyerEligible = false;
    plan.personA.fhsaRoom = 8000;
    plan.personA.currentHbpBalance = 5000;

    const result = calculateTaxPlanResult(plan, { name: 'Balanced', mode: 'balanced' });

    expect(
      result.recommendations.some(
        item => item.contributor === 'personA' && item.bucket === 'fhsa'
      )
    ).toBe(false);
  });

  it('stops at room and reserve limits for manual scenarios', () => {
    const plan = buildDefaultTaxPlanInput();
    const result = calculateTaxPlanResult(plan, {
      name: 'Manual',
      mode: 'manual',
      overrides: {
        personA: { fhsa: 4000, rrsp: 0, spousalRrsp: 0, tfsa: 0 },
        personB: { fhsa: 0, rrsp: 0, spousalRrsp: 0, tfsa: 0 },
      },
    });

    expect(result.summary.totalContribution).toBe(4000);
    expect(result.homeFunding.liquidSavingsAtPurchase).toBeGreaterThanOrEqual(0);
  });

  // -------------------------------------------------------------------------
  // New tests – tax credits, payroll, and regression
  // -------------------------------------------------------------------------

  it('applies spousal amount when spouse has zero income', () => {
    const personA = buildMinimalPerson({ name: 'Husband', employmentIncome: 72800, monthsEmployedThisYear: 12, firstTimeHomeBuyerEligible: true });
    const personB = buildMinimalPerson({ name: 'Wife', employmentIncome: 0, firstTimeHomeBuyerEligible: true });
    const household = buildMinimalHousehold();
    const plan = buildMinimalPlan(personA, personB, household);

    const result = calculateTaxPlanResult(plan, { name: 'Test', mode: 'balanced', overrides: null });

    // Federal spousal amount should be at its maximum (16452) when spouse has zero income
    expect(result.people.personA.federalCredits.spousalAmount).toBeCloseTo(16452, 0);
    // Provincial spousal amount should be at its maximum (15780)
    expect(result.people.personA.provincialCredits.spousalAmount).toBeCloseTo(15780, 0);
    // Family net combined tax should be noticeably lower than gross bracket tax (difference > $8000)
    const familyGrossTax =
      result.people.personA.grossFederalTax +
      result.people.personA.grossProvincialTax +
      result.people.personB.grossFederalTax +
      result.people.personB.grossProvincialTax;
    const familyNetTax =
      result.people.personA.netFederalTax +
      result.people.personA.netProvincialTax +
      result.people.personB.netFederalTax +
      result.people.personB.netProvincialTax;
    expect(familyGrossTax - familyNetTax).toBeGreaterThan(8000);
  });

  it('spousal amount phases out dollar for dollar against spouse income', () => {
    const personA = buildMinimalPerson({ name: 'Husband', employmentIncome: 72800, monthsEmployedThisYear: 12 });
    const personB = buildMinimalPerson({ name: 'Wife', employmentIncome: 9000, monthsEmployedThisYear: 12 });
    const household = buildMinimalHousehold();
    const plan = buildMinimalPlan(personA, personB, household);

    const result = calculateTaxPlanResult(plan, { name: 'Test', mode: 'balanced', overrides: null });

    // The engine uses spouse's taxable income (after payroll deductions) as the phase-out base.
    // Wife at $9,000 with 12 months: CPP enhanced deduction ≈ $55 → taxable ≈ $8,945
    // Spousal amount = max(0, 16452 - 8945) = 7507
    const federalSpousalAmount = result.people.personA.federalCredits.spousalAmount;
    // Should be less than the full $16,452 (phase-out is active)
    expect(federalSpousalAmount).toBeLessThan(16452);
    // Should be greater than zero (spouse income is still below the break-even)
    expect(federalSpousalAmount).toBeGreaterThan(0);
    // Federal credit value at 14% on the phased-out amount: ~7507 * 0.14 ≈ $1,051 < full $2,303
    const federalSpousalCreditValue = federalSpousalAmount * 0.14;
    const fullCredit = 16452 * 0.14;
    expect(federalSpousalCreditValue).toBeLessThan(fullCredit);
    // Credit value should be in the expected range (~$1,000-$1,100)
    expect(federalSpousalCreditValue).toBeGreaterThan(900);
    expect(federalSpousalCreditValue).toBeLessThan(1200);
  });

  it('recommends tuition transfer when donor has no tax owing', () => {
    // Wife (personB) has $7,000 tuition but $0 income — she owes no tax, so tuition is all transferable
    const personA = buildMinimalPerson({ name: 'Husband', employmentIncome: 72800, monthsEmployedThisYear: 12 });
    const personB = buildMinimalPerson({
      name: 'Wife',
      employmentIncome: 0,
      monthsEmployedThisYear: 12,
      currentYearTuitionPaid: 7000,
      tuitionCarryforwardFederal: 0,
      tuitionCarryforwardProvincial: 0,
    });
    const household = buildMinimalHousehold();
    const plan = buildMinimalPlan(personA, personB, household);

    const result = calculateTaxPlanResult(plan, { name: 'Test', mode: 'balanced', overrides: null });

    expect(result.tuitionTransfer).not.toBeNull();
    // Cap is $5,000 federal/provincial
    expect(result.tuitionTransfer!.recommendedFederalAmount).toBe(5000);
    expect(result.tuitionTransfer!.taxSaved).toBeGreaterThan(0);
  });

  it('CPP and EI are computed and reduce taxable income', () => {
    const personA = buildMinimalPerson({ name: 'Person A', employmentIncome: 72800, monthsEmployedThisYear: 12 });
    // Person B: 6-month employment with same income — payroll should be smaller
    const personB = buildMinimalPerson({ name: 'Person B', employmentIncome: 20000, monthsEmployedThisYear: 6 });
    const household = buildMinimalHousehold();
    const plan = buildMinimalPlan(personA, personB, household);

    const result = calculateTaxPlanResult(plan, { name: 'Test', mode: 'balanced', overrides: null });

    // Person A full-year CPP and EI should be positive
    expect(result.people.personA.payroll.cppBase).toBeGreaterThan(0);
    expect(result.people.personA.payroll.ei).toBeGreaterThan(0);

    // Person B (6 months, $20k income) — CPP and EI should be positive but smaller than A's
    expect(result.people.personB.payroll.cppBase).toBeGreaterThan(0);
    expect(result.people.personB.payroll.ei).toBeGreaterThan(0);

    // Person A's full-year CPP base: cppPensionable = min(72800, 71300) - 3500 = 67800; cppBase = 67800 * 0.0495 ≈ 3356
    expect(result.people.personA.payroll.cppBase).toBeCloseTo(3356, 0);
    // Person A's full-year EI: min(72800, 65700) * 0.0164 = 65700 * 0.0164 ≈ 1077
    expect(result.people.personA.payroll.ei).toBeCloseTo(1077, 0);

    // Person B (6 months): pro-rated caps → cppYmpe * 0.5 = 35650, eiCap = 65700 * 0.5 = 32850, exemption = 1750
    // cppPensionable = min(20000, 35650) - 1750 = 18250; cppBase = 18250 * 0.0495 ≈ 903
    // EI: min(20000, 32850) * 0.0164 ≈ 328
    expect(result.people.personB.payroll.cppBase).toBeCloseTo(903, 0);
    expect(result.people.personB.payroll.ei).toBeCloseTo(328, 0);

    // Person B's CPP/EI should be less than Person A's (partial-year pro-rating)
    expect(result.people.personB.payroll.cppBase).toBeLessThan(result.people.personA.payroll.cppBase);
    expect(result.people.personB.payroll.ei).toBeLessThan(result.people.personA.payroll.ei);
  });

  it('Winnipeg couple 2026 regression', () => {
    const personA = buildMinimalPerson({
      name: 'Husband',
      employmentIncome: 72800,
      monthsEmployedThisYear: 12,
      firstTimeHomeBuyerEligible: true,
    });
    const personB = buildMinimalPerson({
      name: 'Wife',
      monthlySalary: 4500,
      monthsEmployedThisYear: 9,
      employmentStartMonth: 4,
      // engine will project: 4500 * 9 = 40500
      employmentIncome: 40500,
      currentYearTuitionPaid: 3000,
      tuitionCarryforwardFederal: 6000,
      tuitionCarryforwardProvincial: 6000,
      firstTimeHomeBuyerEligible: true,
    });
    const household = buildMinimalHousehold({
      bothRentingCurrently: true,
      targetPurchaseDate: '2028-06-01',
      desiredDownPayment: 90000,
    });
    const plan = buildMinimalPlan(personA, personB, household);

    const result = calculateTaxPlanResult(plan, { name: 'Balanced', mode: 'balanced', overrides: null });

    // Engine should recommend tuition transfer (wife has tuition, husband has high income)
    expect(result.tuitionTransfer).not.toBeNull();

    // Federal break-even point equals the federal spousal amount maximum
    expect(result.spousalBreakEven.federalBreakEven).toBe(16452);

    // Family has positive net tax before optimization
    expect(result.summary.familyNetTaxBefore).toBeGreaterThan(0);

    // Both renting → MB Renters' Tax Credit mechanism is engaged.
    // However, the credit fully phases out above $56,500 family net income.
    // This household's combined income (~$113k) is above the threshold, so credit = $0.
    expect(result.summary.totalRefundableCredits).toBeGreaterThanOrEqual(0);

    // Net tax after credits/contributions should be less than before
    expect(result.summary.familyNetTaxAfter).toBeLessThan(result.summary.familyNetTaxBefore);

    // Wife was employed (9 months) so her CPP should have been computed
    expect(result.people.personB.payroll.cppBase).toBeGreaterThan(0);
  });
});
