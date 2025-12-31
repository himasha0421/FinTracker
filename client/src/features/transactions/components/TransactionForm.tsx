import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { CalendarIcon, Loader2, Trash2, Plus, Minus } from 'lucide-react';
import { useFinance } from '@/lib/context';
import { useQuery } from '@tanstack/react-query';
import type { Account } from '@shared/schema';
import type { TransactionWithAssignments, CreateTransactionPayload } from '@/features/transactions/types';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { accountsListQuery } from '@/features/accounts/api';
import {
  assigneeOptions,
  categoryOptions,
  categoryToIcon,
  iconOptions,
  type AssigneeValue,
  type IconValue,
} from '@/features/transactions/constants';

const iconValues = iconOptions.map(option => option.value) as [IconValue, ...IconValue[]];
const assigneeValues = assigneeOptions.map(option => option.value) as [
  AssigneeValue,
  ...AssigneeValue[],
];

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

// Form schema for transactions
const assignmentSchema = z.object({
  assignee: z.enum(assigneeValues),
  sharePercent: z
    .number({ required_error: 'Share percentage is required' })
    .min(0, 'Share must be at least 0%')
    .max(100, 'Share cannot exceed 100%'),
});

const transactionFormSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  accountId: z.string().refine(val => !isNaN(Number(val)), {
    message: 'Please select an account',
  }),
  category: z.string().optional(),
  type: z.enum(['income', 'expense']),
  icon: z.enum(iconValues),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Please enter a valid date',
  }),
  assignments: z
    .array(assignmentSchema)
    .nonempty('At least one assignee is required')
    .superRefine((assignments, ctx) => {
      const total = assignments.reduce((sum, assignment) => sum + assignment.sharePercent, 0);
      if (Math.abs(total - 100) > 0.01) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Assignment percentages must total 100%',
        });
      }
    }),
});

const transactionTypes = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
];

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

  const form = useForm<z.infer<typeof transactionFormSchema>>({
    resolver: zodResolver(transactionFormSchema),
    values: transaction
      ? {
          description: transaction.description,
          amount: transaction.amount.toString(),
          accountId: transaction.accountId.toString(),
          category: transaction.category || '',
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

  const onSubmit = async (data: z.infer<typeof transactionFormSchema>) => {
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
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Enter description" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full flex justify-between font-normal"
                          >
                            {field.value ? (
                              format(new Date(field.value), 'MMMM do, yyyy')
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-2 h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          defaultMonth={field.value ? new Date(field.value) : undefined}
                          modifiersClassNames={{
                            selected: 'bg-primary text-primary-foreground',
                            today: 'bg-accent text-accent-foreground',
                          }}
                          fromDate={new Date('1900-01-01')}
                          toDate={new Date('2100-01-01')}
                          fixedWeeks
                          onSelect={date => {
                            if (date) {
                              // Use the exact day from the date that was clicked
                              const day = date.getDate();
                              const month = date.getMonth() + 1;
                              const year = date.getFullYear();

                              // Create date string in YYYY-MM-DD format (ISO date format)
                              const formattedDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

                              // Update the form field with our formatted date
                              field.onChange(formattedDate);
                            }
                          }}
                          disabled={date =>
                            date > new Date('2100-01-01') || date < new Date('1900-01-01')
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Transaction Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select transaction type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {transactionTypes.map(type => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="accountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Account</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select account" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account: Account) => (
                        <SelectItem key={account.id} value={account.id.toString()}>
                          {account.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <FormLabel>Split Between</FormLabel>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    append({
                      assignee: 'Hima' as AssigneeValue,
                      sharePercent: Math.max(0, 100 - totalAssigned),
                    })
                  }
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Add Split
                </Button>
              </div>
              <div className="space-y-2">
                {assignmentFields.map((assignmentField, index) => (
                  <div key={assignmentField.id} className="flex items-end gap-3">
                    <FormField
                      control={form.control}
                      name={`assignments.${index}.assignee`}
                      render={({ field }) => (
                        <FormItem className="flex-1">
                          <FormLabel>Assignee</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select assignee" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {assigneeOptions.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name={`assignments.${index}.sharePercent`}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Percent</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={field.value ?? 0}
                              onChange={event =>
                                field.onChange(
                                  event.target.value === '' ? 0 : Number(event.target.value)
                                )
                              }
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    {assignmentFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="mb-1"
                        onClick={() => remove(index)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <div className="text-sm text-muted-foreground">
                  Total assigned: {totalAssigned.toFixed(2)}%
                </div>
                {assignmentsError && (
                  <p className="text-sm text-destructive">{assignmentsError}</p>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={value => {
                        field.onChange(value);
                        const mappedIcon = categoryToIcon[value];
                        if (mappedIcon) {
                          form.setValue('icon', mappedIcon, { shouldDirty: true });
                        }
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categoryOptions.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel>Icon</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select icon" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {iconOptions.map(icon => {
                          const IconComponent = icon.Icon;
                          return (
                            <SelectItem key={icon.value} value={icon.value}>
                              <span className="flex items-center gap-2">
                                <IconComponent className="h-4 w-4 text-muted-foreground" />
                                {icon.label}
                              </span>
                            </SelectItem>
                          );
                        })}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
