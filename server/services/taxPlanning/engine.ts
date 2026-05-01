import type {
  BracketSlice,
  ContributionRecommendation,
  HomeFundingProjection,
  SpousalAmountBreakEven,
  TaxBucket,
  TaxCreditBreakdown,
  TaxOptimizationResult,
  TaxPayrollBreakdown,
  TaxPersonInput,
  TaxPersonKey,
  TaxPersonResult,
  TaxPlanInput,
  TaxPlanScenarioInput,
  TaxPlanningMode,
  TaxScenarioOverrides,
  TaxScenarioPersonOverrides,
  TaxWarning,
  TuitionTransferDetail,
} from '@shared/taxPlanning';
import { buildEmptyScenarioOverrides } from '@shared/taxPlanning';
import {
  getTaxRuleSet,
  type TaxBracket,
  type TaxCreditRules,
  type PayrollRules,
  type TaxRuleSet,
} from './rules';

type OptimizationContext = {
  plan: TaxPlanInput;
  rules: TaxRuleSet;
  monthsToPurchase: number;
  contributionBudgetMonths: number;
  totalContributionBudget: number;
};

type Candidate = {
  key: string;
  bucket: TaxBucket;
  contributor: TaxPersonKey;
  annuitant?: TaxPersonKey;
  maxAmount: number;
  score: number;
  priority: number;
  marginalRate: number;
  estimatedTaxSavings: number;
  estimatedHomeFundsAdded: number;
  reason: string;
};

const PERSON_KEYS: TaxPersonKey[] = ['personA', 'personB'];
const STEP_AMOUNT = 250;
const EMPTY_TUITION_TRANSFER: TuitionTransferContext = { federalReceived: 0, provincialReceived: 0 };

type TuitionTransferContext = {
  federalReceived: number;
  provincialReceived: number;
};

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function clampNonNegative(value: number) {
  return value > 0 ? value : 0;
}

function totalIncome(person: TaxPersonInput) {
  return person.employmentIncome + person.otherTaxableIncome;
}

function taxableBeforeScenario(person: TaxPersonInput) {
  return Math.max(
    0,
    totalIncome(person) - person.currentYearRrspContributions - person.currentYearFhsaContributions
  );
}

function calculateBracketTax(income: number, brackets: TaxBracket[]) {
  if (income <= 0) return 0;

  let previousLimit = 0;
  let tax = 0;

  for (const bracket of brackets) {
    const taxableInBracket = Math.min(income, bracket.upTo) - previousLimit;
    if (taxableInBracket > 0) {
      tax += taxableInBracket * bracket.rate;
      previousLimit = bracket.upTo;
    }
    if (income <= bracket.upTo) {
      break;
    }
  }

  return round2(tax);
}

export function computeBracketBreakdown(income: number, brackets: TaxBracket[]): BracketSlice[] {
  if (income <= 0) {
    return brackets.map(b => ({ upTo: b.upTo, rate: b.rate, incomeInBracket: 0, taxInBracket: 0 }));
  }
  let previousLimit = 0;
  return brackets.map(bracket => {
    const rangeTop = Math.min(income, bracket.upTo);
    const incomeInBracket = Math.max(0, rangeTop - previousLimit);
    const taxInBracket = round2(incomeInBracket * bracket.rate);
    previousLimit = bracket.upTo;
    return { upTo: bracket.upTo, rate: bracket.rate, incomeInBracket: round2(incomeInBracket), taxInBracket };
  });
}

function computeBracketThresholdInsight(
  taxableIncomeAfter: number,
  rules: TaxRuleSet
): TaxPersonResult['bracketThresholdInsight'] {
  const brackets = rules.federalBrackets;
  const provincialBrackets = rules.provincialBrackets;

  // Find the bracket index the person currently occupies
  let currentBracketIndex = brackets.findIndex(b => taxableIncomeAfter <= b.upTo);
  if (currentBracketIndex < 0) currentBracketIndex = brackets.length - 1;

  // Already in lowest bracket
  if (currentBracketIndex === 0) {
    const federalRate = brackets[0].rate;
    const provincialRate = provincialBrackets.find(b => taxableIncomeAfter <= b.upTo)?.rate
      ?? provincialBrackets[provincialBrackets.length - 1].rate;
    return {
      federalNextThreshold: 0,
      federalCurrentRate: federalRate,
      federalLowerRate: federalRate,
      additionalDeductionNeeded: 0,
      taxSavingIfThresholdHit: 0,
      combinedCurrentMarginalRate: round2((federalRate + provincialRate) * 100) / 100,
      combinedLowerMarginalRate: round2((federalRate + provincialRate) * 100) / 100,
    };
  }

  const currentBracket = brackets[currentBracketIndex];
  const lowerBracket = brackets[currentBracketIndex - 1];

  // How much to deduct to drop to the lower bracket threshold
  const threshold = lowerBracket.upTo;
  const additionalDeductionNeeded = Math.max(0, round2(taxableIncomeAfter - threshold));

  const federalCurrentRate = currentBracket.rate;
  const federalLowerRate = lowerBracket.rate;
  const taxSavingIfThresholdHit = round2(additionalDeductionNeeded * (federalCurrentRate - federalLowerRate));

  // Combined marginal rates (provincial rate at current income vs at threshold)
  const provincialCurrentRate = provincialBrackets.find(b => taxableIncomeAfter <= b.upTo)?.rate
    ?? provincialBrackets[provincialBrackets.length - 1].rate;
  const provincialLowerRate = provincialBrackets.find(b => threshold <= b.upTo)?.rate
    ?? provincialBrackets[provincialBrackets.length - 1].rate;

  return {
    federalNextThreshold: threshold,
    federalCurrentRate: federalCurrentRate,
    federalLowerRate: federalLowerRate,
    additionalDeductionNeeded,
    taxSavingIfThresholdHit,
    combinedCurrentMarginalRate: round2((federalCurrentRate + provincialCurrentRate) * 100) / 100,
    combinedLowerMarginalRate: round2((federalLowerRate + provincialLowerRate) * 100) / 100,
  };
}

function getMarginalRate(income: number, rules: TaxRuleSet) {
  const federalRate = rules.federalBrackets.find(bracket => income <= bracket.upTo)?.rate ?? 0;
  const provincialRate =
    rules.provincialBrackets.find(bracket => income <= bracket.upTo)?.rate ?? 0;
  return federalRate + provincialRate;
}

