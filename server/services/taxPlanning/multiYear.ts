import type {
  MultiYearProjection,
  TaxPersonInput,
  TaxPlanInput,
  TaxPlanScenarioInput,
} from '@shared/taxPlanning';
import { calculateTaxPlanResult, projectedAnnualEmploymentIncome } from './engine';
import { getTaxRuleSet } from './rules';

const PROJECTION_YEARS = 3;

/**
 * Compute end-of-year RRSP room for a person.
 *
 * newRoom = oldRoom + min(rrspContributionDollarCap, rrspEarnedIncomeRate * priorYearEarnedIncome)
 *           - contributionsUsed
 */
function nextYearRrspRoom(args: {
  currentRoom: number;
  priorYearEarnedIncome: number;
  contributionsUsed: number;
  rrspContributionDollarCap: number;
  rrspEarnedIncomeRate: number;
}): number {
  const { currentRoom, priorYearEarnedIncome, contributionsUsed, rrspContributionDollarCap, rrspEarnedIncomeRate } = args;
  const newAccrual = Math.min(rrspContributionDollarCap, rrspEarnedIncomeRate * priorYearEarnedIncome);
  return Math.max(0, currentRoom + newAccrual - contributionsUsed);
}

/**
 * Compute end-of-year FHSA room for a person.
 *
 * Annual accrual: +fhsaAnnualLimit per year.
 * Carry-forward of unused room from prior year, but capped at fhsaCarryforwardCap.
 * Lifetime cap: fhsaLifetimeLimit minus total contributed to date.
 */
function nextYearFhsaRoom(args: {
  currentRoom: number;
  contributionsUsed: number;
  totalContributedToDate: number;
  fhsaAnnualLimit: number;
  fhsaCarryforwardCap: number;
  fhsaLifetimeLimit: number;
}): number {
  const { currentRoom, contributionsUsed, totalContributedToDate, fhsaAnnualLimit, fhsaCarryforwardCap, fhsaLifetimeLimit } = args;
  const unusedFromThisYear = Math.max(0, currentRoom - contributionsUsed);
  // Carry-forward is capped at one year's worth
  const carryForward = Math.min(unusedFromThisYear, fhsaCarryforwardCap);
  const rawNewRoom = fhsaAnnualLimit + carryForward;
  // Apply lifetime cap: cannot contribute more than what's left of the lifetime limit
  const remainingLifetime = Math.max(0, fhsaLifetimeLimit - totalContributedToDate);
  return Math.min(rawNewRoom, remainingLifetime);
}

/**
 * Compute end-of-year TFSA room for a person.
 *
 * newRoom = max(0, oldRoom - contributionsUsed) + tfsaAnnualLimit
 */
function nextYearTfsaRoom(args: {
  currentRoom: number;
  contributionsUsed: number;
  tfsaAnnualLimit: number;
}): number {
  const { currentRoom, contributionsUsed, tfsaAnnualLimit } = args;
  return Math.max(0, currentRoom - contributionsUsed) + tfsaAnnualLimit;
}

/**
 * Build the person input for the next tax year by carrying forward
 * balances, room, and income projections.
 */
