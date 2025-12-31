import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { TransactionWithAssignments } from '@/features/transactions/types';
import WeekTransactions from './WeekTransactions';

const LINE_COLORS = ['#2563eb', '#f97316', '#22c55e', '#a855f7', '#ef4444', '#14b8a6'];

type WeeklySpendCardProps = {
  weeklyData: Record<string, any>[];
  categories: string[];
  isLoading: boolean;
  getTransactionsForWeek: (index: number) => TransactionWithAssignments[];
};

export default function WeeklySpendCard({
  weeklyData,
  categories,
  isLoading,
  getTransactionsForWeek,
}: WeeklySpendCardProps) {
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (tooltipRef.current && !tooltipRef.current.contains(event.target as Node)) {
        setSelectedWeek(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderBreakdownCTA = () =>
    selectedWeek !== null ? (
      <HoverCard openDelay={0} closeDelay={0}>
        <HoverCardTrigger>
          <button className="rounded-md border px-3 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground">
            See breakdown
          </button>
        </HoverCardTrigger>
        <HoverCardContent className="w-auto p-0" align="end">
          <WeekTransactions
            weekTransactions={getTransactionsForWeek(selectedWeek)}
            week={`Week ${selectedWeek + 1}`}
          />
        </HoverCardContent>
      </HoverCard>
    ) : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Weekly Spend by Category</CardTitle>
        <div>{renderBreakdownCTA()}</div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px]" />
        ) : (
          <>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <XAxis dataKey="week" />
                  <YAxis />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload || !payload.length) return null;
                      const weekIndex = Number(payload[0].payload.week.split(' ')[1]) - 1;
                      setSelectedWeek(weekIndex);
                      return (
                        <div ref={tooltipRef} className="rounded-md border bg-popover p-3 shadow-sm">
                          <p className="text-sm font-medium mb-2">{payload[0].payload.week}</p>
                          <div className="space-y-1">
                            {payload.map(entry => (
                              <div key={entry.name} className="flex items-center justify-between text-sm">
                                <span className="flex items-center gap-2">
                                  <span
                                    className="inline-block h-2 w-2 rounded-full"
                                    style={{ background: entry.color }}
                                  />
                                  {entry.name}
                                </span>
                                <span className="font-mono">${Number(entry.value ?? 0).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Legend />
                  {categories.map((category, index) => (
                    <Line
                      key={category}
                      type="monotone"
                      dataKey={category}
                      stroke={LINE_COLORS[index % LINE_COLORS.length]}
                      strokeWidth={2}
                      dot={false}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