function computeActualTaxSaving(taxableIncomeBefore: number, deductionAmount: number, rules: TaxRuleSet): number {
  if (deductionAmount <= 0) return 0;
  const incomeAfter = Math.max(0, taxableIncomeBefore - deductionAmount);
  const fedSaving = calculateBracketTax(taxableIncomeBefore, rules.federalBrackets) - calculateBracketTax(incomeAfter, rules.federalBrackets);
  const provSaving = calculateBracketTax(taxableIncomeBefore, rules.provincialBrackets) - calculateBracketTax(incomeAfter, rules.provincialBrackets);
  return round2(fedSaving + provSaving);
}

function monthsUntilPurchase(targetPurchaseDate: string | null) {
  if (!targetPurchaseDate) return 12;
  const purchaseDate = new Date(targetPurchaseDate);
  if (Number.isNaN(purchaseDate.getTime())) return 12;

  const now = new Date();
  const diffMs = purchaseDate.getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24 * 30.4375)));
}

function createContext(plan: TaxPlanInput): OptimizationContext {
  const rules = getTaxRuleSet(plan.taxYear, plan.province);
  const monthsToPurchaseValue = monthsUntilPurchase(plan.household.targetPurchaseDate);
  const contributionBudgetMonths = Math.max(1, Math.min(12, monthsToPurchaseValue || 12));
  const totalContributionBudget = round2(
    plan.household.monthlyAvailableSavings * contributionBudgetMonths
  );

  return {
    plan,
    rules,
    monthsToPurchase: monthsToPurchaseValue,
    contributionBudgetMonths,
    totalContributionBudget,
  };
}

function getOtherPerson(personKey: TaxPersonKey): TaxPersonKey {
  return personKey === 'personA' ? 'personB' : 'personA';
}

function getDeductibleContributionTotal(
  personKey: TaxPersonKey,
  contributions: TaxScenarioOverrides
) {
  return (
    contributions[personKey].fhsa +
    contributions[personKey].rrsp +
    contributions[personKey].spousalRrsp
  );
}

function getRemainingRooms(
  plan: TaxPlanInput,
  personKey: TaxPersonKey,
  contributions: TaxScenarioOverrides
) {
  const person = plan[personKey];
  const rules = rulesForPlan(plan);
  return {
    rrsp: Math.max(
      0,
      person.rrspDeductionLimit -
        person.currentYearRrspContributions -
        contributions[personKey].rrsp -
        contributions[personKey].spousalRrsp
    ),
    fhsa: Math.max(
      0,
      Math.min(rules.fhsaAnnualLimit + rules.fhsaCarryforwardCap, person.fhsaRoom) -
        person.currentYearFhsaContributions -
        contributions[personKey].fhsa
    ),
    tfsa: Math.max(
      0,
      Math.min(rules.tfsaAnnualLimit, person.tfsaRoom) -
        person.currentYearTfsaContributions -
        contributions[personKey].tfsa
    ),
  };
}

function rulesForPlan(plan: TaxPlanInput) {
  return getTaxRuleSet(plan.taxYear, plan.province);
}

function getHomeAccessWeight(
  plan: TaxPlanInput,
  contributor: TaxPersonKey,
  bucket: TaxBucket,
  annuitant?: TaxPersonKey
) {
  const householdHasHomeGoal =
    plan.household.desiredDownPayment > 0 || Boolean(plan.household.targetPurchaseDate);
  if (!householdHasHomeGoal) return 0;

  if (bucket === 'fhsa') return 1;
  if (bucket === 'tfsa') return 0.45;

  const accessPersonKey = bucket === 'spousalRrsp' ? annuitant : contributor;
  if (!accessPersonKey) return 0;
  const accessPerson = plan[accessPersonKey];
  if (!accessPerson.firstTimeHomeBuyerEligible || accessPerson.currentHbpBalance > 0) {
    return 0.2;
  }

  return 0.85;
}

function scoreModeCandidate(
  mode: TaxPlanningMode,
  basePriority: number,
  estimatedTaxSavings: number,
  homeAccessWeight: number,
  liquidityWeight: number
) {
  switch (mode) {
    case 'home-max':
      return (
        basePriority + homeAccessWeight * 1500 + estimatedTaxSavings * 1.5 + liquidityWeight * 200
      );
    case 'tax-max':
      return (
        basePriority + estimatedTaxSavings * 8 + homeAccessWeight * 600 + liquidityWeight * 60
      );
    case 'recommended':
    case 'balanced':
    default:
      return (
        basePriority + homeAccessWeight * 1000 + estimatedTaxSavings * 5 + liquidityWeight * 120
      );
  }
}

function buildCandidate(
  context: OptimizationContext,
  contributions: TaxScenarioOverrides,
  mode: TaxPlanningMode,
  remainingBudget: number,
  bucket: TaxBucket,
  contributor: TaxPersonKey,
  annuitant?: TaxPersonKey
): Candidate | null {
  const plan = context.plan;
  const rules = context.rules;
  const person = plan[contributor];
  const rooms = getRemainingRooms(plan, contributor, contributions);

  let maxAmount = 0;
  let reason = '';
  let basePriority = 0;
  let liquidityWeight = 0;

  switch (bucket) {
    case 'fhsa':
      if (!person.firstTimeHomeBuyerEligible) return null;
      maxAmount = rooms.fhsa;
      reason =
        'FHSA contributions reduce taxable income now and remain available for a qualifying first-home withdrawal.';
      basePriority = 900000;
      break;
    case 'rrsp': {
      maxAmount = rooms.rrsp;
      const matchOutstanding = Math.max(
        0,
        person.employerRrspMatchCap -
          person.currentYearRrspContributions -
          contributions[contributor].rrsp
      );
      const matchPriority =
        matchOutstanding > 0
          ? 1000000
          : person.firstTimeHomeBuyerEligible && person.currentHbpBalance <= 0
            ? 650000
            : 500000;
      reason =
        matchOutstanding > 0
          ? 'This RRSP contribution captures available employer matching before any unmatched dollars.'
          : 'This RRSP contribution improves the contributor’s current-year tax result and may add HBP capacity.';
      basePriority = matchPriority;
      break;
    }
    case 'spousalRrsp': {
      maxAmount = rooms.rrsp;
      const recipient = annuitant ? plan[annuitant] : null;
      const spousalPriority =
        recipient?.firstTimeHomeBuyerEligible && recipient.currentHbpBalance <= 0 ? 690000 : 575000;
      reason =
        recipient?.firstTimeHomeBuyerEligible
          ? 'The contributor receives the deduction while the annuitant spouse may later access these funds through their own HBP if eligible.'
          : 'The contributor receives the deduction while the annuitant spouse holds the future withdrawal balance.';
      basePriority = spousalPriority;
      break;
    }
    case 'tfsa':
      maxAmount = rooms.tfsa;
      reason =
        'TFSA contributions preserve flexible, tax-free liquidity for your home fund and emergency reserve.';
      basePriority = 180000;
      liquidityWeight = 1;
      break;
  }

  if (maxAmount <= 0 || remainingBudget <= 0) return null;

  const amount = Math.min(STEP_AMOUNT, maxAmount, remainingBudget);
  const taxableIncome =
    taxableBeforeScenario(person) - getDeductibleContributionTotal(contributor, contributions);
  const marginalRate = getMarginalRate(Math.max(0, taxableIncome), rules);
  const deductible = bucket === 'tfsa' ? 0 : amount;
  const estimatedTaxSavings = deductible * marginalRate;
  const homeAccessWeight = getHomeAccessWeight(plan, contributor, bucket, annuitant);
  const score = scoreModeCandidate(
    mode,
    basePriority,
    estimatedTaxSavings,
    homeAccessWeight,
    liquidityWeight
  );

  return {
    key: annuitant ? `${bucket}:${contributor}:${annuitant}` : `${bucket}:${contributor}`,
    bucket,
    contributor,
    annuitant,
    maxAmount,
    score,
    priority: basePriority,
    marginalRate,
    estimatedTaxSavings: round2(estimatedTaxSavings),
    estimatedHomeFundsAdded: round2(amount * homeAccessWeight),
    reason,
  };
}

