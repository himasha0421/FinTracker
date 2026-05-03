import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SectionCard, SectionCardHeader, SectionCardContent } from '@/components/composed/SectionCard';
import { transactionsListQuery } from '@/features/transactions/api';
import { useCategoryBudgets } from '@/features/budgets/hooks/useCategoryBudgets';
import { expenseCategoryOptions } from '@/features/transactions/constants';
import { statusColours } from '@/design/tokens';
import { formatCurrencyRounded } from '@/lib/formatters';

const BUDGET_YEAR = 2026;
const getYearBounds = (year: number) => ({
  start: new Date(year, 0, 1, 0, 0, 0, 0),
  end: new Date(year, 11, 31, 23, 59, 59, 999),
});

export default function CategoryBudgetPlannerCard() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [yearlyTarget, setYearlyTarget] = useState('');

  const { data: transactions, isLoading } = useQuery({
    ...transactionsListQuery(),
    staleTime: 30000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const expenseCategories = useMemo(() => {
    if (!transactions) return [] as string[];
    const categorySet = new Set<string>();
    transactions.forEach(tx => {
      if (tx.type === 'expense' && tx.category) categorySet.add(tx.category);
    });
    return Array.from(categorySet);
  }, [transactions]);

  const { budgets, updateBudget, addCategory, categories } = useCategoryBudgets(expenseCategories);

  const availableCategories = useMemo(() => {
    const existing = new Set(categories.map(c => c.toLowerCase()));
    return expenseCategoryOptions.filter(o => !existing.has(o.value.toLowerCase()));
  }, [categories]);

  const yearlyActuals = useMemo(() => {
    const totals: Record<string, number> = {};
    if (!transactions) return totals;
    const { start, end } = getYearBounds(BUDGET_YEAR);
    transactions.forEach(tx => {
      if (tx.type !== 'expense' || !tx.category) return;
      const date = new Date(tx.date);
      if (date < start || date > end) return;
      totals[tx.category] = (totals[tx.category] || 0) + Number(tx.amount);
    });
    return totals;
  }, [transactions]);

  const orderedBudgets = useMemo(() => {
    const budgetMap = new Map(budgets.map(entry => [entry.category, entry]));
    return categories.map(category => budgetMap.get(category) || { category, monthlyTarget: 0 });
  }, [budgets, categories]);

  const totalBudgetAllocation = useMemo(
    () => orderedBudgets.reduce((sum, entry) => sum + (entry.monthlyTarget || 0), 0),
    [orderedBudgets],
  );

  const handleCloseDialog = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) { setSelectedCategory(''); setYearlyTarget(''); }
  };

  return (
    <SectionCard radius="lg">
      <SectionCardHeader
        title={`Category Budgets ${BUDGET_YEAR}`}
        action={
          <Button type="button" size="sm" onClick={() => setIsDialogOpen(true)}>
            Add category
          </Button>
        }
      >
        <p className="mt-0.5 text-xs text-muted-foreground">
          Set yearly targets and track spending from Jan to Dec.{' '}
          <span className="font-medium text-foreground">{formatCurrencyRounded(totalBudgetAllocation)} total</span>
        </p>
      </SectionCardHeader>

      <SectionCardContent className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <Skeleton className="h-[220px]" />
        ) : (
          orderedBudgets.map(entry => {
            const spent = yearlyActuals[entry.category] || 0;
            const target = entry.monthlyTarget || 0;
            const progress = target > 0 ? Math.min((spent / target) * 100, 100) : 0;
            const delta = target - spent;
            const monthlyAllocation = target > 0 ? target / 12 : 0;
            const deltaColour = delta >= 0 ? statusColours.gain.text : statusColours.loss.text;

            return (
              <div key={entry.category} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold">{entry.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrencyRounded(spent)} spent in {BUDGET_YEAR}
                    </p>
                  </div>
                  <div className="w-40">
                    <label className="text-sm font-medium text-muted-foreground">Yearly target</label>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={entry.monthlyTarget || ''}
                      onChange={e => updateBudget(entry.category, Number(e.target.value))}
                      className="mt-1"
                      aria-label={`Budget for ${entry.category}`}
                    />
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-md border border-dashed px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Monthly allocation</p>
                    <p className="text-sm font-semibold">{formatCurrencyRounded(monthlyAllocation)}</p>
                  </div>
                  <div className="rounded-md border border-dashed px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Budget used</p>
                    <p className="text-sm font-semibold">{progress.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-md border border-dashed px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Yearly limit</p>
                    <p className="text-sm font-semibold">{formatCurrencyRounded(target)}</p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p className={`text-sm font-medium ${deltaColour}`}>
                    {delta >= 0
                      ? `${formatCurrencyRounded(delta)} under budget`
                      : `${formatCurrencyRounded(Math.abs(delta))} over budget`}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </SectionCardContent>

      <Dialog open={isDialogOpen} onOpenChange={handleCloseDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>Pick an existing category and set a yearly allocation.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category-select">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                disabled={availableCategories.length === 0}
              >
                <SelectTrigger id="category-select">
                  <SelectValue
                    placeholder={availableCategories.length === 0 ? 'All categories already added' : 'Select a category'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="yearly-target">Yearly allocation</Label>
              <Input
                id="yearly-target"
                type="number"
                min="0"
                step="10"
                value={yearlyTarget}
                onChange={e => setYearlyTarget(e.target.value)}
                placeholder="e.g. 2400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              disabled={!selectedCategory}
              onClick={() => {
                const target = yearlyTarget.trim() === '' ? 0 : Number(yearlyTarget);
                addCategory(selectedCategory, Number.isFinite(target) ? target : 0);
                setIsDialogOpen(false);
              }}
            >
              Add to budgets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}
