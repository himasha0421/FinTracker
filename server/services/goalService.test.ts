import { describe, expect, it } from 'vitest';
import { MemoryStorage } from '../storage/memory';
import { GoalService } from './goalService';
import { AccountService } from './accountService';

function baseGoalPayload(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Home Down Payment',
    description: '',
    targetAmount: '112500',
    currentAmount: '0',
    targetDate: '2028-06-01',
    status: 'in-progress',
    icon: 'target',
    color: 'blue',
    ...overrides,
  };
}

const validHomePurchaseDetails = {
  targetHomePrice: 450000,
  downPaymentPercent: 20,
  closingCostsEstimate: 1500,
  contributors: [
    { personKey: 'personA', monthlyTargetAmount: 1250 },
    { personKey: 'personB', monthlyTargetAmount: 2500 },
  ],
};

describe('GoalService', () => {
  it('creates a generic goal with no homePurchaseDetails in the response', async () => {
    const service = new GoalService(new MemoryStorage());

    const goal = await service.createGoal(baseGoalPayload({ type: 'generic' }));

    expect(goal.type).toBe('generic');
    expect(goal.homePurchaseDetails).toBeNull();
  });

  it('creates a home-purchase goal with valid contributors', async () => {
    const service = new GoalService(new MemoryStorage());

    const goal = await service.createGoal(
      baseGoalPayload({ type: 'home-purchase', homePurchaseDetails: validHomePurchaseDetails })
    );

    expect(goal.type).toBe('home-purchase');
    expect(goal.homePurchaseDetails).toEqual(validHomePurchaseDetails);
  });

  it('rejects a home-purchase goal missing homePurchaseDetails', async () => {
    const service = new GoalService(new MemoryStorage());

    await expect(
      service.createGoal(baseGoalPayload({ type: 'home-purchase' }))
    ).rejects.toThrow();
  });

  it('clears homePurchaseDetails when a goal is switched back to generic via PATCH', async () => {
    const service = new GoalService(new MemoryStorage());
    const goal = await service.createGoal(
      baseGoalPayload({ type: 'home-purchase', homePurchaseDetails: validHomePurchaseDetails })
    );

    const updated = await service.updateGoal(goal.id, { type: 'generic' });

    expect(updated?.type).toBe('generic');
    expect(updated?.homePurchaseDetails).toBeNull();
  });

  it('computes a bucketBreakdown grouped by registeredType and ownerPersonKey', async () => {
    const storage = new MemoryStorage();
    const goalService = new GoalService(storage);
    const accountService = new AccountService(storage);

    const accountA = await accountService.createAccount({
      name: 'FHSA - Partner A',
      type: 'investment',
      balance: '3000',
      registeredType: 'fhsa',
      ownerPersonKey: 'personA',
    });
    const accountB = await accountService.createAccount({
      name: 'FHSA - Partner A (second)',
      type: 'investment',
      balance: '2000',
      registeredType: 'fhsa',
      ownerPersonKey: 'personA',
    });
    const accountC = await accountService.createAccount({
      name: 'TFSA - Partner B',
      type: 'investment',
      balance: '5000',
      registeredType: 'tfsa',
      ownerPersonKey: 'personB',
    });

    const goal = await goalService.createGoal(
      baseGoalPayload({
        type: 'home-purchase',
        homePurchaseDetails: validHomePurchaseDetails,
        linkedAccountIds: [accountA.id, accountB.id, accountC.id],
      })
    );

    expect(goal.bucketBreakdown).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ registeredType: 'fhsa', ownerPersonKey: 'personA', totalBalance: 5000 }),
        expect.objectContaining({ registeredType: 'tfsa', ownerPersonKey: 'personB', totalBalance: 5000 }),
      ])
    );
    expect(goal.bucketBreakdown).toHaveLength(2);
  });
});
