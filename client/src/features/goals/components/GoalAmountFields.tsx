import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import type { GoalFormControl } from './GoalForm';
import type { Account } from '@shared/schema';

type Props = {
  control: GoalFormControl;
  linkedAccounts: Account[];
  linkedAccountsTotal: number;
  formatCurrency: (value: string | number) => string;
};

export function GoalAmountFields({
  control,
  linkedAccounts,
  linkedAccountsTotal,
  formatCurrency,
}: Props) {
  return (
    <div className="flex gap-4">
      <FormField
        control={control}
        name="targetAmount"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Target Amount</FormLabel>
            <FormControl>
              <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="currentAmount"
        render={({ field }) => (
          <FormItem className="flex-1">
            <FormLabel>Current Amount</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                {...field}
                disabled={linkedAccounts.length > 0 || field.disabled}
              />
            </FormControl>
            {linkedAccounts.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Tracking {linkedAccounts.length} linked account
                {linkedAccounts.length === 1 ? '' : 's'} totaling {formatCurrency(linkedAccountsTotal)} automatically.
              </p>
            )}
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
