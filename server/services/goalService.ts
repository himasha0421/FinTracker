import { insertFinancialGoalSchema } from '@shared/schema';
import type { IStorage } from '../storage';

function normalizeGoalPayload(payload: any) {
  const data = { ...payload };
  if (data.targetDate && typeof data.targetDate === 'string') {
    const [year, month, day] = data.targetDate.split('-').map(Number);
    if (year && month && day) {
      data.targetDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
    } else {
      data.targetDate = new Date(data.targetDate);
    }
  }
  return data;
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
    const data = insertFinancialGoalSchema.parse(normalizeGoalPayload(payload));
    return this.storage.createFinancialGoal(data);
  }

  updateGoal(id: number, payload: unknown) {
    const data = insertFinancialGoalSchema.partial().parse(normalizeGoalPayload(payload));
    return this.storage.updateFinancialGoal(id, data);
  }

  deleteGoal(id: number) {
    return this.storage.deleteFinancialGoal(id);
  }
}
