import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Plus, Calendar, Shield, TrendingUp, CreditCard, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import GoalForm from '@/features/goals/components/GoalForm';
import { goalsListQuery } from '@/features/goals/api';
import type { GoalResponse } from '@/features/goals/api';

// Map of goal icons
const goalIcons: Record<string, JSX.Element> = {
  shield: <Shield className="h-4 w-4" />,
  'trending-up': <TrendingUp className="h-4 w-4" />,
  'credit-card': <CreditCard className="h-4 w-4" />,
};

const statusClasses: Record<string, string> = {
  'in-progress': 'bg-blue-500 bg-opacity-20 text-blue-400',
  completed: 'bg-green-500 bg-opacity-20 text-green-400',
  pending: 'bg-yellow-500 bg-opacity-20 text-yellow-400',
};

const statusLabels: Record<string, string> = {
  'in-progress': 'In-progress',
  completed: 'Completed',
  pending: 'Pending',
};

const colorClasses: Record<string, string> = {
  blue: 'bg-blue-500 text-blue-400',
  green: 'bg-green-500 text-green-400',
  yellow: 'bg-yellow-500 text-yellow-400',
  purple: 'bg-purple-500 text-purple-400',
  red: 'bg-red-500 text-red-400',
};

type GoalCardProps = {
  goal: GoalResponse;
  onEdit: (goal: GoalResponse) => void;
};

const GoalCard = ({ goal, onEdit }: GoalCardProps) => {
  const targetAmountValue = Number(goal.targetAmount) || 0;
  const linkedAccounts = goal.linkedAccounts ?? [];
  const trackedAmount = linkedAccounts.length
    ? linkedAccounts.reduce((sum, account) => sum + Number(account.balance), 0)
    : Number(goal.currentAmount);
  const progress =
    targetAmountValue > 0 ? Math.min(100, Math.round((trackedAmount / targetAmountValue) * 100)) : 0;

  const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

  const formattedTargetAmount = currencyFormatter.format(targetAmountValue);
  const formattedTrackedAmount = currencyFormatter.format(trackedAmount);

  const targetDate = new Date(goal.targetDate);
  const formattedTargetDate = format(targetDate, 'MMM yyyy');

  const iconKey = goal.icon ?? 'shield';
  const colorKey = goal.color ?? 'blue';
  const statusKey = goal.status ?? 'in-progress';
  const iconColorClass = colorClasses[colorKey] || colorClasses.blue;
  const statusClass = statusClasses[statusKey] || statusClasses['in-progress'];
  const statusLabel = statusLabels[statusKey] || 'In Progress';

  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full ${iconColorClass} bg-opacity-20 flex items-center justify-center mr-3`}
            >
              {goalIcons[iconKey] || goalIcons.shield}
            </div>
            <h3 className="font-semibold">{goal.name}</h3>
          </div>
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}>
            {statusLabel}
          </span>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          {goal.description || 'No description provided.'}
        </p>

        <div className="mb-3">
          <div className="flex justify-between text-sm mb-1">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="space-y-2 mb-3 text-sm text-muted-foreground">
          <div>
            <span className="font-mono font-medium text-foreground">{formattedTrackedAmount}</span>{' '}
            saved
            {linkedAccounts.length > 0
              ? ` across ${linkedAccounts.length} account${linkedAccounts.length === 1 ? '' : 's'}`
              : ''}
          </div>
          <div>
            <span className="font-mono font-medium text-foreground">{formattedTargetAmount}</span>{' '}
            target
          </div>
          {linkedAccounts.length > 0 ? (
            <p className="text-xs text-muted-foreground">
              Linked to{' '}
              {linkedAccounts
                .map(account => account.name)
                .slice(0, 2)
                .join(', ')}
              {linkedAccounts.length > 2 ? '…' : ''}. Progress updates automatically.
            </p>
          ) : null}
        </div>

        <div className="flex items-center text-sm text-muted-foreground">
          <Calendar className="h-4 w-4 mr-1" />
          Target: {formattedTargetDate}
        </div>
      </CardContent>

      <CardFooter className="pt-0">
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(goal)}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

export default function FinancialGoals() {
  const [isGoalFormOpen, setIsGoalFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalResponse | null>(null);

  const { data: goals, isLoading } = useQuery(goalsListQuery());

  const handleAddGoal = () => {
    setEditingGoal(null);
    setIsGoalFormOpen(true);
  };

  const handleEditGoal = (goal: GoalResponse) => {
    setEditingGoal(goal);
    setIsGoalFormOpen(true);
  };

  const handleFormClose = () => {
    setIsGoalFormOpen(false);
    setEditingGoal(null);
  };

  return (
    <>
      <div className="mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Upcoming Events</h2>
          <Button
            variant="ghost"
            size="sm"
            className="text-primary hover:text-primary/90"
            onClick={handleAddGoal}
          >
            <Plus className="h-5 w-5 mr-1" />
            Add Goal
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <Skeleton className="w-8 h-8 rounded-full mr-3" />
                      <Skeleton className="w-24 h-5" />
                    </div>
                    <Skeleton className="w-16 h-5 rounded-full" />
                  </div>
                  <Skeleton className="w-full h-4 mb-4" />
                  <Skeleton className="w-full h-2 mb-3 rounded-full" />
                  <Skeleton className="w-24 h-4 mb-3" />
                  <Skeleton className="w-32 h-4" />
                </CardContent>
              </Card>
            ))
          ) : goals && goals.length > 0 ? (
            goals.map(goal => <GoalCard key={goal.id} goal={goal} onEdit={handleEditGoal} />)
          ) : (
            <div className="col-span-full py-10 text-center text-muted-foreground">
              No financial goals found. Click "Add Goal" to create your first financial goal.
            </div>
          )}
        </div>

      </div>

      <GoalForm isOpen={isGoalFormOpen} onClose={handleFormClose} goal={editingGoal} />
    </>
  );
}