function optimizeScenarioContributions(
  context: OptimizationContext,
  mode: TaxPlanningMode
): TaxScenarioOverrides {
  const contributions = buildEmptyScenarioOverrides();
  let remainingBudget = context.totalContributionBudget;

  while (remainingBudget > 0.009) {
    const candidates: Candidate[] = [];

    for (const personKey of PERSON_KEYS) {
      const otherKey = getOtherPerson(personKey);
      const candidateSet: Array<[TaxBucket, TaxPersonKey | undefined]> = [
        ['fhsa', undefined],
        ['rrsp', undefined],
        ['spousalRrsp', otherKey],
        ['tfsa', undefined],
      ];

      candidateSet.forEach(([bucket, annuitant]) => {
        const candidate = buildCandidate(
          context,
          contributions,
          mode,
          remainingBudget,
          bucket,
          personKey,
          annuitant
        );
        if (candidate) {
          candidates.push(candidate);
        }
      });
    }

    const winner = candidates.sort((a, b) => b.score - a.score)[0];
    if (!winner) break;

    const allocation = Math.min(STEP_AMOUNT, winner.maxAmount, remainingBudget);
    contributions[winner.contributor][winner.bucket] = round2(
      contributions[winner.contributor][winner.bucket] + allocation
    );
    remainingBudget = round2(remainingBudget - allocation);
  }

  return contributions;
}

function buildManualRecommendations(
  plan: TaxPlanInput,
  mode: TaxPlanningMode,
  overrides: TaxScenarioOverrides
): ContributionRecommendation[] {
  const rules = rulesForPlan(plan);
  const recommendations: ContributionRecommendation[] = [];
  let priority = 100;

  for (const personKey of PERSON_KEYS) {
    const person = plan[personKey];
    const personalOverrides = overrides[personKey];
    let runningDeductible = 0;
    (Object.keys(personalOverrides) as TaxBucket[]).forEach(bucket => {
      const amount = personalOverrides[bucket];
      if (!amount) return;
      const deductible = bucket === 'tfsa' ? 0 : amount;
      const taxableBase = Math.max(0, taxableBeforeScenario(person) - runningDeductible);
      const actualTaxSaving = computeActualTaxSaving(taxableBase, deductible, rules);
      const effectiveMarginalRate = deductible > 0
        ? round2((actualTaxSaving / deductible) * 100)
        : round2(getMarginalRate(taxableBase, rules) * 100);
      runningDeductible += deductible;
      const annuitant = bucket === 'spousalRrsp' ? getOtherPerson(personKey) : undefined;
      recommendations.push({
        key: annuitant ? `${bucket}:${personKey}:${annuitant}` : `${bucket}:${personKey}`,
        priority: priority--,
        bucket,
        contributor: personKey,
        annuitant,
        amount: round2(amount),
        estimatedTaxSavings: actualTaxSaving,
        estimatedHomeFundsAdded: round2(amount * getHomeAccessWeight(plan, personKey, bucket, annuitant)),
        marginalRate: effectiveMarginalRate,
        reason:
          mode === 'manual'
            ? 'Manual override preserved exactly as entered.'
            : 'Saved scenario allocation.',
      });
    });
  }

  return recommendations;
}

function mergeRecommendations(
  plan: TaxPlanInput,
  mode: TaxPlanningMode,
  contributions: TaxScenarioOverrides
): ContributionRecommendation[] {
  const context = createContext(plan);
  const rules = context.rules;
  const allItems: ContributionRecommendation[] = [];

  for (const personKey of PERSON_KEYS) {
    const person = plan[personKey];
    const personalContributions = contributions[personKey];

    type BucketEntry = { bucket: TaxBucket; amount: number; annuitant: TaxPersonKey | undefined; priority: number };
    const bucketEntries: BucketEntry[] = (Object.keys(personalContributions) as TaxBucket[])
      .map(bucket => {
        const amount = personalContributions[bucket];
        if (!amount) return null;
        const annuitant = bucket === 'spousalRrsp' ? getOtherPerson(personKey) : undefined;
        const priority =
          bucket === 'rrsp' && person.employerRrspMatchCap > 0
            ? 1000000
            : bucket === 'fhsa'
              ? 900000
              : bucket === 'spousalRrsp'
                ? 625000
                : 180000;
        return { bucket, amount, annuitant, priority };
      })
      .filter((x): x is BucketEntry => x !== null)
      .sort((a, b) => b.priority - a.priority);

    let runningDeductible = 0;
    for (const entry of bucketEntries) {
      const { bucket, amount, annuitant, priority } = entry;
      const deductible = bucket === 'tfsa' ? 0 : amount;
      const taxableBase = Math.max(0, taxableBeforeScenario(person) - runningDeductible);
      const actualTaxSaving = computeActualTaxSaving(taxableBase, deductible, rules);
      const effectiveMarginalRate = deductible > 0
        ? round2((actualTaxSaving / deductible) * 100)
        : round2(getMarginalRate(taxableBase, rules) * 100);
      runningDeductible += deductible;

      const key = annuitant ? `${bucket}:${personKey}:${annuitant}` : `${bucket}:${personKey}`;
      allItems.push({
        key,
        priority,
        bucket,
        contributor: personKey,
        annuitant,
        amount: round2(amount),
        estimatedTaxSavings: actualTaxSaving,
        estimatedHomeFundsAdded: round2(amount * getHomeAccessWeight(plan, personKey, bucket, annuitant)),
        marginalRate: effectiveMarginalRate,
        reason:
          bucket === 'fhsa'
            ? 'Deductible now and withdrawable tax-free for a qualifying first-home purchase.'
            : bucket === 'rrsp'
              ? 'Improves the contributor’s current-year tax result and may increase HBP capacity.'
              : bucket === 'spousalRrsp'
                ? 'Creates a deduction for the contributor while building HBP-accessible balance for the annuitant spouse when eligible.'
                : 'Preserves flexible, tax-free liquidity.',
      });
    }
  }

  return allItems.sort((a, b) => b.priority - a.priority);
}