function buildNextYearPerson(args: {
  person: TaxPersonInput;
  personKey: 'personA' | 'personB';
  fhsaContributions: number;
  rrspContributions: number;
  spousalRrspContributions: number;
  tfsaContributions: number;
  fhsaTotalContributedToDate: number;
  tuitionTransferDonorKey: 'personA' | 'personB' | null;
  tuitionCarryforwardFederal: number | null;  // updated value from engine result
  tuitionCarryforwardProvincial: number | null;
  rrspContributionDollarCap: number;
  rrspEarnedIncomeRate: number;
  fhsaAnnualLimit: number;
  fhsaCarryforwardCap: number;
  fhsaLifetimeLimit: number;
  tfsaAnnualLimit: number;
  isPersonB: boolean;
}): TaxPersonInput {
  const {
    person,
    fhsaContributions,
    rrspContributions,
    spousalRrspContributions,
    tfsaContributions,
    fhsaTotalContributedToDate,
    tuitionTransferDonorKey,
    tuitionCarryforwardFederal,
    tuitionCarryforwardProvincial,
    rrspContributionDollarCap,
    rrspEarnedIncomeRate,
    fhsaAnnualLimit,
    fhsaCarryforwardCap,
    fhsaLifetimeLimit,
    tfsaAnnualLimit,
    personKey,
    isPersonB,
  } = args;

  const priorYearEarnedIncome = projectedAnnualEmploymentIncome(person);

  // RRSP: contributor's own RRSP contributions reduce their room (not spousal received)
  const rrspContributionsUsed = rrspContributions + spousalRrspContributions;

  const newRrspRoom = nextYearRrspRoom({
    currentRoom: person.rrspDeductionLimit,
    priorYearEarnedIncome,
    contributionsUsed: rrspContributionsUsed,
    rrspContributionDollarCap,
    rrspEarnedIncomeRate,
  });

  const newFhsaRoom = nextYearFhsaRoom({
    currentRoom: person.fhsaRoom,
    contributionsUsed: fhsaContributions,
    totalContributedToDate: fhsaTotalContributedToDate,
    fhsaAnnualLimit,
    fhsaCarryforwardCap,
    fhsaLifetimeLimit,
  });

  const newTfsaRoom = nextYearTfsaRoom({
    currentRoom: person.tfsaRoom,
    contributionsUsed: tfsaContributions,
    tfsaAnnualLimit,
  });

  // RRSP balance: add own contributions + contributions received as spousal annuitant
  // (spousalRrspContributions here is what THIS person contributed to their spouse's RRSP —
  //  the received side is tracked separately by the caller and passed in via currentSpousalRrspBalance)
  const newPersonalRrspBalance = person.currentPersonalRrspBalance + rrspContributions;
  // spousal RRSP balance on this person's books = received spousal contributions (tracked by caller)
  // We do not modify currentSpousalRrspBalance here; caller handles received side.

  // FHSA balance accumulates (no withdrawal within projection window)
  const newFhsaBalance = person.currentFhsaBalance + fhsaContributions;

  // TFSA balance
  const newTfsaBalance = person.currentTfsaBalance + tfsaContributions;

  // Tuition carryforward: if this person is the donor, use the engine-computed carry-forward.
  // If not the donor, leave unchanged (all carries forward).
  let newTuitionCarryforwardFederal = person.tuitionCarryforwardFederal;
  let newTuitionCarryforwardProvincial = person.tuitionCarryforwardProvincial;
  if (personKey === tuitionTransferDonorKey && tuitionCarryforwardFederal !== null) {
    newTuitionCarryforwardFederal = tuitionCarryforwardFederal;
    newTuitionCarryforwardProvincial = tuitionCarryforwardProvincial ?? newTuitionCarryforwardProvincial;
  } else if (personKey !== tuitionTransferDonorKey) {
    // No transfer happened for this person — all tuition carries forward
    // (no deduction from remaining carry-forward pool unless the engine said so)
    // We leave it as-is; if tuition was transferred out it would be as the donor.
  }

  // Income projection for future years
  let nextEmploymentIncome = person.employmentIncome;
  let nextMonthsEmployedThisYear = person.monthsEmployedThisYear;
  let nextEmploymentStartMonth: number | null = person.employmentStartMonth;

  if (isPersonB && person.monthlySalary && person.monthlySalary > 0) {
    // Year 1+: project full-year income from monthly salary
    nextEmploymentIncome = person.monthlySalary * 12;
    nextMonthsEmployedThisYear = 12;
    nextEmploymentStartMonth = null;
  } else if (!isPersonB) {
    // personA: keep same income, set to full year
    nextMonthsEmployedThisYear = 12;
    nextEmploymentStartMonth = null;
  }

  return {
    ...person,
    employmentIncome: nextEmploymentIncome,
    monthsEmployedThisYear: nextMonthsEmployedThisYear,
    employmentStartMonth: nextEmploymentStartMonth,
    rrspDeductionLimit: Math.round(newRrspRoom * 100) / 100,
    fhsaRoom: Math.round(newFhsaRoom * 100) / 100,
    tfsaRoom: Math.round(newTfsaRoom * 100) / 100,
    currentPersonalRrspBalance: Math.round(newPersonalRrspBalance * 100) / 100,
    currentFhsaBalance: Math.round(newFhsaBalance * 100) / 100,
    currentTfsaBalance: Math.round(newTfsaBalance * 100) / 100,
    // Reset current-year contribution trackers
    currentYearRrspContributions: 0,
    currentYearFhsaContributions: 0,
    currentYearTfsaContributions: 0,
    // Tuition: no more tuition paid after year 0
    currentYearTuitionPaid: 0,
    tuitionCarryforwardFederal: Math.max(0, Math.round(newTuitionCarryforwardFederal * 100) / 100),
    tuitionCarryforwardProvincial: Math.max(0, Math.round(newTuitionCarryforwardProvincial * 100) / 100),
  };
}

