import { useMemo } from 'react';
import { Wallet } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { HeroCard } from '@/components/composed/HeroCard';
import { GlassTile } from '@/components/composed/GlassTile';
import { labelBadge } from '@/design/variants';
import { useFinance } from '@/lib/context';
import { transactionsListQuery } from '@/features/transactions/api';
import { formatCurrency, formatCurrencyCompact } from '@/lib/formatters';

export default function BalanceSummary() {
  const { totalBalance } = useFinance();

  const { data: transactions = [] } = useQuery({
    ...transactionsListQuery(),
    staleTime: 30_000,
  });

  const { mtdIncome, mtdExpenses } = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    let income = 0;
    let expenses = 0;
    transactions.forEach(tx => {
      const d = new Date(tx.date);
      if (d < monthStart) return;
      if (tx.type === 'income') income += Number(tx.amount);
      else if (tx.type === 'expense') expenses += Number(tx.amount);
    });
    return { mtdIncome: income, mtdExpenses: expenses };
  }, [transactions]);

  return (
    <HeroCard accent="blue" className="mb-6">
      <div className="grid gap-8 xl:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <div className={labelBadge({ tone: 'light' })}>
            <Wallet className="h-3.5 w-3.5" />
            Net Worth
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Total balance</p>
            <h1 className="mt-2 font-mono text-4xl font-semibold tracking-tight sm:text-5xl">
              {formatCurrency(totalBalance)}
            </h1>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-3 xl:flex-col xl:justify-end">
          <GlassTile className="min-w-[140px]">
            <p className="text-xs text-slate-400">MTD Income</p>
            <p className="mt-2 font-mono text-lg font-semibold text-emerald-400">
              +{formatCurrencyCompact(mtdIncome)}
            </p>
          </GlassTile>
          <GlassTile className="min-w-[140px]">
            <p className="text-xs text-slate-400">MTD Spend</p>
            <p className="mt-2 font-mono text-lg font-semibold text-rose-400">
              -{formatCurrencyCompact(mtdExpenses)}
            </p>
          </GlassTile>
        </div>
      </div>
    </HeroCard>
  );
}