function buildHomeFundingProjection(
  plan: TaxPlanInput,
  contributions: TaxScenarioOverrides,
  rules: TaxRuleSet,
  monthsToPurchaseValue: number
): HomeFundingProjection {
  const totalContribution = PERSON_KEYS.reduce((sum, personKey) => {
    const person = contributions[personKey];
    return sum + person.fhsa + person.rrsp + person.spousalRrsp + person.tfsa;
  }, 0);

  const futureSavings = plan.household.monthlyAvailableSavings * monthsToPurchaseValue;
  const liquidSavingsAtPurchase = Math.max(
    0,
    plan.household.currentDownPaymentSavings +
      futureSavings -
      totalContribution -
      plan.household.minimumCashReserve
  );

  const tfsaAccessible = PERSON_KEYS.reduce(
    (sum, personKey) => sum + plan[personKey].currentTfsaBalance + contributions[personKey].tfsa,
    0
  );

  const fhsaAccessible = PERSON_KEYS.reduce((sum, personKey) => {
    const person = plan[personKey];
    if (!person.firstTimeHomeBuyerEligible) return sum;
    return sum + person.currentFhsaBalance + contributions[personKey].fhsa;
  }, 0);

  const receivedSpousalBalance = {
    personA: contributions.personB.spousalRrsp,
    personB: contributions.personA.spousalRrsp,
  };

  const hbpAccessible = PERSON_KEYS.reduce((sum, personKey) => {
    const person = plan[personKey];
    if (!person.firstTimeHomeBuyerEligible || person.currentHbpBalance > 0) {
      return sum;
    }

    const rrspBalance =
      person.currentPersonalRrspBalance +
      person.currentSpousalRrspBalance +
      contributions[personKey].rrsp +
      receivedSpousalBalance[personKey];

    return sum + Math.min(rules.hbpWithdrawalLimit, rrspBalance);
  }, 0);

  const totalProjectedHomeFunds = liquidSavingsAtPurchase + tfsaAccessible + fhsaAccessible + hbpAccessible;

  return {
    monthsToPurchase: monthsToPurchaseValue,
    liquidSavingsAtPurchase: round2(liquidSavingsAtPurchase),
    tfsaAccessible: round2(tfsaAccessible),
    fhsaAccessible: round2(fhsaAccessible),
    hbpAccessible: round2(hbpAccessible),
    totalProjectedHomeFunds: round2(totalProjectedHomeFunds),
    targetDownPayment: round2(plan.household.desiredDownPayment),
    shortfall: round2(Math.max(0, plan.household.desiredDownPayment - totalProjectedHomeFunds)),
  };
}

function buildWarnings(
  plan: TaxPlanInput,
  contributions: TaxScenarioOverrides,
  homeFunding: HomeFundingProjection
): TaxWarning[] {
  const warnings: TaxWarning[] = [];
  const purchaseDate = plan.household.targetPurchaseDate ? new Date(plan.household.targetPurchaseDate) : null;
  const now = new Date();
  const isWithin89Days =
    purchaseDate && purchaseDate.getTime() > now.getTime()
      ? purchaseDate.getTime() - now.getTime() <= 89 * 24 * 60 * 60 * 1000
      : false;

  PERSON_KEYS.forEach(personKey => {
    const person = plan[personKey];
    if (
      isWithin89Days &&
      person.recentHbpRrspContributions > 0 &&
      (contributions[personKey].rrsp > 0 ||
        contributions[personKey].spousalRrsp > 0 ||
        person.currentPersonalRrspBalance > 0 ||
        person.currentSpousalRrspBalance > 0)
    ) {
      warnings.push({
        code: `${personKey}-hbp-89-day`,
        severity: 'warning',
        title: `${person.name}: HBP 89-day warning`,
        message:
          'Recent RRSP contributions may still be withdrawable for the Home Buyers’ Plan, but some or all of the deduction could be denied under the 89-day rule.',
      });
    }
  });

  const hasNewSpousalRrsp =
    contributions.personA.spousalRrsp > 0 || contributions.personB.spousalRrsp > 0;
  const hasRecentSpousalRrspHistory =
    plan.personA.spousalRrspContributionsLastThreeYears > 0 ||
    plan.personB.spousalRrspContributionsLastThreeYears > 0;

  if (hasNewSpousalRrsp && hasRecentSpousalRrspHistory) {
    warnings.push({
      code: 'spousal-rrsp-attribution',
      severity: 'warning',
      title: 'Spousal RRSP attribution warning',
      message:
        'Spousal RRSP contributions exist within the 3-year attribution window. If the annuitant spouse withdraws those funds outside an HBP path, attribution rules may shift the taxable amount back to the contributor.',
    });
  }

  if (homeFunding.shortfall > 0) {
    warnings.push({
      code: 'home-funding-shortfall',
      severity: 'warning',
      title: 'Down payment shortfall',
      message: `The projected home funding is short by ${homeFunding.shortfall.toFixed(
        2
      )}. Increase savings, extend the timeline, or reduce the target down payment.`,
    });
  }

  PERSON_KEYS.forEach(personKey => {
    const person = plan[personKey];
    if (!person.firstTimeHomeBuyerEligible && contributions[personKey].fhsa > 0) {
      warnings.push({
        code: `${personKey}-fhsa-eligibility`,
        severity: 'warning',
        title: `${person.name}: FHSA eligibility`,
        message:
          'This person is marked as not eligible for first-home status. Verify eligibility before relying on FHSA deductions or withdrawals.',
      });
    }
    if (person.currentHbpBalance > 0) {
      warnings.push({
        code: `${personKey}-existing-hbp`,
        severity: 'info',
        title: `${person.name}: existing HBP balance`,
        message:
          'An existing Home Buyers’ Plan balance was entered. This plan treats new HBP capacity conservatively until that balance is resolved.',
      });
    }
  });

  return warnings;
}