export function projectMultiYear(
  plan: TaxPlanInput,
  scenario: TaxPlanScenarioInput
): MultiYearProjection {
  const byYear: MultiYearProjection['byYear'] = [];

  // Mutable state that carries forward between years
  let currentPlan = plan;

  // Track total FHSA contributed to date per person (for lifetime limit)
  let fhsaTotalContributedA = currentPlan.personA.currentFhsaBalance; // start from existing balance as proxy
  let fhsaTotalContributedB = currentPlan.personB.currentFhsaBalance;

  // Track spousal RRSP contributions received per person (the annuitant side)
  // We need to update currentSpousalRrspBalance on the receiving person each year
  let spousalRrspReceivedA = currentPlan.personA.currentSpousalRrspBalance;
  let spousalRrspReceivedB = currentPlan.personB.currentSpousalRrspBalance;

  let cumulativeFamilyNetTax = 0;

  for (let i = 0; i < PROJECTION_YEARS; i++) {
    const taxYear = plan.taxYear + i;
    const yearPlan: TaxPlanInput = {
      ...currentPlan,
      taxYear,
      // Update spousal RRSP balances (received side) from prior year
      personA: { ...currentPlan.personA, currentSpousalRrspBalance: spousalRrspReceivedA },
      personB: { ...currentPlan.personB, currentSpousalRrspBalance: spousalRrspReceivedB },
    };

    const result = calculateTaxPlanResult(yearPlan, scenario);
    const rules = getTaxRuleSet(taxYear, plan.province);

    // Extract contributions used this year per person from the result
    const contribA = result.people.personA.contributions;
    const contribB = result.people.personB.contributions;

    // FHSA contributions used
    const fhsaContribA = contribA.fhsa;
    const fhsaContribB = contribB.fhsa;

    // RRSP contributions used by each contributor (own + spousal they paid)
    const rrspContribA = contribA.rrsp;
    const rrspContribB = contribB.rrsp;
    const spousalRrspByA = contribA.spousalRrsp; // A contributed to B's spousal RRSP
    const spousalRrspByB = contribB.spousalRrsp; // B contributed to A's spousal RRSP

    // TFSA contributions used
    const tfsaContribA = contribA.tfsa;
    const tfsaContribB = contribB.tfsa;

    // Update lifetime FHSA contributed
    fhsaTotalContributedA += fhsaContribA;
    fhsaTotalContributedB += fhsaContribB;

    // Update spousal RRSP balances received (the annuitant accumulates)
    spousalRrspReceivedA += spousalRrspByB; // B contributes to A's spousal RRSP
    spousalRrspReceivedB += spousalRrspByA; // A contributes to B's spousal RRSP

    // Tuition transfer carry-forward from engine result
    const tuitionTransfer = result.tuitionTransfer;
    const tuitionDonorKey = tuitionTransfer ? tuitionTransfer.donor : null;
    const tuitionCarryForwardFederal = tuitionTransfer ? tuitionTransfer.carryForwardFederal : null;
    const tuitionCarryForwardProvincial = tuitionTransfer ? tuitionTransfer.carryForwardProvincial : null;

    // Compute end-of-year room values (before building next year's person)
    const rrspRoomA = nextYearRrspRoom({
      currentRoom: yearPlan.personA.rrspDeductionLimit,
      priorYearEarnedIncome: projectedAnnualEmploymentIncome(yearPlan.personA),
      contributionsUsed: rrspContribA + spousalRrspByA,
      rrspContributionDollarCap: rules.rrspContributionDollarCap,
      rrspEarnedIncomeRate: rules.rrspEarnedIncomeRate,
    });
    const rrspRoomB = nextYearRrspRoom({
      currentRoom: yearPlan.personB.rrspDeductionLimit,
      priorYearEarnedIncome: projectedAnnualEmploymentIncome(yearPlan.personB),
      contributionsUsed: rrspContribB + spousalRrspByB,
      rrspContributionDollarCap: rules.rrspContributionDollarCap,
      rrspEarnedIncomeRate: rules.rrspEarnedIncomeRate,
    });
    const fhsaRoomA = nextYearFhsaRoom({
      currentRoom: yearPlan.personA.fhsaRoom,
      contributionsUsed: fhsaContribA,
      totalContributedToDate: fhsaTotalContributedA,
      fhsaAnnualLimit: rules.fhsaAnnualLimit,
      fhsaCarryforwardCap: rules.fhsaCarryforwardCap,
      fhsaLifetimeLimit: rules.fhsaLifetimeLimit,
    });
    const fhsaRoomB = nextYearFhsaRoom({
      currentRoom: yearPlan.personB.fhsaRoom,
      contributionsUsed: fhsaContribB,
      totalContributedToDate: fhsaTotalContributedB,
      fhsaAnnualLimit: rules.fhsaAnnualLimit,
      fhsaCarryforwardCap: rules.fhsaCarryforwardCap,
      fhsaLifetimeLimit: rules.fhsaLifetimeLimit,
    });
    const tfsaRoomA = nextYearTfsaRoom({
      currentRoom: yearPlan.personA.tfsaRoom,
      contributionsUsed: tfsaContribA,
      tfsaAnnualLimit: rules.tfsaAnnualLimit,
    });
    const tfsaRoomB = nextYearTfsaRoom({
      currentRoom: yearPlan.personB.tfsaRoom,
      contributionsUsed: tfsaContribB,
      tfsaAnnualLimit: rules.tfsaAnnualLimit,
    });
    const fhsaBalanceA = yearPlan.personA.currentFhsaBalance + fhsaContribA;
    const fhsaBalanceB = yearPlan.personB.currentFhsaBalance + fhsaContribB;

    byYear.push({
      taxYear,
      projected: i > 0,
      result,
      rrspRoomEndOfYear: {
        personA: Math.round(rrspRoomA * 100) / 100,
        personB: Math.round(rrspRoomB * 100) / 100,
      },
      fhsaRoomEndOfYear: {
        personA: Math.round(fhsaRoomA * 100) / 100,
        personB: Math.round(fhsaRoomB * 100) / 100,
      },
      tfsaRoomEndOfYear: {
        personA: Math.round(tfsaRoomA * 100) / 100,
        personB: Math.round(tfsaRoomB * 100) / 100,
      },
      fhsaBalanceEndOfYear: {
        personA: Math.round(fhsaBalanceA * 100) / 100,
        personB: Math.round(fhsaBalanceB * 100) / 100,
      },
    });

    cumulativeFamilyNetTax += result.summary.familyNetTaxAfter;

    // Build next year's persons
    if (i < PROJECTION_YEARS - 1) {
      const nextPersonA = buildNextYearPerson({
        person: yearPlan.personA,
        personKey: 'personA',
        fhsaContributions: fhsaContribA,
        rrspContributions: rrspContribA,
        spousalRrspContributions: spousalRrspByA,
        tfsaContributions: tfsaContribA,
        fhsaTotalContributedToDate: fhsaTotalContributedA,
        tuitionTransferDonorKey: tuitionDonorKey,
        tuitionCarryforwardFederal: tuitionDonorKey === 'personA' ? tuitionCarryForwardFederal : null,
        tuitionCarryforwardProvincial: tuitionDonorKey === 'personA' ? tuitionCarryForwardProvincial : null,
        rrspContributionDollarCap: rules.rrspContributionDollarCap,
        rrspEarnedIncomeRate: rules.rrspEarnedIncomeRate,
        fhsaAnnualLimit: rules.fhsaAnnualLimit,
        fhsaCarryforwardCap: rules.fhsaCarryforwardCap,
        fhsaLifetimeLimit: rules.fhsaLifetimeLimit,
        tfsaAnnualLimit: rules.tfsaAnnualLimit,
        isPersonB: false,
      });

      const nextPersonB = buildNextYearPerson({
        person: yearPlan.personB,
        personKey: 'personB',
        fhsaContributions: fhsaContribB,
        rrspContributions: rrspContribB,
        spousalRrspContributions: spousalRrspByB,
        tfsaContributions: tfsaContribB,
        fhsaTotalContributedToDate: fhsaTotalContributedB,
        tuitionTransferDonorKey: tuitionDonorKey,
        tuitionCarryforwardFederal: tuitionDonorKey === 'personB' ? tuitionCarryForwardFederal : null,
        tuitionCarryforwardProvincial: tuitionDonorKey === 'personB' ? tuitionCarryForwardProvincial : null,
        rrspContributionDollarCap: rules.rrspContributionDollarCap,
        rrspEarnedIncomeRate: rules.rrspEarnedIncomeRate,
        fhsaAnnualLimit: rules.fhsaAnnualLimit,
        fhsaCarryforwardCap: rules.fhsaCarryforwardCap,
        fhsaLifetimeLimit: rules.fhsaLifetimeLimit,
        tfsaAnnualLimit: rules.tfsaAnnualLimit,
        isPersonB: true,
      });

      // Apply the spousal RRSP balance on the receiving side (updated above)
      const nextPersonAWithSpousal: TaxPersonInput = {
        ...nextPersonA,
        currentSpousalRrspBalance: spousalRrspReceivedA,
      };
      const nextPersonBWithSpousal: TaxPersonInput = {
        ...nextPersonB,
        currentSpousalRrspBalance: spousalRrspReceivedB,
      };

      currentPlan = {
        ...yearPlan,
        taxYear: taxYear + 1,
        personA: nextPersonAWithSpousal,
        personB: nextPersonBWithSpousal,
      };
    }
  }

  const lastYear = byYear[byYear.length - 1];

  return {
    byYear,
    cumulativeFamilyNetTax: Math.round(cumulativeFamilyNetTax * 100) / 100,
    projectedHomeFundsAtPurchase: lastYear.result.homeFunding.totalProjectedHomeFunds,
    shortfallAtPurchase: lastYear.result.homeFunding.shortfall,
  };
}
