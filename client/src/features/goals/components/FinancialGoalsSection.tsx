import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { goalStatusColours, goalIconColourClasses } from '@/design/tokens';
import { CardFooter } from '@/components/ui/card';
import { SectionCard, SectionCardContent } from '@/components/composed/SectionCard';
import { EmptyState } from '@/components/composed/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Plus, Calendar, Shield, TrendingUp, CreditCard, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import GoalForm from '@/features/goals/components/GoalForm';
import { goalsListQuery } from '@/features/goals/api';
import type { GoalResponse } from '@/features/goals/api';
import { formatCurrencyRounded } from '@/lib/formatters';

const goalIcons: Record<string, JSX.Element> = {
  shield: <Shield className="h-4 w-4" />,
  'trending-up': <TrendingUp className="h-4 w-4" />,
  'credit-card': <CreditCard className="h-4 w-4" />,
};

const statusLabels: Record<string, string> = {
  'in-progress': 'In-progress',
  completed: 'Completed',
  pending: 'Pending',
};

type GoalCardProps = { goal: GoalResponse; onEdit: (goal: GoalResponse) => void };

const GoalCard = ({ goal, onEdit }: GoalCardProps) => {
  const targetAmountValue = Number(goal.targetAmount) || 0;
  const linkedAccounts = goal.linkedAccounts ?? [];
  const trackedAmount = linkedAccounts.length
    ? linkedAccounts.reduce((sum, account) => sum + Number(account.balance), 0)
    : Number(goal.currentAmount);
  const progress = targetAmountValue > 0
    ? Math.min(100, Math.round((trackedAmount / targetAmountValue) * 100))
    : 0;

  const accountWord = linkedAccounts.length === 1 ? 'account' : 'accounts';
  const iconKey = goal.icon ?? 'shield';
  const colorKey = goal.color ?? 'blue';
  const statusKey = goal.status ?? 'in-progress';
  const iconColorClass = goalIconColourClasses[colorKey] ?? goalIconColourClasses.blue;
  const statusClass = goalStatusColours[statusKey] ?? goalStatusColours['in-progress'];
  const statusLabel = statusLabels[statusKey] || 'In Progress';
  const formattedTargetDate = format(new Date(goal.targetDate), 'MMM yyyy');

  return (
    <SectionCard hover={false}>
      <SectionCardContent className="pt-6 px-5">
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center">
            <div className={`mr-3 flex h-8 w-8 items-center justify-center rounded-full bg-opacity-20 ${iconColorClass}`}>
              {goalIcons[iconKey] || goalIcons.shield}
            </div>
            <h3 className="font-semibold">{goal.name}</h3>
          </div>
          <span className={`rounded-full px-2 py-1 text-xs font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <p className="mb-4 text-sm text-muted-foreground">
          {goal.description || 'No description provided.'}
        </p>

        <div className="mb-3">
          <div className="mb-1 flex justify-between text-sm">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="mb-3 space-y-2 text-sm text-muted-foreground">
          <div>
            <span className="font-mono font-medium text-foreground">{formatCurrencyRounded(trackedAmount)}</span>{' '}
            {linkedAccounts.length > 0
              ? `saved across ${linkedAccounts.length} ${accountWord}`
              : 'saved'}
          </div>
          <div>
            <span className="font-mono font-medium text-foreground">{formatCurrencyRounded(targetAmountValue)}</span>{' '}
            target
          </div>
          {linkedAccounts.length > 0 && (
            <p className="text-xs text-muted-foreground">
              Linked to {linkedAccounts.map(a => a.name).slice(0, 2).join(', ')}
              {linkedAccounts.length > 2 ? '…' : ''}. Progress updates automatically.
            </p>
          )}
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="mr-1 h-4 w-4" />
          Target: {formattedTargetDate}
        </div>
      </SectionCardContent>

      <CardFooter className="pt-0 px-5 pb-4">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(goal)}
        >
          <ExternalLink className="mr-1 h-4 w-4" />
          View Details
        </Button>
      </CardFooter>
    </SectionCard>
  );
};

const GoalCardSkeleton = () => (
  <SectionCard hover={false}>
    <SectionCardContent className="pt-6 px-5">
      <div className="mb-4 flex items-start justify-between">
        <div className="flex items-center">
          <Skeleton className="mr-3 h-8 w-8 rounded-full" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="mb-4 h-4 w-full" />
      <Skeleton className="mb-3 h-2 w-full rounded-full" />
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="h-4 w-32" />
    </SectionCardContent>
  </SectionCard>
);

export default function FinancialGoals() {
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalResponse | null>(null);

  const { data: goals, isLoading } = useQuery(goalsListQuery());

  const handleAddGoal = () => { setEditingGoal(null); setIsGoalFormOpen(true); };
  const handleEditGoal = (goal: GoalResponse) => { setEditingGoal(goal); setIsGoalFormOpen(true); };
  const handleFormClose = () => { setIsGoalFormOpen(false); setEditingGoal(null); };

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Financial Goals</h2>
          <Button variant="ghost" size="sm" className="text-primary hover:text-primary/90" onClick={handleAddGoal}>
            <Plus className="mr-1 h-4 w-4" />
            Add Goal
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {isLoading && Array.from({ length: 3 }, (_, i) => <GoalCardSkeleton key={`skel-${i}`} />)}
          {!isLoading && goals && goals.length > 0 && goals.map(goal => (
            <GoalCard key={goal.id} goal={goal} onEdit={handleEditGoal} />
          ))}
          {!isLoading && (!goals || goals.length === 0) && (
            <div className="col-span-full">
              <EmptyState text='No financial goals yet. Click "Add Goal" to create your first one.' />
            </div>
          )}
        </div>
      </div>

      <GoalForm isOpen={isGoalFormOpen} onClose={handleFormClose} goal={editingGoal} />
    </>
  );
}