function projectedAnnualEmploymentIncome(person: TaxPersonInput) {
  if (person.monthlySalary && person.monthlySalary > 0) {
    return person.monthlySalary * 12;
  }
  if (person.monthsEmployedThisYear > 0 && person.monthsEmployedThisYear < 12) {
    return person.employmentIncome * (12 / person.monthsEmployedThisYear);
  }
  return person.employmentIncome;
}

export function computePayroll(person: TaxPersonInput, payroll: PayrollRules): TaxPayrollBreakdown {
  const months = Math.max(0, Math.min(12, person.monthsEmployedThisYear || 12));
  const monthsFactor = months > 0 ? months / 12 : 0;
  const ympeCap = payroll.cppYmpe * monthsFactor;
  const yampeCap = payroll.cpp2Yampe * monthsFactor;
  const eiCap = payroll.eiMie * monthsFactor;
  const exemption = payroll.cppBasicExemption * monthsFactor;
  const employmentIncome = clampNonNegative(person.employmentIncome);

  const cppPensionable = Math.max(0, Math.min(employmentIncome, ympeCap) - exemption);
  const cppTotal = cppPensionable * payroll.cppRate;
  const cppCredit = cppPensionable * payroll.cppCreditPortion;
  const cppEnhanced = Math.max(0, cppTotal - cppCredit);

  const cpp2Pensionable = Math.max(0, Math.min(employmentIncome, yampeCap) - ympeCap);
  const cpp2 = cpp2Pensionable * payroll.cpp2Rate;

  const eiPensionable = Math.max(0, Math.min(employmentIncome, eiCap));
  const ei = eiPensionable * payroll.eiRate;

  return {
    cppBase: round2(cppCredit),
    cppEnhanced: round2(cppEnhanced),
    cpp2: round2(cpp2),
    ei: round2(ei),
    totalPremiums: round2(cppCredit + cppEnhanced + cpp2 + ei),
    totalDeduction: round2(cppEnhanced + cpp2),
  };
}

function bpaAmountWithPhaseOut(taxableIncome: number, credits: TaxCreditRules) {
  const base = credits.federalBpaBase;
  const supplementMax = credits.federalBpaSupplement;
  const start = credits.federalBpaPhaseOutStart;
  const end = credits.federalBpaPhaseOutEnd;
  if (taxableIncome <= start) return base + supplementMax;
  if (taxableIncome >= end) return base;
  const fraction = (taxableIncome - start) / (end - start);
  return base + supplementMax * (1 - fraction);
}

type CreditComputation = {
  federal: TaxCreditBreakdown;
  provincial: TaxCreditBreakdown;
};

function computeNonRefundableCredits(args: {
  person: TaxPersonInput;
  taxableIncome: number;
  spouseNetIncome: number;
  payroll: TaxPayrollBreakdown;
  rules: TaxRuleSet;
  tuition: TuitionTransferContext;
}): CreditComputation {
  const { person, taxableIncome, spouseNetIncome, payroll, rules, tuition } = args;
  const credits = rules.credits;

  const federalBpa = bpaAmountWithPhaseOut(taxableIncome, credits);
  const federalSpousal = clampNonNegative(
    credits.federalSpousalAmountMax - clampNonNegative(spouseNetIncome)
  );
  const federalCea = Math.min(credits.federalCanadaEmploymentAmount, person.employmentIncome);
  const federalCppEi = payroll.cppBase + payroll.ei;

  const provincialBpa = credits.provincialBpa;
  const provincialSpousal = clampNonNegative(
    credits.provincialSpousalAmountMax - clampNonNegative(spouseNetIncome)
  );
  const provincialCppEi = payroll.cppBase + payroll.ei;

  const federalTuitionOwn = clampNonNegative(person.tuitionCarryforwardFederal);
  const provincialTuitionOwn = clampNonNegative(person.tuitionCarryforwardProvincial);

  const federalSum =
    federalBpa + federalSpousal + federalCea + federalCppEi + federalTuitionOwn + tuition.federalReceived;
  const provincialSum =
    provincialBpa + provincialSpousal + provincialCppEi + provincialTuitionOwn + tuition.provincialReceived;

  return {
    federal: {
      basicPersonalAmount: round2(federalBpa),
      spousalAmount: round2(federalSpousal),
      canadaEmploymentAmount: round2(federalCea),
      cppEiCredit: round2(federalCppEi),
      tuitionOwn: round2(federalTuitionOwn),
      tuitionTransferIn: round2(tuition.federalReceived),
      totalCreditAmount: round2(federalSum),
      totalCreditValue: round2(federalSum * credits.federalLowestRate),
    },
    provincial: {
      basicPersonalAmount: round2(provincialBpa),
      spousalAmount: round2(provincialSpousal),
      canadaEmploymentAmount: 0,
      cppEiCredit: round2(provincialCppEi),
      tuitionOwn: round2(provincialTuitionOwn),
      tuitionTransferIn: round2(tuition.provincialReceived),
      totalCreditAmount: round2(provincialSum),
      totalCreditValue: round2(provincialSum * credits.provincialLowestRate),
    },
  };
}

type FullTaxComputation = {
  taxableIncome: number;
  grossFederalTax: number;
  grossProvincialTax: number;
  netFederalTax: number;
  netProvincialTax: number;
  payroll: TaxPayrollBreakdown;
  credits: CreditComputation;
};

