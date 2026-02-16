import type { FinancialGoal } from '@shared/schema';
import { asDate, round2, toNumber } from './shared';

function goalTargetDate(goal: FinancialGoal): string {
  return asDate(goal.targetDate).toISOString();
}

export function goalProgress(goal: FinancialGoal) {
  const targetAmount = toNumber(goal.targetAmount);
  const currentAmount = toNumber(goal.currentAmount);
  const progressPercent = targetAmount > 0 ? round2((currentAmount / targetAmount) * 100) : 0;
  const daysRemaining = Math.ceil(
    (asDate(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return {
    id: goal.id,
    name: goal.name,
    status: goal.status,
    targetAmount: round2(targetAmount),
    currentAmount: round2(currentAmount),
    progressPercent,
    targetDate: goalTargetDate(goal),
    daysRemaining,
  };
}
