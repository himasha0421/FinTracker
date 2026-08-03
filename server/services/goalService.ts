import { z } from 'zod';
import { insertFinancialGoalSchema, type InsertFinancialGoal } from '@shared/schema';
import { GOAL_TYPES, homePurchaseGoalDetailsSchema, type GoalType } from '@shared/goals';
import type { IStorage } from '../storage';

const goalTypeSchema = z.enum(GOAL_TYPES);

function normalizeGoalPayload(payload: any) {
  const data = { ...payload };
  let linkedAccountIds: number[] | undefined;
  if (Array.isArray(data.linkedAccountIds)) {
    linkedAccountIds = data.linkedAccountIds
      .map((value: unknown) => Number(value))
      .filter((value: number) => !Number.isNaN(value));
  }
  delete data.linkedAccountIds;

  if (data.targetDate && typeof data.targetDate === 'string') {
    const [year, month, day] = data.targetDate.split('-').map(Number);
    if (year && month && day) {
      data.targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      data.targetDate = new Date(data.targetDate);
    }
  }
  return { data, linkedAccountIds };
}

// Keeps stale home-purchase data from lingering on a goal that isn't (or is
// no longer) type 'home-purchase' — always null unless the type matches.
function normalizeHomePurchaseDetails(type: GoalType, details: unknown) {
  if (type !== 'home-purchase') {
    return null;
  }
  return homePurchaseGoalDetailsSchema.parse(details);
}

export class GoalService {
  constructor(private storage: IStorage) {}

  listGoals() {
    return this.storage.getFinancialGoals();
  }

  getGoal(id: number) {
    return this.storage.getFinancialGoal(id);
  }

  async createGoal(payload: unknown) {
    const { data, linkedAccountIds } = normalizeGoalPayload(payload);
    const parsed = insertFinancialGoalSchema.parse(data);
    const type = goalTypeSchema.parse(parsed.type ?? 'generic');
    const homePurchaseDetails = normalizeHomePurchaseDetails(type, parsed.homePurchaseDetails);
    return this.storage.createFinancialGoal({ ...parsed, type, homePurchaseDetails }, linkedAccountIds);
  }

  async updateGoal(id: number, payload: unknown) {
    const { data, linkedAccountIds } = normalizeGoalPayload(payload);
    const parsed = insertFinancialGoalSchema.partial().parse(data) as Partial<InsertFinancialGoal>;

    if ('type' in parsed || 'homePurchaseDetails' in parsed) {
      const existing = await this.storage.getFinancialGoal(id);
      const effectiveType = goalTypeSchema.parse(parsed.type ?? existing?.type ?? 'generic');
      const effectiveDetails =
        'homePurchaseDetails' in parsed ? parsed.homePurchaseDetails : existing?.homePurchaseDetails;
      parsed.homePurchaseDetails = normalizeHomePurchaseDetails(effectiveType, effectiveDetails);
      if ('type' in parsed) {
        parsed.type = effectiveType;
      }
    }

    return this.storage.updateFinancialGoal(id, parsed, linkedAccountIds);
  }

  deleteGoal(id: number) {
    return this.storage.deleteFinancialGoal(id);
  }
}