function computeTaxForPerson(args: {
  person: TaxPersonInput;
  contributions: TaxScenarioPersonOverrides;
  spouseNetIncome: number;
  rules: TaxRuleSet;
  tuition: TuitionTransferContext;
}): FullTaxComputation {
  const { person, contributions, spouseNetIncome, rules, tuition } = args;
  const totalIncomeAmount = totalIncome(person);
  const deductions =
    person.currentYearRrspContributions +
    person.currentYearFhsaContributions +
    contributions.fhsa +
    contributions.rrsp +
    contributions.spousalRrsp;
  const payroll = computePayroll(person, rules.payroll);
  const taxableIncome = Math.max(0, totalIncomeAmount - deductions - payroll.totalDeduction);
  const grossFederalTax = calculateBracketTax(taxableIncome, rules.federalBrackets);
  const grossProvincialTax = calculateBracketTax(taxableIncome, rules.provincialBrackets);
  const credits = computeNonRefundableCredits({
    person,
    taxableIncome,
    spouseNetIncome,
    payroll,
    rules,
    tuition,
  });
  const netFederalTax = clampNonNegative(grossFederalTax - credits.federal.totalCreditValue);
  const netProvincialTax = clampNonNegative(grossProvincialTax - credits.provincial.totalCreditValue);

  return {
    taxableIncome,
    grossFederalTax: round2(grossFederalTax),
    grossProvincialTax: round2(grossProvincialTax),
    netFederalTax: round2(netFederalTax),
    netProvincialTax: round2(netProvincialTax),
    payroll,
    credits,
  };
}

function computeRefundableCredits(args: {
  plan: TaxPlanInput;
  rules: TaxRuleSet;
  familyNetIncome: number;
}): { personA: number; personB: number } {
  const { plan, rules, familyNetIncome } = args;
  if (!plan.household.bothRentingCurrently) {
    return { personA: 0, personB: 0 };
  }
  const refund = rules.refundable;
  const start = refund.mbRentersPhaseOutStart;
  const end = refund.mbRentersPhaseOutEnd;
  const max = refund.mbRentersCreditPerEligibleAdult;

  let perAdult = max;
  if (familyNetIncome > start) {
    if (familyNetIncome >= end) {
      perAdult = 0;
    } else {
      perAdult = max * (1 - (familyNetIncome - start) / (end - start));
    }
  }
  return {
    personA: round2(clampNonNegative(perAdult)),
    personB: round2(clampNonNegative(perAdult)),
  };
}

function computeSpousalAmountBreakEven(
  plan: TaxPlanInput,
  rules: TaxRuleSet,
  spouseNetIncome: number
): SpousalAmountBreakEven {
  const credits = rules.credits;
  return {
    federalBreakEven: credits.federalSpousalAmountMax,
    provincialBreakEven: credits.provincialSpousalAmountMax,
    currentSpouseNetIncome: round2(clampNonNegative(spouseNetIncome)),
    federalAmountLost: round2(
      Math.min(credits.federalSpousalAmountMax, clampNonNegative(spouseNetIncome))
    ),
    provincialAmountLost: round2(
      Math.min(credits.provincialSpousalAmountMax, clampNonNegative(spouseNetIncome))
    ),
    marginalCostPer1k: round2(1000 * (credits.federalLowestRate + credits.provincialLowestRate)),
  };
}

function tuitionUsedAgainstOwnTax(
  person: TaxPersonInput,
  contributions: TaxScenarioPersonOverrides,
  rules: TaxRuleSet
): { federalUsed: number; provincialUsed: number; federalUnused: number; provincialUnused: number } {
  const computationWithoutTuition = (() => {
    const totalIncomeAmount = totalIncome(person);
    const deductions =
      person.currentYearRrspContributions +
      person.currentYearFhsaContributions +
      contributions.fhsa +
      contributions.rrsp +
      contributions.spousalRrsp;
    const payroll = computePayroll(person, rules.payroll);
    const taxable = Math.max(0, totalIncomeAmount - deductions - payroll.totalDeduction);
    const grossFed = calculateBracketTax(taxable, rules.federalBrackets);
    const grossProv = calculateBracketTax(taxable, rules.provincialBrackets);
    const baseCredits = computeNonRefundableCredits({
      person: { ...person, tuitionCarryforwardFederal: 0, tuitionCarryforwardProvincial: 0 },
      taxableIncome: taxable,
      spouseNetIncome: 0,
      payroll,
      rules,
      tuition: EMPTY_TUITION_TRANSFER,
    });
    const fedRoom = clampNonNegative(grossFed - baseCredits.federal.totalCreditValue);
    const provRoom = clampNonNegative(grossProv - baseCredits.provincial.totalCreditValue);
    return { fedRoom, provRoom };
  })();

  const federalAvailable = person.currentYearTuitionPaid + person.tuitionCarryforwardFederal;
  const provincialAvailable = person.currentYearTuitionPaid + person.tuitionCarryforwardProvincial;
  const federalNeededAmount = computationWithoutTuition.fedRoom / rules.credits.federalLowestRate;
  const provincialNeededAmount =
    computationWithoutTuition.provRoom / rules.credits.provincialLowestRate;
  const federalUsed = Math.min(federalAvailable, federalNeededAmount);
  const provincialUsed = Math.min(provincialAvailable, provincialNeededAmount);

  return {
    federalUsed: round2(federalUsed),
    provincialUsed: round2(provincialUsed),
    federalUnused: round2(Math.max(0, federalAvailable - federalUsed)),
    provincialUnused: round2(Math.max(0, provincialAvailable - provincialUsed)),
  };
}

