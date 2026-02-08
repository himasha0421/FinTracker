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
import { useFinance } from '@/lib/context';
import type { InvestmentContributionItem, InvestmentItem } from '@/features/investment/types';
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

const contributionTypeValues = ['contribution', 'withdrawal'] as const;

const contributionFormSchema = z.object({
  investmentId: z.string().min(1, 'Investment is required'),
  amount: z.string().refine(val => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Amount must be a positive number',
  }),
  date: z.string().refine(val => !isNaN(Date.parse(val)), {
    message: 'Date is required',
  }),
  type: z.enum(contributionTypeValues),
  notes: z.string().optional(),
});

type ContributionFormValues = z.infer<typeof contributionFormSchema>;

type ContributionFormProps = {
  isOpen: boolean;
  onClose: () => void;
  investments: InvestmentItem[];
  contribution: InvestmentContributionItem | null;
  defaultInvestmentId?: number;
};

const formatDateForInput = (date: string | Date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultValues = (
  contribution: InvestmentContributionItem | null,
  investments: InvestmentItem[],
  defaultInvestmentId?: number
): ContributionFormValues => {
  if (contribution) {
    return {
      investmentId: contribution.investmentId.toString(),
      amount: contribution.amount.toString(),
      date: formatDateForInput(contribution.date),
      type: contribution.type as ContributionFormValues['type'],
      notes: contribution.notes ?? '',
    };
  }

  const fallbackInvestmentId =
    defaultInvestmentId?.toString() ?? investments[0]?.id.toString() ?? '';

  return {
    investmentId: fallbackInvestmentId,
    amount: '0',
    date: formatDateForInput(new Date()),
    type: 'contribution',
    notes: '',
  };
};

export default function ContributionForm({
  isOpen,
  onClose,
  investments,
  contribution,
  defaultInvestmentId,
}: ContributionFormProps) {
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const {
    addInvestmentContribution,
    updateInvestmentContribution,
    deleteInvestmentContribution,
    isLoading,
  } = useFinance();

  const form = useForm<ContributionFormValues>({
    resolver: zodResolver(contributionFormSchema),
    values: getDefaultValues(contribution, investments, defaultInvestmentId),
  });

  const onSubmit = async (data: ContributionFormValues) => {
    const payload = {
      investmentId: Number(data.investmentId),
      amount: data.amount.toString(),
      date: data.date,
      type: data.type,
      notes: data.notes?.trim() ? data.notes.trim() : null,
    };

    if (contribution) {
      await updateInvestmentContribution(contribution.id, payload);
    } else {
      await addInvestmentContribution(payload);
    }
    onClose();
  };

  const handleDelete = async () => {
    if (contribution) {
      await deleteInvestmentContribution(contribution.id);
      setIsDeleteDialogOpen(false);
      onClose();
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {contribution ? 'Edit Contribution' : 'Add Contribution'}
            </DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="investmentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Investment</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select investment" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {investments.map(investment => (
                          <SelectItem key={investment.id} value={investment.id.toString()}>
                            {investment.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
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
                    <FormItem>
                      <FormLabel>Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

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
                          <SelectItem value="contribution">Contribution</SelectItem>
                          <SelectItem value="withdrawal">Withdrawal</SelectItem>
                        </SelectContent>
                      </Select>
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
                      <Textarea placeholder="Add notes about this contribution" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="flex justify-between">
                {contribution && (
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
                    ) : contribution ? (
                      'Update Contribution'
                    ) : (
                      'Add Contribution'
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
            <AlertDialogTitle>Delete contribution?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this contribution.
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
