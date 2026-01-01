import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { transactionsListQuery } from '@/features/transactions/api';
import { useCategoryBudgets } from '@/features/budgets/hooks/useCategoryBudgets';
import { expenseCategoryOptions } from '@/features/transactions/constants';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

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
    transactions.forEach(transaction => {
      if (transaction.type === 'expense' && transaction.category) {
        categorySet.add(transaction.category);
      }
    });
    return Array.from(categorySet);
  }, [transactions]);

  const { budgets, updateBudget, addCategory, categories } = useCategoryBudgets(expenseCategories);

  const availableCategories = useMemo(() => {
    const existing = new Set(categories.map(category => category.toLowerCase()));
    return expenseCategoryOptions.filter(option => !existing.has(option.value.toLowerCase()));
  }, [categories]);

  const yearlyActuals = useMemo(() => {
    const totals: Record<string, number> = {};
    if (!transactions) return totals;
    const { start, end } = getYearBounds(BUDGET_YEAR);
    transactions.forEach(transaction => {
      if (transaction.type !== 'expense' || !transaction.category) return;
      const date = new Date(transaction.date);
      if (date < start || date > end) return;
      totals[transaction.category] = (totals[transaction.category] || 0) + Number(transaction.amount);
    });
    return totals;
  }, [transactions]);

  const orderedBudgets = useMemo(() => {
    const budgetMap = new Map(budgets.map(entry => [entry.category, entry]));
    return categories.map(category => budgetMap.get(category) || { category, monthlyTarget: 0 });
  }, [budgets, categories]);

  const totalBudgetAllocation = useMemo(
    () => orderedBudgets.reduce((sum, entry) => sum + (entry.monthlyTarget || 0), 0),
    [orderedBudgets]
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <CardTitle>
              Category Budgets {BUDGET_YEAR}{' '}
              <span className="text-sm font-normal text-muted-foreground">
                ({currencyFormatter.format(totalBudgetAllocation)} total)
              </span>
            </CardTitle>
            <CardDescription>Set yearly targets and track spending from Jan to Dec.</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-end">
            <Button type="button" className="md:mt-5" onClick={() => setIsDialogOpen(true)}>
              Add category
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          <Skeleton className="h-[220px]" />
        ) : (
          orderedBudgets.map(entry => {
            const spent = yearlyActuals[entry.category] || 0;
            const target = entry.monthlyTarget || 0;
            const progress = target > 0 ? Math.min((spent / target) * 100, 100) : 0;
            const delta = target - spent;
            const monthlyAllocation = target > 0 ? target / 12 : 0;
            return (
              <div key={entry.category} className="rounded-lg border p-4">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-base font-semibold">{entry.category}</p>
                    <p className="text-sm text-muted-foreground">
                      {currencyFormatter.format(spent)} spent in {BUDGET_YEAR}
                    </p>
                  </div>
                  <div className="w-40">
                    <label className="text-sm font-medium text-muted-foreground">Yearly target</label>
                    <Input
                      type="number"
                      min="0"
                      step="10"
                      value={entry.monthlyTarget || ''}
                      onChange={event => updateBudget(entry.category, Number(event.target.value))}
                      className="mt-1"
                      aria-label={`Budget for ${entry.category}`}
                    />
                  </div>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-md border border-dashed px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Monthly allocation</p>
                    <p className="text-sm font-semibold text-foreground">
                      {currencyFormatter.format(monthlyAllocation)}
                    </p>
                  </div>
                  <div className="rounded-md border border-dashed px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Budget used</p>
                    <p className="text-sm font-semibold text-foreground">{progress.toFixed(1)}%</p>
                  </div>
                  <div className="rounded-md border border-dashed px-3 py-2">
                    <p className="text-xs font-medium text-muted-foreground">Yearly limit</p>
                    <p className="text-sm font-semibold text-foreground">
                      {currencyFormatter.format(target)}
                    </p>
                  </div>
                </div>
                <div className="mt-3 space-y-2">
                  <Progress value={progress} className="h-2" />
                  <p
                    className={`text-sm font-medium ${
                      delta >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}
                  >
                    {delta >= 0
                      ? `${currencyFormatter.format(delta)} under budget`
                      : `${currencyFormatter.format(Math.abs(delta))} over budget`}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
      <Dialog
        open={isDialogOpen}
        onOpenChange={open => {
          setIsDialogOpen(open);
          if (!open) {
            setSelectedCategory('');
            setYearlyTarget('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add category</DialogTitle>
            <DialogDescription>
              Pick an existing category and set a yearly allocation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="category-select">Category</Label>
              <Select
                value={selectedCategory}
                onValueChange={value => setSelectedCategory(value)}
                disabled={availableCategories.length === 0}
              >
                <SelectTrigger id="category-select">
                  <SelectValue
                    placeholder={
                      availableCategories.length === 0
                        ? 'All categories already added'
                        : 'Select a category'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableCategories.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
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
                onChange={event => setYearlyTarget(event.target.value)}
                placeholder="e.g. 2400"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              onClick={() => {
                const target = yearlyTarget.trim() === '' ? 0 : Number(yearlyTarget);
                addCategory(selectedCategory, Number.isFinite(target) ? target : 0);
                setIsDialogOpen(false);
              }}
              disabled={!selectedCategory}
            >
              Add to budgets
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
