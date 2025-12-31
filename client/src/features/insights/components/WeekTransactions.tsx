import { ScrollArea } from '@/components/ui/scroll-area';
import type { TransactionWithAssignments } from '@/features/transactions/types';

type WeekTransactionProps = {
  weekTransactions: TransactionWithAssignments[];
  week: string;
};

export default function WeekTransactions({ weekTransactions, week }: WeekTransactionProps) {
  return (
    <div className="w-[300px]">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold">{week} Transactions</h4>
      </div>
      <ScrollArea className="h-[200px]">
        <div className="space-y-4">
          {weekTransactions.map((transaction, index) => (
            <div
              key={`${transaction.id}-${index}`}
              className="flex items-start space-x-4 rounded-md border p-3 hover:bg-accent transition-colors"
            >
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none">
                  {transaction.description || 'Untitled Transaction'}
                </p>
                <p className="text-sm text-muted-foreground">
                  {new Date(transaction.date).toLocaleDateString()}
                </p>
                <p
                  className={`text-sm font-semibold ${
                    transaction.type === 'income' ? 'text-success' : 'text-destructive'
                  }`}
                >
                  ${Number(transaction.amount).toFixed(2)}
                </p>
                {transaction.category && (
                  <p className="text-xs text-muted-foreground">Category: {transaction.category}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