function optimizeTuitionTransfer(
  plan: TaxPlanInput,
  contributions: TaxScenarioOverrides,
  rules: TaxRuleSet
): TuitionTransferDetail | null {
  const candidates: TuitionTransferDetail[] = [];

  for (const donorKey of PERSON_KEYS) {
    const recipientKey = getOtherPerson(donorKey);
    const donor = plan[donorKey];
    const recipient = plan[recipientKey];
    if (donor.currentYearTuitionPaid <= 0 && donor.tuitionCarryforwardFederal <= 0) continue;

    const tuitionRoom = tuitionUsedAgainstOwnTax(donor, contributions[donorKey], rules);
    const transferableFederalCurrentYear = Math.max(
      0,
      Math.min(donor.currentYearTuitionPaid, tuitionRoom.federalUnused)
    );
    const transferableProvincialCurrentYear = Math.max(
      0,
      Math.min(donor.currentYearTuitionPaid, tuitionRoom.provincialUnused)
    );

    const recommendedFederal = Math.min(
      transferableFederalCurrentYear,
      rules.credits.federalTuitionTransferCap
    );
    const recommendedProvincial = Math.min(
      transferableProvincialCurrentYear,
      rules.credits.provincialTuitionTransferCap
    );
    if (recommendedFederal <= 0 && recommendedProvincial <= 0) continue;

    const recipientWithoutTransfer = computeTaxForPerson({
      person: recipient,
      contributions: contributions[recipientKey],
      spouseNetIncome: 0,
      rules,
      tuition: EMPTY_TUITION_TRANSFER,
    });
    const recipientWithTransfer = computeTaxForPerson({
      person: recipient,
      contributions: contributions[recipientKey],
      spouseNetIncome: 0,
      rules,
      tuition: { federalReceived: recommendedFederal, provincialReceived: recommendedProvincial },
    });
    const taxSaved =
      recipientWithoutTransfer.netFederalTax +
      recipientWithoutTransfer.netProvincialTax -
      (recipientWithTransfer.netFederalTax + recipientWithTransfer.netProvincialTax);

    if (taxSaved <= 0) continue;

    candidates.push({
      donor: donorKey,
      recipient: recipientKey,
      recommendedFederalAmount: round2(recommendedFederal),
      recommendedProvincialAmount: round2(recommendedProvincial),
      carryForwardFederal: round2(
        donor.tuitionCarryforwardFederal +
          Math.max(0, donor.currentYearTuitionPaid - recommendedFederal) -
          tuitionRoom.federalUsed
      ),
      carryForwardProvincial: round2(
        donor.tuitionCarryforwardProvincial +
          Math.max(0, donor.currentYearTuitionPaid - recommendedProvincial) -
          tuitionRoom.provincialUsed
      ),
      taxSaved: round2(taxSaved),
    });
  }

  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.taxSaved - a.taxSaved)[0];
}

function buildPersonResult(args: {
  plan: TaxPlanInput;
  personKey: TaxPersonKey;
  contributions: TaxScenarioOverrides;
  rules: TaxRuleSet;
  spouseNetIncome: number;
  tuition: TuitionTransferContext;
  refundableCredit: number;
  computationBefore: FullTaxComputation;
  computationAfter: FullTaxComputation;
}): TaxPersonResult {
  const {
    plan,
    personKey,
    contributions,
    rules,
    refundableCredit,
    computationBefore,
    computationAfter,
  } = args;
  const person = plan[personKey];
  const personContributions = contributions[personKey];
  const remainingRooms = getRemainingRooms(plan, personKey, contributions);
  const receivedSpousalRrsp =
    personKey === 'personA' ? contributions.personB.spousalRrsp : contributions.personA.spousalRrsp;
  const rrspBalance =
    person.currentPersonalRrspBalance +
    person.currentSpousalRrspBalance +
    personContributions.rrsp +
    receivedSpousalRrsp;
  const hbpCapacity =
    person.firstTimeHomeBuyerEligible && person.currentHbpBalance <= 0
      ? Math.min(rules.hbpWithdrawalLimit, rrspBalance)
      : 0;

  const estimatedTaxBefore = computationBefore.netFederalTax + computationBefore.netProvincialTax;
  const estimatedTaxAfter = computationAfter.netFederalTax + computationAfter.netProvincialTax;

  return {
    name: person.name,
    totalIncome: round2(totalIncome(person)),
    taxableIncomeBefore: round2(computationBefore.taxableIncome),
    taxableIncomeAfter: round2(computationAfter.taxableIncome),
    estimatedTaxBefore: round2(estimatedTaxBefore),
    estimatedTaxAfter: round2(estimatedTaxAfter),
    estimatedTaxSavings: round2(estimatedTaxBefore - estimatedTaxAfter),
    marginalRateAfter: round2(getMarginalRate(computationAfter.taxableIncome, rules) * 100),
    contributions: {
      fhsa: round2(personContributions.fhsa),
      rrsp: round2(personContributions.rrsp),
      spousalRrsp: round2(personContributions.spousalRrsp),
      tfsa: round2(personContributions.tfsa),
    },
    remainingRooms: {
      rrsp: round2(remainingRooms.rrsp),
      fhsa: round2(remainingRooms.fhsa),
      tfsa: round2(remainingRooms.tfsa),
    },
    hbpCapacity: round2(hbpCapacity),
    fhsaWithdrawalCapacity: round2(
      person.firstTimeHomeBuyerEligible ? person.currentFhsaBalance + personContributions.fhsa : 0
    ),
    tfsaEndingBalance: round2(person.currentTfsaBalance + personContributions.tfsa),
    payroll: computationAfter.payroll,
    federalCredits: computationAfter.credits.federal,
    provincialCredits: computationAfter.credits.provincial,
    grossFederalTax: round2(computationAfter.grossFederalTax),
    grossProvincialTax: round2(computationAfter.grossProvincialTax),
    netFederalTax: round2(computationAfter.netFederalTax),
    netProvincialTax: round2(computationAfter.netProvincialTax),
    refundableCredits: round2(refundableCredit),
    federalBracketBreakdownBefore: computeBracketBreakdown(computationBefore.taxableIncome, rules.federalBrackets),
    federalBracketBreakdownAfter: computeBracketBreakdown(computationAfter.taxableIncome, rules.federalBrackets),
    provincialBracketBreakdownBefore: computeBracketBreakdown(computationBefore.taxableIncome, rules.provincialBrackets),
    provincialBracketBreakdownAfter: computeBracketBreakdown(computationAfter.taxableIncome, rules.provincialBrackets),
    bracketThresholdInsight: computeBracketThresholdInsight(computationAfter.taxableIncome, rules),
  };
}

function applyMonthlySalaryProjection(person: TaxPersonInput): TaxPersonInput {
  if (
    person.monthlySalary &&
    person.monthlySalary > 0 &&
    person.monthsEmployedThisYear > 0 &&
    person.monthsEmployedThisYear < 12
  ) {
    const projected = person.monthlySalary * person.monthsEmployedThisYear;
    if (projected > 0 && Math.abs(projected - person.employmentIncome) > 0.01) {
      return { ...person, employmentIncome: round2(projected) };
    }
  }
  return person;
}

function normalizePlan(plan: TaxPlanInput): TaxPlanInput {
  return {
    ...plan,
    personA: applyMonthlySalaryProjection(plan.personA),
    personB: applyMonthlySalaryProjection(plan.personB),
  };
}

