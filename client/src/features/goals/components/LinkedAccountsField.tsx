import { useMemo, type ElementType } from 'react';
import { Button } from '@/components/ui/button';
import { FormField, FormItem, FormLabel, FormDescription, FormMessage } from '@/components/ui/form';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type { Account } from '@shared/schema';
import type { GoalFormControl } from './GoalForm';

const ACCOUNT_LIST_MAX_HEIGHT = 260;
const ESTIMATED_ACCOUNT_ROW_HEIGHT = 56;

type Props = {
  control: GoalFormControl;
  accounts: Account[] | undefined;
  linkedAccounts: Account[];
  linkedAccountsTotal: number;
  isLoadingAccounts: boolean;
  formatCurrency: (value: string | number) => string;
};

export function LinkedAccountsField({
  control,
  accounts,
  linkedAccounts,
  linkedAccountsTotal,
  isLoadingAccounts,
  formatCurrency,
}: Props) {
  return (
    <FormField
      control={control}
      name="linkedAccountIds"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Linked Accounts (optional)</FormLabel>
          <FormDescription>
            Select one or more accounts to have this goal track their combined balance.
          </FormDescription>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {linkedAccounts.length > 0
                  ? `${linkedAccounts.length} account${linkedAccounts.length === 1 ? '' : 's'} selected`
                  : 'Select accounts'}
                <span className="text-xs text-muted-foreground">
                  {linkedAccounts.length > 0 ? formatCurrency(linkedAccountsTotal) : ''}
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0" align="start">
              <AccountSelectionList
                accounts={accounts}
                selectedIds={field.value || []}
                onToggle={field.onChange}
                isLoadingAccounts={isLoadingAccounts}
                formatCurrency={formatCurrency}
              />
            </PopoverContent>
          </Popover>
          {linkedAccounts.length > 0 && (
            <div className="mt-2 space-y-1 rounded-md border bg-muted/30 p-2 text-xs text-muted-foreground">
              <p className="font-medium text-foreground">Selected accounts</p>
              {linkedAccounts.map(account => (
                <div key={account.id} className="flex items-center justify-between">
                  <span>{account.name}</span>
                  <span className="font-mono">{formatCurrency(account.balance)}</span>
                </div>
              ))}
            </div>
          )}
          <FormDescription>
            When linked, progress and status update based on the selected account balances.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

type AccountSelectionListProps = {
  accounts: Account[] | undefined;
  selectedIds: string[];
  onToggle: (ids: string[]) => void;
  isLoadingAccounts: boolean;
  formatCurrency: (value: string | number) => string;
};

function AccountSelectionList({
  accounts,
  selectedIds,
  onToggle,
  isLoadingAccounts,
  formatCurrency,
}: AccountSelectionListProps) {
  const shouldScroll = useMemo(() => {
    const estimatedHeight = (accounts?.length ?? 0) * ESTIMATED_ACCOUNT_ROW_HEIGHT;
    return estimatedHeight > ACCOUNT_LIST_MAX_HEIGHT;
  }, [accounts]);

  const Wrapper: ElementType = shouldScroll ? ScrollArea : 'div';

  const content = (
    <div className="space-y-2 pr-2">
      {(accounts || []).map(account => {
        const id = String(account.id);
        const isSelected = selectedIds?.includes(id);
        return (
          <button
            type="button"
            key={account.id}
            className={cn(
              'flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors',
              isSelected ? 'border-primary bg-primary/10' : 'hover:bg-muted'
            )}
            onClick={() => {
              const updated = new Set(selectedIds || []);
              if (updated.has(id)) {
                updated.delete(id);
              } else {
                updated.add(id);
              }
              onToggle(Array.from(updated));
            }}
            disabled={isLoadingAccounts}
          >
            <span>{account.name}</span>
            <span className="font-mono text-xs">{formatCurrency(account.balance)}</span>
          </button>
        );
      })}
      {!accounts?.length && (
        <p className="px-3 py-2 text-xs text-muted-foreground">No accounts available to link yet.</p>
      )}
    </div>
  );

  return (
    <Wrapper className={cn('w-full p-2', shouldScroll ? 'h-[260px]' : 'max-h-[260px]')}>
      {content}
    </Wrapper>
  );
}
