import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { GoalResponse } from '@/features/goals/api';
import { accountsListQuery } from '@/features/accounts/api';
import { BasicGoalDetails } from './BasicGoalDetails';
import { GoalAmountFields } from './GoalAmountFields';
import { LinkedAccountsField } from './LinkedAccountsField';
import { TargetDateField } from './TargetDateField';
import { StatusField } from './StatusField';
import { IconColorFields } from './IconColorFields';

// Form schema for financial goals
// Define types for goal status, icon, and color
const statusOptions = ['in-progress', 'completed', 'pending'] as const;
const iconOptions = ['shield', 'trending-up', 'credit-card'] as const;
const colorOptions = ['blue', 'green', 'yellow', 'purple', 'red'] as const;

const goalFormSchema = z.object({
  name: z.string().min(1, 'Goal name is required'),
  description: z.string(), // Changed to just string to avoid null in form
  targetAmount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Target amount must be a positive number',
  }),
  currentAmount: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Current amount must be a non-negative number',
  }),
  targetDate: z
    .string()
    .refine(val => !isNaN(Date.parse(val)), { message: 'Target date must be a valid date' }),
  status: z.enum(statusOptions),
  icon: z.enum(iconOptions),
  color: z.enum(colorOptions),
  linkedAccountIds: z.array(z.string()).default([]),
});

export type GoalStatus = (typeof statusOptions)[number];
export type GoalIcon = (typeof iconOptions)[number];
export type GoalColor = (typeof colorOptions)[number];
export type GoalFormValues = z.infer<typeof goalFormSchema>;
export type GoalFormControl = Control<GoalFormValues>;

type GoalFormProps = {
  isOpen: boolean;
  onClose: () => void;
  goal: GoalResponse | null;
};

export default function GoalForm({ isOpen, onClose, goal }: GoalFormProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { addFinancialGoal, updateFinancialGoal, deleteFinancialGoal, isLoading } = useFinance();

  // Format date for form default value
  const formatDateForInput = (date: string | Date) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  // Calculate future date for default target (6 months from now)
  const getFutureDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return formatDateForInput(date);
  };

  const form = useForm<z.infer<typeof goalFormSchema>>({
    resolver: zodResolver(goalFormSchema),
    defaultValues: {
      name: goal?.name || '',
      description: goal?.description || '', // If description is null, use empty string
      targetAmount: goal?.targetAmount ? goal.targetAmount.toString() : '',
      currentAmount: goal?.currentAmount ? goal.currentAmount.toString() : '0',
      targetDate: goal ? formatDateForInput(goal.targetDate) : getFutureDate(),
      status: statusOptions.includes(goal?.status as GoalStatus)
        ? (goal?.status as GoalStatus)
        : 'in-progress',
      icon: iconOptions.includes(goal?.icon as GoalIcon) ? (goal?.icon as GoalIcon) : 'shield',
      color: colorOptions.includes(goal?.color as GoalColor) ? (goal?.color as GoalColor) : 'blue',
      linkedAccountIds: goal?.linkedAccounts
        ? goal.linkedAccounts.map(account => account.id.toString())
        : [],
    },
  });

  const { data: accounts, isLoading: isLoadingAccounts } = useQuery(accountsListQuery());
  const linkedAccountIds = form.watch('linkedAccountIds') || [];
  const linkedAccounts =
    accounts?.filter(account => linkedAccountIds.includes(String(account.id))) ?? [];
  const linkedAccountsTotal = linkedAccounts.reduce(
    (sum, account) => sum + Number(account.balance),
    0
  );

  const formatCurrency = (value: string | number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));

  // Reset form when goal changes
  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: goal?.name || '',
        description: goal?.description || '',
        targetAmount: goal?.targetAmount ? goal.targetAmount.toString() : '',
        currentAmount: goal?.currentAmount ? goal.currentAmount.toString() : '0',
        targetDate: goal ? formatDateForInput(goal.targetDate) : getFutureDate(),
        status: statusOptions.includes(goal?.status as GoalStatus)
          ? (goal?.status as GoalStatus)
          : 'in-progress',
        icon: iconOptions.includes(goal?.icon as GoalIcon) ? (goal?.icon as GoalIcon) : 'shield',
        color: colorOptions.includes(goal?.color as GoalColor) ? (goal?.color as GoalColor) : 'blue',
        linkedAccountIds: goal?.linkedAccounts
          ? goal.linkedAccounts.map(account => account.id.toString())
          : [],
      });
    }
  }, [form, goal, isOpen]);

  useEffect(() => {
    if (linkedAccounts.length > 0) {
      form.setValue('currentAmount', linkedAccountsTotal.toFixed(2));
    }
  }, [linkedAccounts, linkedAccountsTotal, form]);

  const onSubmit = async (data: z.infer<typeof goalFormSchema>) => {
    // Convert empty string description to null to match the schema
    const numericLinkedAccountIds = (data.linkedAccountIds || [])
      .map(id => Number(id))
      .filter(id => !Number.isNaN(id));

    const formattedData = {
      ...data,
      currentAmount:
        linkedAccounts.length > 0 ? linkedAccountsTotal.toFixed(2) : data.currentAmount,
      targetDate: new Date(data.targetDate),
      description: data.description || null,
      linkedAccountIds: numericLinkedAccountIds,
    };

    if (goal) {
      await updateFinancialGoal(goal.id, formattedData);
    } else {
      await addFinancialGoal(formattedData);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (goal) {
      await deleteFinancialGoal(goal.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{goal ? 'Edit Financial Goal' : 'Add New Financial Goal'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <BasicGoalDetails control={form.control} />

              <GoalAmountFields
                control={form.control}
                linkedAccounts={linkedAccounts}
                linkedAccountsTotal={linkedAccountsTotal}
                formatCurrency={formatCurrency}
              />

              <LinkedAccountsField
                control={form.control}
                accounts={accounts}
                linkedAccounts={linkedAccounts}
                linkedAccountsTotal={linkedAccountsTotal}
                isLoadingAccounts={isLoadingAccounts}
                formatCurrency={formatCurrency}
              />

              <TargetDateField control={form.control} />

              <StatusField control={form.control} />

              <IconColorFields control={form.control} />

              <DialogFooter className="gap-2 sm:gap-0">
                {goal && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
                    disabled={isLoading}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                )}

                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {goal ? 'Update' : 'Create'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the financial goal "{goal?.name}". This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground"
            >
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
