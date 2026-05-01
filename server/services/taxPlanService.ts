import type { IStorage } from '../storage';
import type {
  InsertTaxPlan,
  InsertTaxPlanScenario,
  TaxPlan,
  TaxPlanScenario,
} from '@shared/schema';
import type {
  TaxHouseholdInput,
  TaxPersonInput,
  TaxPlanBundle,
  TaxPlanInput,
  TaxPlanScenarioInput,
  TaxScenarioOverrides,
} from '@shared/taxPlanning';
import {
  buildDefaultTaxPlanInput,
  buildEmptyScenarioOverrides,
  normalizeIsoDate,
  taxPlanInputSchema,
  taxPlanScenarioInputSchema,
} from '@shared/taxPlanning';
import { calculateTaxPlanResult } from './taxPlanning/engine';
import { projectMultiYear } from './taxPlanning/multiYear';

function withPersonDefaults(person: Partial<TaxPersonInput> & { name: string }): TaxPersonInput {
  return {
    name: person.name,
    employmentIncome: person.employmentIncome ?? 0,
    otherTaxableIncome: person.otherTaxableIncome ?? 0,
    rrspDeductionLimit: person.rrspDeductionLimit ?? 0,
    fhsaRoom: person.fhsaRoom ?? 0,
    tfsaRoom: person.tfsaRoom ?? 0,
    currentYearRrspContributions: person.currentYearRrspContributions ?? 0,
    currentYearFhsaContributions: person.currentYearFhsaContributions ?? 0,
    currentYearTfsaContributions: person.currentYearTfsaContributions ?? 0,
    employerRrspMatchCap: person.employerRrspMatchCap ?? 0,
    employerRrspMatchRate: person.employerRrspMatchRate ?? 0,
    firstTimeHomeBuyerEligible: person.firstTimeHomeBuyerEligible ?? true,
    currentHbpBalance: person.currentHbpBalance ?? 0,
    currentPersonalRrspBalance: person.currentPersonalRrspBalance ?? 0,
    currentSpousalRrspBalance: person.currentSpousalRrspBalance ?? 0,
    currentFhsaBalance: person.currentFhsaBalance ?? 0,
    currentTfsaBalance: person.currentTfsaBalance ?? 0,
    recentHbpRrspContributions: person.recentHbpRrspContributions ?? 0,
    monthsEmployedThisYear: person.monthsEmployedThisYear ?? 12,
    employmentStartMonth: person.employmentStartMonth ?? null,
    monthlySalary: person.monthlySalary ?? null,
    currentYearTuitionPaid: person.currentYearTuitionPaid ?? 0,
    tuitionCarryforwardFederal: person.tuitionCarryforwardFederal ?? 0,
    tuitionCarryforwardProvincial: person.tuitionCarryforwardProvincial ?? 0,
    spousalRrspContributionsLastThreeYears: person.spousalRrspContributionsLastThreeYears ?? 0,
  };
}

function withHouseholdDefaults(
  household: Partial<TaxHouseholdInput> & { targetPurchaseDate: string | null }
): TaxHouseholdInput {
  return {
    targetPurchaseDate: household.targetPurchaseDate ?? null,
    targetHomePrice: household.targetHomePrice ?? 0,
    desiredDownPayment: household.desiredDownPayment ?? 0,
    currentDownPaymentSavings: household.currentDownPaymentSavings ?? 0,
    monthlyAvailableSavings: household.monthlyAvailableSavings ?? 0,
    minimumCashReserve: household.minimumCashReserve ?? 0,
    bothRentingCurrently: household.bothRentingCurrently ?? true,
  };
}

function normalizePlanInput(payload: unknown): TaxPlanInput {
  const parsed = taxPlanInputSchema.parse(payload);
  return {
    ...parsed,
    household: {
      ...parsed.household,
      targetPurchaseDate: normalizeIsoDate(parsed.household.targetPurchaseDate),
    },
  };
}

function normalizeScenarioInput(payload: unknown): TaxPlanScenarioInput {
  const parsed = taxPlanScenarioInputSchema.parse(payload);
  return {
    ...parsed,
    overrides: parsed.overrides ?? null,
  };
}

function serializePlan(plan: TaxPlan): TaxPlanBundle['plan'] {
  return {
    id: plan.id,
    name: plan.name,
    taxYear: plan.taxYear,
    province: plan.province as 'MB',
    household: plan.household,
    personA: plan.personA,
    personB: plan.personB,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString(),
  };
}

