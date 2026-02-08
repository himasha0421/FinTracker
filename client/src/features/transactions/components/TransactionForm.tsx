import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Form } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { useFinance } from '@/lib/context';
import { useQuery } from '@tanstack/react-query';
import type { TransactionWithAssignments, CreateTransactionPayload } from '@/features/transactions/types';
import { accountsListQuery } from '@/features/accounts/api';
import {
  categoryToIcon,
  type AssigneeValue,
  type IconValue,
} from '@/features/transactions/constants';
import TransactionFormAssignmentsFields from '@/features/transactions/components/TransactionFormAssignmentsFields';
import TransactionFormCategoryIconFields from '@/features/transactions/components/TransactionFormCategoryIconFields';
import TransactionFormDetailsFields from '@/features/transactions/components/TransactionFormDetailsFields';
import TransactionFormMetaFields from '@/features/transactions/components/TransactionFormMetaFields';
import {
  iconValues,
  transactionFormSchema,
  type TransactionFormValues,
} from '@/features/transactions/components/transactionFormSchema';

const resolveInitialIcon = (transaction: TransactionWithAssignments | null | undefined): IconValue => {
  if (!transaction) return 'shopping-bag';

  const mapped = transaction.category ? categoryToIcon[transaction.category] : undefined;
  const existing = iconValues.includes(transaction.icon as IconValue)
    ? (transaction.icon as IconValue)
    : undefined;

  // Honor a non-default saved icon, otherwise prefer category mapping.
  if (existing && existing !== 'shopping-bag') return existing;
  if (mapped) return mapped;
  return existing || 'shopping-bag';
};

type TransactionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  transaction?: TransactionWithAssignments | null;
};

export default function TransactionForm({
  isOpen,
  onClose,
  transaction = null,
}: TransactionFormProps) {
  const { addTransaction, updateTransaction, deleteTransaction, isLoading } = useFinance();

  // Fetch accounts for the account selection
  const { data: accounts = [] } = useQuery(accountsListQuery());

  // Format date for form default value with CST timezone adjustment
  const formatDateForInput = (date: string | Date) => {
    // Create a new Date object
    const d = typeof date === 'string' ? new Date(date) : date;

    // Get date parts in CST timezone by creating a date with explicit parts
    // This ensures we're working with the actual date the user wants
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');

    // Return a date string in YYYY-MM-DD format
    return `${year}-${month}-${day}`;
  };

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    values: transaction
      ? {
          description: transaction.description,
          amount: transaction.amount.toString(),
          accountId: transaction.accountId.toString(),
          category: transaction.category || '',
          subcategory: transaction.subcategory || 'None',
          type: transaction.type as 'income' | 'expense',
          icon: resolveInitialIcon(transaction),
          date: formatDateForInput(transaction.date),
          assignments:
            transaction.assignments && transaction.assignments.length > 0
              ? transaction.assignments.map(assignment => ({
                  assignee: (assignment.assignee as AssigneeValue) || 'Hima',
                  sharePercent: Number(assignment.sharePercent),
                }))
              : [
                  {
                    assignee: 'Hima' as AssigneeValue,
                    sharePercent: 100,
                  },
                ],
        }
      : {
          description: '',
          amount: '0',
          type: 'expense' as const,
          date: formatDateForInput(new Date()),
          icon: 'shopping-bag' as IconValue,
          category: '',
          subcategory: 'None',
          accountId: accounts.length > 0 ? accounts[0].id.toString() : '',
          assignments: [
            {
              assignee: 'Hima' as AssigneeValue,
              sharePercent: 100,
            },
          ],
        },
  });
  const { fields: assignmentFields, append, remove } = useFieldArray({
    control: form.control,
    name: 'assignments',
  });

  const assignmentValues = form.watch('assignments') ?? [];
  const totalAssigned = assignmentValues.reduce(
    (sum, assignment) => sum + (Number(assignment.sharePercent) || 0),
    0
  );
  const assignmentsError =
    !Array.isArray(form.formState.errors.assignments) && form.formState.errors.assignments
      ? form.formState.errors.assignments.message
      : undefined;

  const handleAddSplit = () =>
    append({
      assignee: 'Hima' as AssigneeValue,
      sharePercent: Math.max(0, 100 - totalAssigned),
    });

  const onSubmit = async (data: TransactionFormValues) => {
    // Make sure the date string is in YYYY-MM-DD format for consistent server-side parsing
    const dateStr = data.date
      ? formatDateForInput(new Date(data.date))
      : formatDateForInput(new Date());

    // Prepare the data with proper type handling
    const formattedData: CreateTransactionPayload = {
      description: data.description,
      amount: data.amount.toString(),
      accountId: Number(data.accountId),
      date: dateStr, // Ensure consistent YYYY-MM-DD format for server-side parsing
      category: data.category || undefined,
      subcategory: data.subcategory && data.subcategory !== 'None' ? data.subcategory : null,
      type: data.type,
      icon: (data.category && categoryToIcon[data.category]) || data.icon || 'shopping-bag',
      assignments: data.assignments.map(assignment => ({
        assignee: assignment.assignee,
        sharePercent: assignment.sharePercent.toString(),
      })),
    };

    try {
      if (transaction) {
        await updateTransaction(transaction.id, formattedData);
      } else {
        await addTransaction(formattedData);
      }
      onClose();
    } catch (error) {
      console.error('Error submitting transaction:', error);
    }
  };

  const handleDelete = async () => {
    if (transaction) {
      try {
        await deleteTransaction(transaction.id);
        onClose();
      } catch (error) {
        console.error('Error deleting transaction:', error);
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? 'Edit Transaction' : 'Add New Transaction'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <TransactionFormDetailsFields form={form} />

            <TransactionFormMetaFields form={form} accounts={accounts} />

            <TransactionFormAssignmentsFields
              form={form}
              assignmentFields={assignmentFields}
              onAddSplit={handleAddSplit}
              onRemove={remove}
              totalAssigned={totalAssigned}
              assignmentsError={assignmentsError}
            />

            <TransactionFormCategoryIconFields form={form} />

            <DialogFooter className="flex justify-between">
              <div className="flex gap-2 items-center">
                {transaction && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={handleDelete}
                    disabled={isLoading}
                    className="mr-auto"
                  >
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2 items-center">
                <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {transaction ? 'Update' : 'Create'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
