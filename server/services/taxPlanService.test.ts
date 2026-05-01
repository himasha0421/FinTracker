import { describe, expect, it } from 'vitest';
import { buildDefaultTaxPlanInput } from '@shared/taxPlanning';
import { MemoryStorage } from '../storage/memory';
import { TaxPlanService } from './taxPlanService';

describe('TaxPlanService', () => {
  it('creates a plan with the default scenario set and hydrates results', async () => {
    const service = new TaxPlanService(new MemoryStorage());

    const bundle = await service.createPlan(buildDefaultTaxPlanInput());

    expect(bundle.plan.name).toBe('Winnipeg Couple Plan');
    expect(bundle.scenarios).toHaveLength(5);
    expect(bundle.scenarios[0]?.result.summary.estimatedTaxSavings).toBeGreaterThanOrEqual(0);
  });

  it('recomputes scenario ordering when plan income changes', async () => {
    const service = new TaxPlanService(new MemoryStorage());
    const created = await service.createPlan(buildDefaultTaxPlanInput());

    const updated = await service.updatePlan(created.plan.id, {
      ...created.plan,
      personA: {
        ...created.plan.personA,
        employmentIncome: 140000,
      },
      personB: {
        ...created.plan.personB,
        employmentIncome: 0,
      },
    });

    expect(updated).toBeDefined();
    expect(updated!.scenarios.some(scenario => scenario.result.recommendations.length > 0)).toBe(true);
  });

  it('returns the scenario comparison response shape after a manual scenario update', async () => {
    const service = new TaxPlanService(new MemoryStorage());
    const created = await service.createPlan(buildDefaultTaxPlanInput());
    const manual = created.scenarios.find(scenario => scenario.mode === 'manual');

    expect(manual).toBeDefined();

    const updated = await service.updateScenario(created.plan.id, manual!.id, {
      name: 'Manual',
      mode: 'manual',
      overrides: {
        personA: { fhsa: 2000, rrsp: 1000, spousalRrsp: 0, tfsa: 500 },
        personB: { fhsa: 1000, rrsp: 0, spousalRrsp: 500, tfsa: 0 },
      },
    });

    expect(updated).toBeDefined();
    expect(updated!.scenarios.some(scenario => scenario.name === 'Manual')).toBe(true);
    expect(updated!.scenarios.every(scenario => typeof scenario.result.summary.warningsCount === 'number')).toBe(true);
  });
});