function serializeScenario(
  scenario: TaxPlanScenario,
  plan: TaxPlan
): TaxPlanBundle['scenarios'][number] {
  const planInput: TaxPlanInput = {
    name: plan.name,
    taxYear: plan.taxYear,
    province: plan.province as 'MB',
    household: withHouseholdDefaults(plan.household as Partial<TaxHouseholdInput> & { targetPurchaseDate: string | null }),
    personA: withPersonDefaults(plan.personA as Partial<TaxPersonInput> & { name: string }),
    personB: withPersonDefaults(plan.personB as Partial<TaxPersonInput> & { name: string }),
  };
  const scenarioInput: TaxPlanScenarioInput = {
    name: scenario.name,
    mode: scenario.mode as TaxPlanScenarioInput['mode'],
    overrides: (scenario.overrides as TaxScenarioOverrides | null) ?? null,
  };

  const result = calculateTaxPlanResult(planInput, scenarioInput);
  const multiYear = projectMultiYear(planInput, scenarioInput);

  return {
    id: scenario.id,
    planId: scenario.planId,
    name: scenario.name,
    mode: scenario.mode as TaxPlanScenarioInput['mode'],
    overrides: (scenario.overrides as TaxScenarioOverrides | null) ?? null,
    createdAt: scenario.createdAt.toISOString(),
    updatedAt: scenario.updatedAt.toISOString(),
    result,
    multiYear,
  };
}

function toInsertPlan(payload: TaxPlanInput): InsertTaxPlan {
  return {
    name: payload.name,
    taxYear: payload.taxYear,
    province: payload.province,
    household: payload.household,
    personA: payload.personA,
    personB: payload.personB,
  };
}

function toInsertScenario(planId: number, payload: TaxPlanScenarioInput): InsertTaxPlanScenario {
  return {
    planId,
    name: payload.name,
    mode: payload.mode,
    overrides: payload.overrides ?? null,
  };
}

export class TaxPlanService {
  constructor(private storage: IStorage) {}

  async listPlans(): Promise<TaxPlanBundle[]> {
    const plans = await this.storage.getTaxPlans();
    const bundles = await Promise.all(plans.map(plan => this.getHydratedPlan(plan.id)));
    return bundles.filter((bundle): bundle is TaxPlanBundle => Boolean(bundle));
  }

  async getHydratedPlan(id: number): Promise<TaxPlanBundle | undefined> {
    const plan = await this.storage.getTaxPlan(id);
    if (!plan) return undefined;
    const scenarios = await this.storage.getTaxPlanScenarios(id);
    return {
      plan: serializePlan(plan),
      scenarios: scenarios.map(scenario => serializeScenario(scenario, plan)),
    };
  }

  async createPlan(payload: unknown): Promise<TaxPlanBundle> {
    const parsed = normalizePlanInput(payload);
    const created = await this.storage.createTaxPlan(toInsertPlan(parsed));
    await this.createDefaultScenarios(created.id);
    return (await this.getHydratedPlan(created.id))!;
  }

  async createDefaultPlan(): Promise<TaxPlanBundle> {
    return this.createPlan(buildDefaultTaxPlanInput());
  }

  async updatePlan(id: number, payload: unknown): Promise<TaxPlanBundle | undefined> {
    const parsed = normalizePlanInput(payload);
    const updated = await this.storage.updateTaxPlan(id, toInsertPlan(parsed));
    if (!updated) return undefined;
    return this.getHydratedPlan(id);
  }

  async deletePlan(id: number) {
    return this.storage.deleteTaxPlan(id);
  }

  async createScenario(planId: number, payload: unknown): Promise<TaxPlanBundle | undefined> {
    const plan = await this.storage.getTaxPlan(planId);
    if (!plan) return undefined;
    const parsed = normalizeScenarioInput(payload);
    await this.storage.createTaxPlanScenario(toInsertScenario(planId, parsed));
    return this.getHydratedPlan(planId);
  }

  async updateScenario(
    planId: number,
    scenarioId: number,
    payload: unknown
  ): Promise<TaxPlanBundle | undefined> {
    const scenario = await this.storage.getTaxPlanScenario(scenarioId);
    if (!scenario || scenario.planId !== planId) return undefined;
    const parsed = normalizeScenarioInput(payload);
    await this.storage.updateTaxPlanScenario(scenarioId, {
      name: parsed.name,
      mode: parsed.mode,
      overrides: parsed.overrides ?? null,
    });
    return this.getHydratedPlan(planId);
  }

  async deleteScenario(planId: number, scenarioId: number): Promise<TaxPlanBundle | undefined> {
    const scenario = await this.storage.getTaxPlanScenario(scenarioId);
    if (!scenario || scenario.planId !== planId) return undefined;
    await this.storage.deleteTaxPlanScenario(scenarioId);
    return this.getHydratedPlan(planId);
  }

  private async createDefaultScenarios(planId: number) {
    const defaults: TaxPlanScenarioInput[] = [
      { name: 'Recommended', mode: 'recommended' },
      { name: 'Balanced', mode: 'balanced' },
      { name: 'Tax Max', mode: 'tax-max' },
      { name: 'Home Max', mode: 'home-max' },
      { name: 'Manual', mode: 'manual', overrides: buildEmptyScenarioOverrides() },
    ];

    for (const scenario of defaults) {
      await this.storage.createTaxPlanScenario(toInsertScenario(planId, scenario));
    }
  }
}
