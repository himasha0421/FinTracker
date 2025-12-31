import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

type SummaryData = {
  income: number;
  expense: number;
  savings: number;
};

type SummaryCardProps = {
  data: SummaryData;
  isLoading: boolean;
};

export default function SummaryCard({ data, isLoading }: SummaryCardProps) {
  const chartData = [
    { name: 'Selected Range', income: data.income, expense: data.expense, savings: data.savings },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Summary</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-[220px]" />
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip
                  cursor={false}
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '0.5rem',
                  }}
                  wrapperStyle={{ outline: 'none' }}
                />
                <Legend />
                <Bar dataKey="income" fill="#22c55e" name="Income" />
                <Bar dataKey="expense" fill="#ef4444" name="Expenses" />
                <Bar dataKey="savings" fill="#3b82f6" name="Savings" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