export function calculateTaxPlanResult(
  rawPlan: TaxPlanInput,
  scenario: TaxPlanScenarioInput
): TaxOptimizationResult {
  const plan = normalizePlan(rawPlan);
  const context = createContext(plan);
  const rules = context.rules;
  const mode = scenario.mode;
  const contributions =
    mode === 'manual'
      ? scenario.overrides ?? buildEmptyScenarioOverrides()
      : optimizeScenarioContributions(context, mode === 'recommended' ? 'balanced' : mode);

  const emptyContributions = buildEmptyScenarioOverrides();

  const baselineNetIncomeA = computeTaxForPerson({
    person: plan.personA,
    contributions: emptyContributions.personA,
    spouseNetIncome: 0,
    rules,
    tuition: EMPTY_TUITION_TRANSFER,
  });
  const baselineNetIncomeB = computeTaxForPerson({
    person: plan.personB,
    contributions: emptyContributions.personB,
    spouseNetIncome: 0,
    rules,
    tuition: EMPTY_TUITION_TRANSFER,
  });

  const tuitionRecommendation = optimizeTuitionTransfer(plan, contributions, rules);
  const tuitionForA: TuitionTransferContext =
    tuitionRecommendation && tuitionRecommendation.recipient === 'personA'
      ? {
          federalReceived: tuitionRecommendation.recommendedFederalAmount,
          provincialReceived: tuitionRecommendation.recommendedProvincialAmount,
        }
      : EMPTY_TUITION_TRANSFER;
  const tuitionForB: TuitionTransferContext =
    tuitionRecommendation && tuitionRecommendation.recipient === 'personB'
      ? {
          federalReceived: tuitionRecommendation.recommendedFederalAmount,
          provincialReceived: tuitionRecommendation.recommendedProvincialAmount,
        }
      : EMPTY_TUITION_TRANSFER;

  const computationBeforeA = computeTaxForPerson({
    person: plan.personA,
    contributions: emptyContributions.personA,
    spouseNetIncome: baselineNetIncomeB.taxableIncome,
    rules,
    tuition: EMPTY_TUITION_TRANSFER,
  });
  const computationBeforeB = computeTaxForPerson({
    person: plan.personB,
    contributions: emptyContributions.personB,
    spouseNetIncome: baselineNetIncomeA.taxableIncome,
    rules,
    tuition: EMPTY_TUITION_TRANSFER,
  });

  const computationAfterA = computeTaxForPerson({
    person: plan.personA,
    contributions: contributions.personA,
    spouseNetIncome: baselineNetIncomeB.taxableIncome,
    rules,
    tuition: tuitionForA,
  });
  const computationAfterB = computeTaxForPerson({
    person: plan.personB,
    contributions: contributions.personB,
    spouseNetIncome: baselineNetIncomeA.taxableIncome,
    rules,
    tuition: tuitionForB,
  });

  const familyNetIncome = computationAfterA.taxableIncome + computationAfterB.taxableIncome;
  const refundable = computeRefundableCredits({ plan, rules, familyNetIncome });

  const people: Record<TaxPersonKey, TaxPersonResult> = {
    personA: buildPersonResult({
      plan,
      personKey: 'personA',
      contributions,
      rules,
      spouseNetIncome: baselineNetIncomeB.taxableIncome,
      tuition: tuitionForA,
      refundableCredit: refundable.personA,
      computationBefore: computationBeforeA,
      computationAfter: computationAfterA,
    }),
    personB: buildPersonResult({
      plan,
      personKey: 'personB',
      contributions,
      rules,
      spouseNetIncome: baselineNetIncomeA.taxableIncome,
      tuition: tuitionForB,
      refundableCredit: refundable.personB,
      computationBefore: computationBeforeB,
      computationAfter: computationAfterB,
    }),
  };

  const homeFunding = buildHomeFundingProjection(
    plan,
    contributions,
    context.rules,
    context.monthsToPurchase
  );
  const warnings = buildWarnings(plan, contributions, homeFunding);
  const recommendations =
    mode === 'manual'
      ? buildManualRecommendations(plan, mode, contributions)
      : mergeRecommendations(plan, mode, contributions);

  const totalContribution = recommendations.reduce((sum, item) => sum + item.amount, 0);
  const deductibleContribution = recommendations.reduce(
    (sum, item) => sum + (item.bucket === 'tfsa' ? 0 : item.amount),
    0
  );
  const estimatedTaxBefore = round2(
    people.personA.estimatedTaxBefore + people.personB.estimatedTaxBefore
  );
  const estimatedTaxAfter = round2(
    people.personA.estimatedTaxAfter + people.personB.estimatedTaxAfter
  );
  const estimatedTaxSavings = round2(estimatedTaxBefore - estimatedTaxAfter);
  const fhsaUsed = round2(
    recommendations.filter(item => item.bucket === 'fhsa').reduce((sum, item) => sum + item.amount, 0)
  );
  const tfsaEndingBalance = round2(
    people.personA.tfsaEndingBalance + people.personB.tfsaEndingBalance
  );
  const totalRefundable = round2(refundable.personA + refundable.personB);
  const familyNetTaxBefore = estimatedTaxBefore;
  const familyNetTaxAfter = round2(estimatedTaxAfter - totalRefundable);
  const familyNetTaxDelta = round2(familyNetTaxBefore - familyNetTaxAfter);

  const spousalBreakEven = computeSpousalAmountBreakEven(plan, rules, baselineNetIncomeB.taxableIncome);

  return {
    mode,
    summary: {
      totalContribution: round2(totalContribution),
      deductibleContribution: round2(deductibleContribution),
      estimatedTaxBefore,
      estimatedTaxAfter,
      estimatedTaxSavings,
      projectedRefundReduction: estimatedTaxSavings,
      totalProjectedHomeFunds: homeFunding.totalProjectedHomeFunds,
      fhsaUsed,
      hbpCapacityUsed: homeFunding.hbpAccessible,
      tfsaEndingBalance,
      shortfall: homeFunding.shortfall,
      warningsCount: warnings.length,
      familyNetTaxBefore,
      familyNetTaxAfter,
      familyNetTaxDelta,
      totalRefundableCredits: totalRefundable,
    },
    homeFunding,
    people,
    recommendations,
    warnings,
    spousalBreakEven,
    tuitionTransfer: tuitionRecommendation,
  };
}

export {
  calculateBracketTax,
  computeNonRefundableCredits,
  computeRefundableCredits,
  computeSpousalAmountBreakEven,
  computeTaxForPerson,
  optimizeTuitionTransfer,
  projectedAnnualEmploymentIncome,
};
