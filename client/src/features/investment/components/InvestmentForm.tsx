import { useState } from 'react';
import { useForm } from 'react-hook-form';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Loader2, Trash2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useFinance } from '@/lib/context';
import { accountsListQuery } from '@/features/accounts/api';
import type { InvestmentItem } from '@/features/investment/types';
import { investmentTypes, investmentTypeValues } from '@/features/investment/constants';
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

const investmentFormSchema = z.object({
  name: z.string().min(1, 'Investment name is required'),
  type: z.enum(investmentTypeValues),
  accountId: z.string().optional(),
  symbol: z.string().optional(),
  institution: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
  currentValue: z.string().refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
    message: 'Current value must be a non-negative number',
  }),
  monthlyContribution: z
    .string()
    .refine(val => !isNaN(Number(val)) && Number(val) >= 0, {
      message: 'Monthly contribution must be a non-negative number',
    }),
  notes: z.string().optional(),
});

type InvestmentFormValues = z.infer<typeof investmentFormSchema>;

type InvestmentFormProps = {
  isOpen: boolean;
  onClose: () => void;
  investment: InvestmentItem | null;
};

const getDefaultValues = (investment?: InvestmentItem | null): InvestmentFormValues => ({
  name: investment?.name ?? '',
  type: (investment?.type as InvestmentFormValues['type']) ?? 'etf',
  accountId: investment?.accountId ? investment.accountId.toString() : 'none',
  symbol: investment?.symbol ?? '',
  institution: investment?.institution ?? '',
  currency: investment?.currency ?? 'USD',
  currentValue: (investment?.currentValue ?? '0').toString(),
  monthlyContribution: (investment?.monthlyContribution ?? '0').toString(),
  notes: investment?.notes ?? '',
});

export default function InvestmentForm({ isOpen, onClose, investment }: InvestmentFormProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const { addInvestment, updateInvestment, deleteInvestment, isLoading } = useFinance();
  const { data: accounts = [] } = useQuery(accountsListQuery());

  const form = useForm<InvestmentFormValues>({
    resolver: zodResolver(investmentFormSchema),
    values: getDefaultValues(investment),
  });

  const onSubmit = async (data: InvestmentFormValues) => {
    const normalizeAmount = (value: string) =>
      value.trim() === '' ? '0' : value;
    const accountIdValue =
      data.accountId && data.accountId !== 'none' ? Number(data.accountId) : null;
    const payload = {
      name: data.name,
      type: data.type,
      accountId: accountIdValue,
      symbol: data.symbol?.trim() ? data.symbol.trim() : null,
      institution: data.institution?.trim() ? data.institution.trim() : null,
      currency: data.currency?.trim() ? data.currency.trim().toUpperCase() : 'USD',
      currentValue: normalizeAmount(data.currentValue),
      monthlyContribution: normalizeAmount(data.monthlyContribution),
      notes: data.notes?.trim() ? data.notes.trim() : null,
    };

    if (investment) {
      await updateInvestment(investment.id, payload);
    } else {
      await addInvestment(payload);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (investment) {
      await deleteInvestment(investment.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{investment ? 'Edit Investment' : 'Add Investment'}</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Vanguard S&P 500 ETF" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {investmentTypes.map(type => (
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
                      <FormLabel>Linked Account (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="No linked account" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">No linked account</SelectItem>
                          {accounts.map(account => (
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="symbol"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Symbol (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. VOO" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="institution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Institution (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Vanguard" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="currency"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Currency</FormLabel>
                      <FormControl>
                        <Input placeholder="USD" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="currentValue"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Value</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="monthlyContribution"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Contribution</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Add notes about this investment" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex justify-between">
                {investment && (
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => setIsDeleteDialogOpen(true)}
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
                <div className="flex gap-2">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isLoading}>
                    {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : investment ? (
                      'Update Investment'
                    ) : (
                      'Add Investment'
                    )}
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
            <AlertDialogTitle>Delete investment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{investment?.name}" and its contributions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
