import { insertFinancialGoalSchema } from '@shared/schema';
import type { IStorage } from '../storage';

function normalizeGoalPayload(payload: any) {
  const data = { ...payload };
  let linkedAccountIds: number[] | undefined;
  if (Array.isArray(data.linkedAccountIds)) {
    linkedAccountIds = data.linkedAccountIds
      .map((value: any) => Number(value))
      .filter(value => !Number.isNaN(value));
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

export class GoalService {
  constructor(private storage: IStorage) {}

  listGoals() {
    return this.storage.getFinancialGoals();
  }

  getGoal(id: number) {
    return this.storage.getFinancialGoal(id);
  }

  createGoal(payload: unknown) {
    const { data, linkedAccountIds } = normalizeGoalPayload(payload);
    const parsed = insertFinancialGoalSchema.parse(data);
    return this.storage.createFinancialGoal(parsed, linkedAccountIds);
  }

  updateGoal(id: number, payload: unknown) {
    const { data, linkedAccountIds } = normalizeGoalPayload(payload);
    const parsed = insertFinancialGoalSchema.partial().parse(data);
    return this.storage.updateFinancialGoal(id, parsed, linkedAccountIds);
  }

  deleteGoal(id: number) {
    return this.storage.deleteFinancialGoal(id);
  }
}
